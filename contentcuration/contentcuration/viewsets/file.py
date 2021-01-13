import codecs

from django.core.exceptions import PermissionDenied
from django.http import HttpResponseBadRequest
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import list_route
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from contentcuration.models import AssessmentItem
from contentcuration.models import ContentNode
from contentcuration.models import File
from contentcuration.models import generate_object_storage_name
from contentcuration.models import generate_storage_url
from contentcuration.utils.storage_common import get_presigned_upload_url
from contentcuration.utils.user import calculate_user_storage
from contentcuration.viewsets.base import BulkDeleteMixin
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import BulkUpdateMixin
from contentcuration.viewsets.base import ReadOnlyValuesViewset
from contentcuration.viewsets.base import RequiredFilterSet
from contentcuration.viewsets.common import UserFilteredPrimaryKeyRelatedField
from contentcuration.viewsets.common import UUIDInFilter


class FileFilter(RequiredFilterSet):
    id__in = UUIDInFilter(name="id")
    contentnode__in = UUIDInFilter(name="contentnode")
    assessment_item__in = UUIDInFilter(name="assessment_item")

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
        results = super(FileSerializer, self).update(instance, validated_data)
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
        )
        list_serializer_class = BulkListSerializer


def retrieve_storage_url(item):
    """ Get the file_on_disk url """
    return generate_storage_url("{}.{}".format(item["checksum"], item["file_format"]))


class FileViewSet(BulkDeleteMixin, BulkUpdateMixin, ReadOnlyValuesViewset):
    queryset = File.objects.all()
    serializer_class = FileSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = (DjangoFilterBackend,)
    filter_class = FileFilter
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
    )

    field_map = {
        "url": retrieve_storage_url,
        "preset": "preset_id",
        "language": "language_id",
        "contentnode": "contentnode_id",
        "assessment_item": "assessment_item_id",
    }

    @list_route(methods=["post"])
    def upload_url(self, request):
        try:
            size = request.data["size"]
            checksum = request.data["checksum"]
            filename = request.data["name"]
            file_format = request.data["file_format"]
            preset = request.data["preset"]
        except KeyError:
            raise HttpResponseBadRequest(
                reason="Must specify: size, checksum, name, file_format, and preset"
            )

        try:
            request.user.check_space(float(size), checksum)

        except PermissionDenied as e:
            return HttpResponseBadRequest(reason=str(e), status=418)

        might_skip = File.objects.filter(checksum=checksum).exists()

        filepath = generate_object_storage_name(checksum, filename)
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
        )

        # Avoid using our file_on_disk attribute for checks
        file.save(set_by_file_on_disk=False)

        retval.update(
            {"might_skip": might_skip, "file": self.serialize_object(id=file.id)}
        )

        return Response(retval)
