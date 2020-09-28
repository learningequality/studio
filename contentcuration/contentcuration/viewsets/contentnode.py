import json

from django.conf import settings
from django.db import transaction
from django.db.models import Exists
from django.db.models import F
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import UUIDFilter
from le_utils.constants import content_kinds
from le_utils.constants import roles
from rest_framework.permissions import IsAuthenticated
from rest_framework.serializers import PrimaryKeyRelatedField
from rest_framework.serializers import ValidationError

from contentcuration.models import AssessmentItem
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import ContentTag
from contentcuration.models import File
from contentcuration.models import generate_storage_url
from contentcuration.models import PrerequisiteContentRelationship
from contentcuration.models import User
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import BulkUpdateMixin
from contentcuration.viewsets.base import CopyMixin
from contentcuration.viewsets.base import MoveMixin
from contentcuration.viewsets.base import RequiredFilterSet
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.common import NotNullArrayAgg
from contentcuration.viewsets.common import SQCount
from contentcuration.viewsets.common import UUIDInFilter
from contentcuration.viewsets.sync.constants import CONTENTNODE
from contentcuration.viewsets.sync.constants import DELETED


orphan_tree_id_subquery = ContentNode.objects.filter(
    pk=settings.ORPHANAGE_ROOT_ID
).values_list("tree_id", flat=True)[:1]

channel_query = Channel.objects.filter(main_tree__tree_id=OuterRef("tree_id"))


class ContentNodeFilter(RequiredFilterSet):
    id__in = UUIDInFilter(name="id")
    root_id = UUIDFilter(method="filter_root_id")
    ancestors_of = UUIDFilter(method="filter_ancestors_of")
    parent__in = UUIDInFilter(name="parent")
    _node_id_channel_id___in = CharFilter(method="filter__node_id_channel_id")

    class Meta:
        model = ContentNode
        fields = (
            "parent",
            "parent__in",
            "id__in",
            "kind",
            "root_id",
            "ancestors_of",
            "_node_id_channel_id___in",
        )

    def filter_root_id(self, queryset, name, value):
        return queryset.filter(
            parent=Channel.objects.filter(pk=value).values_list(
                "main_tree__id", flat=True
            )
        )

    def filter_ancestors_of(self, queryset, name, value):
        # For simplicity include the target node in the query
        target_node_query = ContentNode.objects.filter(pk=value)
        return queryset.filter(
            tree_id=target_node_query.values_list("tree_id", flat=True)[:1],
            lft__lte=target_node_query.values_list("lft", flat=True)[:1],
            rght__gte=target_node_query.values_list("rght", flat=True)[:1],
        )

    def filter__node_id_channel_id(self, queryset, name, value):
        query = Q()
        values = value.split(",")
        num_pairs = len(values) // 2
        for i in range(0, num_pairs):
            query |= Q(node_id=values[i * 2], channel_id=values[i * 2 + 1])
        return queryset.filter(query)


class ContentNodeListSerializer(BulkListSerializer):
    def gather_prerequisites(self, validated_data, add_empty=True):
        prerequisite_ids_by_id = {}

        for obj in validated_data:
            try:
                prerequisites = obj.pop("prerequisite")
                prerequisite_ids = [prereq.id for prereq in prerequisites]
            except KeyError:
                pass
            else:
                if add_empty or prerequisite_ids:
                    prerequisite_ids_by_id[obj["id"]] = prerequisite_ids
        return prerequisite_ids_by_id

    def set_prerequisites(self, prerequisite_ids_by_id):
        prereqs_to_create = []
        prereqs_to_delete = []
        current_prereqs = PrerequisiteContentRelationship.objects.filter(
            target_node__in=prerequisite_ids_by_id.keys()
        )
        current_prereqs_by_id = {}
        for prereq in current_prereqs:
            if prereq.target_node.id not in current_prereqs_by_id:
                current_prereqs_by_id[prereq.target_node.id] = []
            current_prereqs_by_id[prereq.target_node.id].append(prereq)
        for target_node_id, prereq_ids in prerequisite_ids_by_id.items():
            current = current_prereqs_by_id.get(target_node_id, [])
            ids_set = set(prereq_ids)
            current_set = set()
            for prereq in current:
                if prereq.prerequisite.id not in ids_set:
                    prereqs_to_delete.append(prereq)
                else:
                    current_set.add(prereq.prerequisite)
            prereqs_to_create.extend(
                [
                    PrerequisiteContentRelationship(
                        target_node_id=target_node_id, prerequisite_id=prereq_id
                    )
                    for prereq_id in ids_set - current_set
                ]
            )
        PrerequisiteContentRelationship.objects.filter(
            id__in=[p.id for p in prereqs_to_delete]
        ).delete()
        # Can simplify this in Django 2.2 by using bulk_create with ignore_conflicts
        # and just setting all required objects.
        PrerequisiteContentRelationship.objects.bulk_create(prereqs_to_create)

    def update(self, queryset, all_validated_data):
        prereqs = self.gather_prerequisites(all_validated_data)
        all_objects = super(ContentNodeListSerializer, self).update(
            queryset, all_validated_data
        )
        self.set_prerequisites(prereqs)
        return all_objects


