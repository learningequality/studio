from django.db import transaction
from django.db.models import Exists
from django.db.models import OuterRef
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.permissions import IsAuthenticated
from rest_framework.serializers import PrimaryKeyRelatedField
from rest_framework.serializers import ValidationError

from contentcuration.models import AssessmentItem
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import File
from contentcuration.models import generate_storage_url
from contentcuration.models import User
from contentcuration.utils.files import duplicate_file
from contentcuration.viewsets.base import BulkCreateMixin
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import BulkUpdateMixin
from contentcuration.viewsets.base import CopyMixin
from contentcuration.viewsets.base import RequiredFilterSet
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.common import UserFilteredPrimaryKeyRelatedField
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
    contentnode = UserFilteredPrimaryKeyRelatedField(queryset=ContentNode.objects.all())
    assessment_item = UserFilteredPrimaryKeyRelatedField(
        queryset=AssessmentItem.objects.all()
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


channel_trees = (
    "main_tree",
    "chef_tree",
    "trash_tree",
    "staging_tree",
    "previous_tree",
)

edit_filter = Q()
for tree_name in channel_trees:
    edit_filter |= Q(
        **{
            "editable_channels__{}__tree_id".format(tree_name): OuterRef(
                "contentnode__tree_id"
            )
        }
    )
    edit_filter |= Q(
        **{
            "editable_channels__{}__tree_id".format(tree_name): OuterRef(
                "assessment_item__contentnode__tree_id"
            )
        }
    )

view_filter = Q()
for tree_name in channel_trees:
    view_filter |= Q(
        **{
            "view_only_channels__{}__tree_id".format(tree_name): OuterRef(
                "contentnode__tree_id"
            )
        }
    )
    view_filter |= Q(
        **{
            "view_only_channels__{}__tree_id".format(tree_name): OuterRef(
                "assessment_item__contentnode__tree_id"
            )
        }
    )


# Apply mixin first to override ValuesViewset
class FileViewSet(BulkCreateMixin, BulkUpdateMixin, CopyMixin, ValuesViewset):
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

    def get_queryset(self):
        user_id = not self.request.user.is_anonymous() and self.request.user.id
        user_queryset = User.objects.filter(id=user_id)

        queryset = File.objects.annotate(
            edit=Exists(user_queryset.filter(edit_filter)),
            view=Exists(user_queryset.filter(view_filter)),
            public=Exists(
                Channel.objects.filter(
                    public=True, main_tree__tree_id=OuterRef("contentnode__tree_id")
                )
            ),
        )
        queryset = queryset.filter(Q(view=True) | Q(edit=True) | Q(public=True))

        return queryset

    def get_edit_queryset(self):
        user_id = not self.request.user.is_anonymous() and self.request.user.id
        user_queryset = User.objects.filter(id=user_id)

        queryset = File.objects.annotate(
            edit=Exists(user_queryset.filter(edit_filter)),
        )
        queryset = queryset.filter(edit=True)

        return queryset

    def copy(self, pk, from_key=None, **mods):
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
