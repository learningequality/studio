from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated
from rest_framework.serializers import PrimaryKeyRelatedField

from contentcuration.models import AssessmentItem
from contentcuration.models import ContentNode
from contentcuration.models import File
from contentcuration.models import generate_storage_url
from contentcuration.models import User
from contentcuration.viewsets.base import BulkCreateMixin
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import BulkUpdateMixin
from contentcuration.viewsets.base import RequiredFilterSet
from contentcuration.viewsets.base import ValuesViewset
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
    uploaded_by = PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = File
        fields = (
            "id",
            "checksum",
            "file_size",
            "language",
            "contentnode",
            "assessment_item",
            "file_format",
            "preset",
            "original_filename",
            "uploaded_by",
        )
        list_serializer_class = BulkListSerializer


def retrieve_storage_url(item):
    """ Get the file_on_disk url """
    return generate_storage_url("{}.{}".format(item["checksum"], item["file_format"]))


# Apply mixin first to override ValuesViewset
class FileViewSet(BulkCreateMixin, BulkUpdateMixin, ValuesViewset):
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