class ContentNodeSerializer(BulkModelSerializer):
    """
    This is a write only serializer - we leverage it to do create and update
    operations, but read operations are handled by the Viewset.
    """

    prerequisite = PrimaryKeyRelatedField(
        many=True, queryset=ContentNode.objects.all(), required=False
    )

    class Meta:
        model = ContentNode
        fields = (
            "id",
            "title",
            "description",
            "prerequisite",
            "kind",
            "language",
            "license",
            "license_description",
            "copyright_holder",
            "author",
            "role_visibility",
            "aggregator",
            "provider",
            "extra_fields",
            "thumbnail_encoding",
            "parent",
            "complete",
        )
        list_serializer_class = ContentNodeListSerializer

    def create(self, validated_data):
        # Creating a new node, by default put it in the orphanage on initial creation.
        if "parent" not in validated_data:
            validated_data["parent_id"] = settings.ORPHANAGE_ROOT_ID
        prerequisites = validated_data.pop("prerequisite", [])
        self.prerequisite_ids = [prereq.id for prereq in prerequisites]

        return super(ContentNodeSerializer, self).create(validated_data)

    def update(self, instance, validated_data):
        if "parent" in validated_data:
            raise ValidationError(
                {"parent": "This field should only be changed by a move operation"}
            )

        return super(ContentNodeSerializer, self).update(instance, validated_data)

    def post_save_create(self, instance, many_to_many=None):
        prerequisite_ids = getattr(self, "prerequisite_ids", [])
        super(ContentNodeSerializer, self).post_save_create(
            instance, many_to_many=many_to_many
        )
        if prerequisite_ids:
            prereqs_to_create = [
                PrerequisiteContentRelationship(
                    target_node_id=instance.id, prerequisite_id=prereq_id
                )
                for prereq_id in prerequisite_ids
            ]
            PrerequisiteContentRelationship.objects.bulk_create(prereqs_to_create)


def retrieve_thumbail_src(item):
    """ Get either the encoding or the url to use as the <img> src attribute """
    try:
        if item.get("thumbnail_encoding"):
            encoding = json.loads(item.get("thumbnail_encoding"))
            if encoding:
                return encoding.get("base64")
    except ValueError:
        pass
    if (
        item["thumbnail_checksum"] is not None
        and item["thumbnail_extension"] is not None
    ):
        return generate_storage_url(
            "{}.{}".format(item["thumbnail_checksum"], item["thumbnail_extension"])
        )
    return None


def clean_content_tags(item):
    tags = item.pop("content_tags")
    return filter(lambda x: x is not None, tags)


def get_title(item):
    # If it's the root, use the channel name (should be original channel name)
    return item["title"] if item["parent_id"] else item["original_channel_name"]


def copy_tags(from_node, to_channel_id, to_node):
    from_channel_id = from_node.get_channel().id

    from_query = ContentTag.objects.filter(channel_id=to_channel_id)
    to_query = ContentTag.objects.filter(channel_id=from_channel_id)

    create_query = from_query.values("tag_name").difference(to_query.values("tag_name"))
    new_tags = [
        ContentTag(channel_id=to_channel_id, tag_name=tag_name)
        for tag_name in create_query
    ]
    ContentTag.objects.bulk_create(new_tags)

    tag_ids = to_query.filter(tag_name__in=from_node.tags.values("tag_name"))
    new_throughs = [
        ContentNode.tags.through(contentnode_id=to_node.id, contenttag_id=tag_id)
        for tag_id in tag_ids
    ]
    ContentNode.tags.through.objects.bulk_create(new_throughs)


