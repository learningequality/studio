import codecs
import math

from django.core.exceptions import PermissionDenied
from django.http import HttpResponseBadRequest
from le_utils.constants import file_formats
from le_utils.constants import format_presets
from rest_framework import serializers
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


class StrictFloatField(serializers.FloatField):
    def to_internal_value(self, data):
        # If data is a string, reject it even if it represents a number.
        if isinstance(data, str):
            raise serializers.ValidationError("A valid number is required.")
        return super().to_internal_value(data)


# New Serializer for validating upload_url inputs
class FileUploadURLSerializer(serializers.Serializer):
    """
    Serializer to validate inputs for the upload_url endpoint.
    Required:
      - size: a float value
      - checksum: a 32-digit hex string
      - name: a string (note: mapped from request.data['name'])
      - file_format: a valid file format choice from file_formats.choices
      - preset: a valid preset choice from format_presets.choices
    Optional:
      - duration: a number that will be floored to an integer and must be > 0
    """
    size = serializers.FloatField(required=True)
    checksum = serializers.RegexField(regex=r'^[0-9a-f]{32}$', required=True)
    name = serializers.CharField(required=True)
    file_format = serializers.ChoiceField(choices=file_formats.choices, required=True)
    preset = serializers.ChoiceField(choices=format_presets.choices, required=True)
    duration = StrictFloatField(required=False, allow_null=True)

    def validate_duration(self, value):
        if value is None:
            return None
        floored = math.floor(value)
        if floored <= 0:
            raise serializers.ValidationError("File duration is equal to or less than 0")
        return floored

    def validate(self, attrs):
        if attrs["file_format"] in {file_formats.MP4, file_formats.WEBM, file_formats.MP3}:
            if "duration" not in attrs or attrs["duration"] is None:
                raise serializers.ValidationError("Duration is required for audio/video files")
        return attrs


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
        # Validate input using the new serializer
        serializer = FileUploadURLSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        validated_data = serializer.validated_data
        size = validated_data["size"]
        checksum = validated_data["checksum"]
        filename = validated_data["name"]
        file_format = validated_data["file_format"]
        preset = validated_data["preset"]
        duration = validated_data.get("duration")

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
