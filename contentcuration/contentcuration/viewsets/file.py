import codecs
import math

from django.core.exceptions import PermissionDenied
from django.http import HttpResponseBadRequest
from le_utils.constants import file_formats
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from contentcuration.models import AssessmentItem
from contentcuration.models import Change
from contentcuration.models import ContentNode
from contentcuration.models import File
from contentcuration.models import generate_object_storage_name
from contentcuration.models import generate_storage_url
from contentcuration.utils.cache import ResourceSizeCache
from contentcuration.utils.sentry import report_exception
from contentcuration.utils.storage_common import get_presigned_upload_url
from contentcuration.utils.user import calculate_user_storage
from contentcuration.viewsets.base import BulkDeleteMixin
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import ReadOnlyValuesViewset
from contentcuration.viewsets.base import RequiredFilterSet
from contentcuration.viewsets.base import UpdateModelMixin
from contentcuration.viewsets.common import UserFilteredPrimaryKeyRelatedField
from contentcuration.viewsets.common import UUIDInFilter
from contentcuration.viewsets.sync.constants import CONTENTNODE
from contentcuration.viewsets.sync.utils import generate_update_event


class FileFilter(RequiredFilterSet):
    id__in = UUIDInFilter(field_name="id")
    contentnode__in = UUIDInFilter(field_name="contentnode")
    assessment_item__in = UUIDInFilter(field_name="assessment_item")

    class Meta:
        model = File
        fields = (
            "id__in",
            "contentnode__in",
            "assessment_item__in",
            "id",
            "contentnode",
            "assessment_item",
        )


class FileSerializer(BulkModelSerializer):
    contentnode = UserFilteredPrimaryKeyRelatedField(
        queryset=ContentNode.objects.all(), required=False
    )
    assessment_item = UserFilteredPrimaryKeyRelatedField(
        queryset=AssessmentItem.objects.all(), required=False
    )

    def update(self, instance, validated_data):
        update_node = None
        if "contentnode" in validated_data:
            # if we're updating the file's related node, we'll trigger a reset for the
            # old channel's cache modified date
            update_node = validated_data.get("contentnode", None)
            if not update_node or update_node.id != instance.contentnode_id:
                ResourceSizeCache.reset_modified_for_file(instance)

        results = super(FileSerializer, self).update(instance, validated_data)
        results.on_update()  # Make sure contentnode.content_id is unique

        if results.contentnode:
            results.contentnode.refresh_from_db()
            if not len(results.contentnode.mark_complete()):
                results.contentnode.save()
                Change.create_change(
                    generate_update_event(
                        results.contentnode.id,
                        CONTENTNODE,
                        {"complete": True},
                        channel_id=results.contentnode.get_channel_id(),
                    ),
                    created_by_id=instance.uploaded_by_id,
                    applied=True,
                )

        if instance.uploaded_by_id:
            calculate_user_storage(instance.uploaded_by_id)

        return results

    class Meta:
        model = File
        fields = (
            "id",
            "language",
            "contentnode",
            "assessment_item",
            "preset",
            "duration",
        )
        list_serializer_class = BulkListSerializer


def retrieve_storage_url(item):
    """Get the file_on_disk url"""
    return generate_storage_url("{}.{}".format(item["checksum"], item["file_format"]))


class FileViewSet(BulkDeleteMixin, UpdateModelMixin, ReadOnlyValuesViewset):
    queryset = File.objects.all()
    serializer_class = FileSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = FileFilter
    values = (
        "id",
        "checksum",
        "file_size",
        "language",
        "file_format",
        "contentnode_id",
        "assessment_item_id",
        "file_on_disk",
        "preset_id",
        "language_id",
        "original_filename",
        "uploaded_by",
        "duration",
    )

    field_map = {
        "url": retrieve_storage_url,
        "preset": "preset_id",
        "language": "language_id",
        "contentnode": "contentnode_id",
        "assessment_item": "assessment_item_id",
    }

    def delete_from_changes(self, changes):
        try:
            # Reset channel resource size cache.
            keys = [change["key"] for change in changes]
            files_qs = self.filter_queryset_from_keys(
                self.get_edit_queryset(), keys
            ).order_by()
            # Find all root nodes for files, and reset the cache modified date.
            root_nodes = ContentNode.objects.filter(
                parent__isnull=True,
                tree_id__in=files_qs.values_list(
                    "contentnode__tree_id", flat=True
                ).distinct(),
            )
            for root_node in root_nodes:
                ResourceSizeCache(root_node).reset_modified(None)

            # Update file's contentnode content_id.
            for file in files_qs:
                file.update_contentnode_content_id()

        except Exception as e:
            report_exception(e)

        return super(FileViewSet, self).delete_from_changes(changes)

    @action(detail=False, methods=["post"])
    def upload_url(self, request):
        try:
            size = request.data["size"]
            checksum = request.data["checksum"]
            filename = request.data["name"]
            file_format = request.data["file_format"]
            preset = request.data["preset"]
        except KeyError:
            return HttpResponseBadRequest(
                reason="Must specify: size, checksum, name, file_format, and preset"
            )

        duration = request.data.get("duration")
        if duration is not None:
            if not isinstance(duration, (int, float)):
                return HttpResponseBadRequest(reason="File duration must be a number")
            duration = math.floor(duration)
            if duration <= 0:
                return HttpResponseBadRequest(
                    reason="File duration is equal to or less than 0"
                )

        try:
            request.user.check_space(float(size), checksum)
        except PermissionDenied:
            return HttpResponseBadRequest(
                reason="Not enough space. Check your storage under Settings page.",
                status=412,
            )

        might_skip = File.objects.filter(checksum=checksum).exists()

        filepath = generate_object_storage_name(
            checksum, filename, default_ext=file_format
        )
        checksum_base64 = codecs.encode(
            codecs.decode(checksum, "hex"), "base64"
        ).decode()
        retval = get_presigned_upload_url(
            filepath, checksum_base64, 600, content_length=size
        )

        if file_format not in dict(file_formats.choices):
            return HttpResponseBadRequest("Invalid file_format!")

        file = File(
            file_size=size,
            checksum=checksum,
            original_filename=filename,
            file_on_disk=filepath,
            file_format_id=file_format,
            preset_id=preset,
            uploaded_by=request.user,
            duration=duration,
        )

        # Avoid using our file_on_disk attribute for checks
        file.save(set_by_file_on_disk=False)

        retval.update(
            {"might_skip": might_skip, "file": self.serialize_object(id=file.id)}
        )

        return Response(retval)
