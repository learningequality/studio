from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated
from rest_framework.serializers import PrimaryKeyRelatedField
from rest_framework.serializers import ValidationError

from contentcuration.models import AssessmentItem
from contentcuration.models import ContentNode
from contentcuration.models import File
from contentcuration.models import generate_storage_url
from contentcuration.models import User
from contentcuration.utils.files import duplicate_file
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.base import RequiredFilterSet
from contentcuration.viewsets.common import UUIDInFilter
from contentcuration.viewsets.sync.constants import CREATED
from contentcuration.viewsets.sync.constants import DELETED
from contentcuration.viewsets.sync.constants import FILE


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
    contentnode = PrimaryKeyRelatedField(queryset=ContentNode.objects.all())
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


class FileViewSet(ValuesViewset):
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

    def copy(self, pk, user=None, from_key=None, **mods):
        delete_response = [dict(key=pk, table=FILE, type=DELETED,)]

        try:
            file = File.objects.get(pk=from_key)
        except File.DoesNotExist:
            error = ValidationError("Copy file source does not exist")
            return str(error), delete_response

        if File.objects.filter(pk=pk).exists():
            error = ValidationError("Copy pk already exists")
            # if the PK already exists, this is not a scenario we can negotiate easily
            # between client and server
            return str(error), None

        contentnode_id = mods.get("contentnode", None)
        assessment_id = mods.get("assessment_item", None)
        preset_id = mods.get("preset", None)

        try:
            contentnode = None
            if contentnode_id is not None:
                contentnode = ContentNode.objects.get(pk=contentnode_id)
        except ContentNode.DoesNotExist as e:
            return str(ValidationError(e)), delete_response

        try:
            assessment_item = None
            if assessment_id is not None:
                assessment_item = AssessmentItem.objects.get(
                    assessment_id=assessment_id
                )
        except AssessmentItem.DoesNotExist as e:
            return str(ValidationError(e)), delete_response

        with transaction.atomic():
            file_copy = duplicate_file(
                file,
                save=False,
                node=contentnode,
                assessment_item=assessment_item,
                preset_id=preset_id,
            )
            file_copy.pk = pk
            file_copy.save()

        return (
            None,
            dict(
                key=pk,
                table=FILE,
                type=CREATED,
                obj=FileSerializer(instance=file_copy).data,
            ),
        )