copy_ignore_fields = {
    "tags",
    "total_count",
    "resource_count",
    "coach_count",
    "error_count",
    "has_files",
    "invalid_exercise",
}

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
        **{"editable_channels__{}__tree_id".format(tree_name): OuterRef("tree_id")}
    )

view_filter = Q()
for tree_name in channel_trees:
    view_filter |= Q(
        **{"view_only_channels__{}__tree_id".format(tree_name): OuterRef("tree_id")}
    )


# Apply mixin first to override ValuesViewset
class ContentNodeViewSet(BulkUpdateMixin, CopyMixin, MoveMixin, ValuesViewset):
    queryset = ContentNode.objects.all()
    serializer_class = ContentNodeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = (DjangoFilterBackend,)
    filter_class = ContentNodeFilter
    values = (
        "id",
        "content_id",
        "title",
        "description",
        "author",
        "assessment_item_count",
        "prerequisite_ids",
        "provider",
        "aggregator",
        "content_tags",
        "role_visibility",
        "kind__kind",
        "language_id",
        "license_id",
        "license_description",
        "copyright_holder",
        "extra_fields",
        "node_id",
        "root_id",
        "channel_id",
        "original_source_node_id",
        "original_channel_id",
        "original_channel_name",
        "original_node_id",
        "original_parent_id",
        "total_count",
        "resource_count",
        "error_count",
        "coach_count",
        "thumbnail_checksum",
        "thumbnail_extension",
        "thumbnail_encoding",
        "published",
        "modified",
        "has_children",
        "parent_id",
        "complete",
        "lft",
    )

    field_map = {
        "language": "language_id",
        "license": "license_id",
        "tags": clean_content_tags,
        "kind": "kind__kind",
        "prerequisite": "prerequisite_ids",
        "thumbnail_src": retrieve_thumbail_src,
        "title": get_title,
        "parent": "parent_id",
    }

    def get_queryset(self):
        user_id = not self.request.user.is_anonymous() and self.request.user.id
        user_queryset = User.objects.filter(id=user_id)

        queryset = ContentNode.objects.annotate(
            edit=Exists(user_queryset.filter(edit_filter)),
            view=Exists(user_queryset.filter(view_filter)),
            public=Exists(
                Channel.objects.filter(
                    public=True, main_tree__tree_id=OuterRef("tree_id")
                )
            ),
            # Annotate channel id
            channel_id=Subquery(channel_query.values_list("id", flat=True)[:1]),
        )

        queryset = queryset.filter(
            Q(view=True)
            | Q(edit=True)
            | Q(public=True)
            | Q(tree_id=orphan_tree_id_subquery)
        )

        return queryset.exclude(pk=settings.ORPHANAGE_ROOT_ID)

    def get_edit_queryset(self):
        user_id = not self.request.user.is_anonymous() and self.request.user.id
        user_queryset = User.objects.filter(id=user_id)

        queryset = ContentNode.objects.annotate(
            edit=Exists(user_queryset.filter(edit_filter)),
            # Annotate channel id
            channel_id=Subquery(channel_query.values_list("id", flat=True)[:1]),
        )

        queryset = queryset.filter(Q(edit=True) | Q(tree_id=orphan_tree_id_subquery))

        return queryset.exclude(pk=settings.ORPHANAGE_ROOT_ID)

    def annotate_queryset(self, queryset):
        queryset = queryset.annotate(total_count=(F("rght") - F("lft") - 1) / 2)

        descendant_resources = ContentNode.objects.filter(
            tree_id=OuterRef("tree_id"),
            lft__gt=OuterRef("lft"),
            rght__lt=OuterRef("rght"),
        ).exclude(kind_id=content_kinds.TOPIC)

        # Get count of descendant nodes with errors
        descendant_errors = descendant_resources.filter(complete=False)

        thumbnails = File.objects.filter(
            contentnode=OuterRef("id"), preset__thumbnail=True
        )
        original_channel = Channel.objects.filter(
            Q(pk=OuterRef("original_channel_id"))
            | Q(main_tree__tree_id=OuterRef("tree_id"))
        )
        original_node = ContentNode.objects.filter(
            node_id=OuterRef("original_source_node_id")
        ).filter(node_id=F("original_source_node_id"))

        root_id = ContentNode.objects.filter(
            tree_id=OuterRef("tree_id"), parent__isnull=True
        ).values_list("id", flat=True)[:1]

        assessment_items = AssessmentItem.objects\
            .filter(contentnode_id=OuterRef("id"), deleted=False)\
            .values_list('assessment_id', flat=True)\
            .distinct()

        queryset = queryset.annotate(
            resource_count=SQCount(descendant_resources, field="id"),
            coach_count=SQCount(
                descendant_resources.filter(role_visibility=roles.COACH), field="id",
            ),
            assessment_item_count=SQCount(assessment_items, field="assessment_id"),
            error_count=SQCount(descendant_errors, field="id"),
            thumbnail_checksum=Subquery(thumbnails.values("checksum")[:1]),
            thumbnail_extension=Subquery(
                thumbnails.values("file_format__extension")[:1]
            ),
            original_channel_name=Subquery(original_channel.values("name")[:1]),
            original_parent_id=Subquery(original_node.values("parent_id")[:1]),
            original_node_id=Subquery(original_node.values("pk")[:1]),
            has_children=Exists(ContentNode.objects.filter(parent=OuterRef("id"))),
            root_id=Subquery(root_id),
        )
        queryset = queryset.annotate(content_tags=NotNullArrayAgg("tags__tag_name"))
        queryset = queryset.annotate(file_ids=NotNullArrayAgg("files__id"))
        queryset = queryset.annotate(
            prerequisite_ids=NotNullArrayAgg("prerequisite__id")
        )

        return queryset

    def move(self, pk, target=None, position="last-child"):
        try:
            contentnode = self.get_edit_queryset().get(pk=pk)
        except ContentNode.DoesNotExist:
            error = ValidationError("Specified node does not exist")
            return str(error), None

        try:
            target, position = self.validate_targeting_args(target, position)
            try:
                contentnode.move_to(target, position)
            except ValueError:
                raise ValidationError(
                    "Invalid position argument specified: {}".format(position)
                )

            return (
                None,
                None,
            )
        except ValidationError as e:
            return str(e), None

    def copy(self, pk, from_key=None, **mods):

        target = mods.pop("target")
        position = mods.pop("position", "last-child")

        try:
            target, position = self.validate_targeting_args(target, position)
        except ValidationError as e:
            return str(e), None

        try:
            source = self.get_queryset().get(pk=from_key)
        except ContentNode.DoesNotExist:
            error = ValidationError("Copy source node does not exist")
            return str(error), [dict(key=pk, table=CONTENTNODE, type=DELETED)]

        if ContentNode.objects.filter(pk=pk).exists():
            error = ValidationError("Copy pk already exists")
            return str(error), None

        with transaction.atomic():
            # create a very basic copy

            new_node_data = {
                "id": pk,
                "content_id": source.content_id,
                "kind": source.kind,
                "title": source.title,
                "description": source.description,
                "cloned_source": source,
                "source_channel_id": source.channel_id,
                "source_node_id": source.node_id,
                "freeze_authoring_data": not Channel.objects.filter(
                    pk=source.original_channel_id, editors=self.request.user
                ).exists(),
                "changed": True,
                "published": False,
            }

            # Add any additional modifications sent from the frontend
            new_node_data.update(mods)

            # There might be some legacy nodes that don't have these, so ensure they are added
            if source.original_channel_id:
                new_node_data["original_channel_id"] = source.original_channel_id
            else:
                original_node = source.get_original_node()
                original_channel = original_node.get_channel()
                new_node_data["original_channel_id"] = (
                    original_channel.id if original_channel else None
                )

            serializer = ContentNodeSerializer(data=new_node_data, partial=True)
            try:

                serializer.is_valid(raise_exception=True)

            except ValidationError as e:
                return e.detail, None

            new_node = ContentNode(**new_node_data)

            new_node.insert_at(target, position, save=False, allow_existing_pk=True)

            new_node.save(force_insert=True)

            return (
                None,
                None,
            )
