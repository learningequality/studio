import copy
import json
import uuid

from django.conf import settings
from django.db import transaction
from django.db.models import Exists
from django.db.models import F
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from le_utils.constants import content_kinds
from le_utils.constants import exercises
from le_utils.constants import roles
from rest_framework.permissions import IsAuthenticated
from rest_framework.serializers import empty
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
from contentcuration.viewsets.base import RequiredFilterSet
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.common import NotNullArrayAgg
from contentcuration.viewsets.common import SQCount
from contentcuration.viewsets.common import UUIDInFilter
from contentcuration.viewsets.sync.constants import CONTENTNODE
from contentcuration.viewsets.sync.constants import DELETED
from contentcuration.viewsets.sync.constants import UPDATED


orphan_tree_id_subquery = ContentNode.objects.filter(
    pk=settings.ORPHANAGE_ROOT_ID
).values_list("tree_id", flat=True)[:1]


class ContentNodeFilter(RequiredFilterSet):
    id__in = UUIDInFilter(name="id")
    channel_root = CharFilter(method="filter_channel_root")

    class Meta:
        model = ContentNode
        fields = ("parent", "id__in", "kind", "channel_root")

    def filter_channel_root(self, queryset, name, value):
        return queryset.filter(
            parent=Channel.objects.filter(pk=value).values_list(
                "main_tree__id", flat=True
            )
        )


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
        )
        list_serializer_class = ContentNodeListSerializer

    def create(self, validated_data):
        # Creating a new node, by default put it in the orphanage on initial creation.
        if "parent" not in validated_data:
            validated_data["parent_id"] = settings.ORPHANAGE_ROOT_ID
        prerequisites = validated_data.pop("prerequisite", [])
        self.prerequisite_ids = [prereq.id for prereq in prerequisites]

        return super(ContentNodeSerializer, self).create(validated_data)

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
            return json.loads(item.get("thumbnail_encoding")).get("base64")
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
class ContentNodeViewSet(BulkUpdateMixin, CopyMixin, ValuesViewset):
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
        "assessment_items_ids",
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
        "has_files",
        "invalid_exercise",
    )

    field_map = {
        "language": "language_id",
        "license": "license_id",
        "tags": clean_content_tags,
        "kind": "kind__kind",
        "prerequisite": "prerequisite_ids",
        "assessment_items": "assessment_items_ids",
        "thumbnail_src": retrieve_thumbail_src,
        "title": get_title,
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
        )

        queryset = queryset.filter(Q(edit=True) | Q(tree_id=orphan_tree_id_subquery))

        return queryset.exclude(pk=settings.ORPHANAGE_ROOT_ID)

    def annotate_queryset(self, queryset):
        queryset = queryset.annotate(total_count=(F("rght") - F("lft") - 1) / 2)

        exercise_check_query = AssessmentItem.objects.filter(contentnode=OuterRef('id')) \
            .exclude(type=exercises.PERSEUS_QUESTION)\
            .filter(
                Q(question='') |
                Q(answers='[]') |
                (~Q(type=exercises.INPUT_QUESTION) & ~Q(answers__iregex='"correct":true'))  # hack to check if no correct answers
            )
        file_check_query = File.objects.filter(preset__supplementary=False, contentnode=OuterRef("id"))

        descendant_resources = (
            ContentNode.objects.filter(
                tree_id=OuterRef("tree_id"),
                lft__gt=OuterRef("lft"),
                rght__lt=OuterRef("rght"),
            )
            .exclude(kind_id=content_kinds.TOPIC)
            .order_by("id")
            .distinct("id")
            .values_list("id", flat=True)
        )

        # Get count of descendant nodes with errors
        descendant_errors = (
            ContentNode.objects.filter(
                tree_id=OuterRef("tree_id"),
                lft__gt=OuterRef("lft"),
                rght__lt=OuterRef("rght"),
            ).annotate(
                has_files=Exists(file_check_query),
                has_questions=Exists(AssessmentItem.objects.filter(contentnode=OuterRef("id"))),
                invalid_exercise=Exists(exercise_check_query)
            )
            .filter(
                Q(title='') |
                ~Q(kind_id=content_kinds.TOPIC) & (
                    (~Q(kind_id=content_kinds.EXERCISE) & Q(has_files=False)) |
                    Q(license=None) |
                    (Q(license__is_custom=True) & (Q(license_description=None) | Q(license_description=''))) |
                    (Q(license__copyright_holder_required=True) & (Q(copyright_holder=None) | Q(copyright_holder='')))
                ) |
                Q(kind_id=content_kinds.EXERCISE) & (
                    Q(has_questions=False) |
                    Q(invalid_exercise=True) |
                    Q(extra_fields__has_key='mastery_model') |
                    Q(extra_fields__mastery_model=exercises.M_OF_N) & (
                        ~Q(extra_fields__has_key='m') | ~Q(extra_fields__has_key='n')
                    )
                )
            )
            .order_by("id")
            .distinct("id")
            .values_list("id", flat=True)
        )
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
        queryset = queryset.annotate(
            resource_count=SQCount(descendant_resources, field="id"),
            coach_count=SQCount(
                descendant_resources.filter(role_visibility=roles.COACH),
                field="id",
            ),
            error_count=SQCount(descendant_errors, field="id"),
            thumbnail_checksum=Subquery(thumbnails.values("checksum")[:1]),
            thumbnail_extension=Subquery(
                thumbnails.values("file_format__extension")[:1]
            ),
            original_channel_name=Subquery(original_channel.values("name")[:1]),
            original_parent_id=Subquery(original_node.values("parent_id")[:1]),
            original_node_id=Subquery(original_node.values("pk")[:1]),
            has_children=Exists(ContentNode.objects.filter(parent=OuterRef("id"))),
        )
        queryset = queryset.annotate(content_tags=NotNullArrayAgg("tags__tag_name"))
        queryset = queryset.annotate(file_ids=NotNullArrayAgg("files__id"))
        queryset = queryset.annotate(
            prerequisite_ids=NotNullArrayAgg("prerequisite__id")
        )
        queryset = queryset.annotate(
            assessment_items_ids=NotNullArrayAgg("assessment_items__id")
        )

        # Mark file/assessment item validation errors
        queryset = queryset.annotate(
            has_files=Exists(file_check_query),
            invalid_exercise=Exists(exercise_check_query)
        )
        return queryset

    def copy(self, pk, from_key=None, **mods):
        delete_response = [
            dict(key=pk, table=CONTENTNODE, type=DELETED,),
        ]

        try:
            with transaction.atomic():
                try:
                    source = ContentNode.objects.get(pk=from_key)
                except ContentNode.DoesNotExist:
                    error = ValidationError("Copy source node does not exist")
                    return str(error), delete_response

                if ContentNode.objects.filter(pk=pk).exists():
                    raise ValidationError("Copy pk already exists")

                # clone the model (in-memory) and update the fields on the cloned model
                new_node = copy.copy(source)
                new_node.pk = pk
                new_node.published = False
                new_node.changed = True
                new_node.cloned_source = source
                new_node.node_id = uuid.uuid4().hex
                new_node.source_node_id = source.node_id
                new_node.freeze_authoring_data = not Channel.objects.filter(
                    pk=source.original_channel_id, editors=self.request.user
                ).exists()

                # Creating a new node, by default put it in the orphanage on initial creation.
                new_node.parent_id = settings.ORPHANAGE_ROOT_ID

                # There might be some legacy nodes that don't have these, so ensure they are added
                if (
                    not new_node.original_channel_id
                    or not new_node.original_source_node_id
                ):
                    original_node = source.get_original_node()
                    original_channel = original_node.get_channel()
                    new_node.original_channel_id = (
                        original_channel.id if original_channel else None
                    )
                    new_node.original_source_node_id = original_node.node_id

                new_node.source_channel_id = mods.pop("source_channel_id", None)
                if not new_node.source_channel_id:
                    source_channel = source.get_channel()
                    new_node.source_channel_id = (
                        source_channel.id if source_channel else None
                    )

                new_node.save(force_insert=True)

                # because we don't know the tree yet, and tag data model currently uses channel,
                # we can't copy them unless we were given the new channel
                channel_id = mods.pop("channel_id", None)
                if channel_id:
                    copy_tags(source, channel_id, new_node)

                # Remove these because we do not want to define any mod operations on them during copy
                def clean_copy_data(data):
                    return {
                        key: empty if key in copy_ignore_fields else value
                        for key, value in data.items()
                    }

                serializer = ContentNodeSerializer(
                    instance=new_node, data=clean_copy_data(mods), partial=True
                )
                serializer.is_valid(raise_exception=True)
                node = serializer.save()
                node.save()

                return (
                    None,
                    [
                        dict(
                            key=pk,
                            table=CONTENTNODE,
                            type=UPDATED,
                            mods=clean_copy_data(serializer.validated_data),
                        ),
                    ],
                )
        except ValidationError as e:
            return e.detail, None
