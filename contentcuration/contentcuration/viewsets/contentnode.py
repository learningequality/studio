import json
from functools import partial
from functools import reduce

from django.conf import settings
from django.db import IntegrityError
from django.db import models
from django.db.models import Exists
from django.db.models import F
from django.db.models import IntegerField as DjangoIntegerField
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django.db.models.functions import Cast
from django.db.models.functions import Coalesce
from django.http import Http404
from django.utils.timezone import now
from django_cte import CTEQuerySet
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import UUIDFilter
from le_utils.constants import content_kinds
from le_utils.constants import exercises
from le_utils.constants import roles
from le_utils.constants.labels import accessibility_categories
from le_utils.constants.labels import learning_activities
from le_utils.constants.labels import levels
from le_utils.constants.labels import needs
from le_utils.constants.labels import resource_type
from le_utils.constants.labels import subjects
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.serializers import BooleanField
from rest_framework.serializers import ChoiceField
from rest_framework.serializers import DictField
from rest_framework.serializers import IntegerField
from rest_framework.serializers import ValidationError
from rest_framework.viewsets import ViewSet

from contentcuration.constants import completion_criteria
from contentcuration.db.models.expressions import IsNull
from contentcuration.db.models.query import RIGHT_JOIN
from contentcuration.db.models.query import With
from contentcuration.db.models.query import WithValues
from contentcuration.models import AssessmentItem
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import ContentTag
from contentcuration.models import File
from contentcuration.models import generate_storage_url
from contentcuration.models import PrerequisiteContentRelationship
from contentcuration.models import UUIDField
from contentcuration.tasks import create_async_task
from contentcuration.tasks import get_or_create_async_task
from contentcuration.utils.nodes import calculate_resource_size
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import BulkUpdateMixin
from contentcuration.viewsets.base import RequiredFilterSet
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.common import ChangeEventMixin
from contentcuration.viewsets.common import DotPathValueMixin
from contentcuration.viewsets.common import JSONFieldDictSerializer
from contentcuration.viewsets.common import NotNullMapArrayAgg
from contentcuration.viewsets.common import SQCount
from contentcuration.viewsets.common import UserFilteredPrimaryKeyRelatedField
from contentcuration.viewsets.common import UUIDInFilter
from contentcuration.viewsets.sync.constants import CONTENTNODE
from contentcuration.viewsets.sync.constants import CREATED
from contentcuration.viewsets.sync.constants import DELETED
from contentcuration.viewsets.sync.constants import TASK_ID
from contentcuration.viewsets.sync.utils import generate_delete_event
from contentcuration.viewsets.sync.utils import generate_update_event
from contentcuration.viewsets.sync.utils import log_sync_exception


channel_query = Channel.objects.filter(main_tree__tree_id=OuterRef("tree_id"))


_valid_positions = {"first-child", "last-child", "left", "right"}


class ContentNodeFilter(RequiredFilterSet):
    id__in = UUIDInFilter(field_name="id")
    root_id = UUIDFilter(method="filter_root_id")
    ancestors_of = UUIDFilter(method="filter_ancestors_of")
    parent__in = UUIDInFilter(field_name="parent")
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
        """
        See MPTTModel.get_ancestors()
        """
        try:
            # Includes the target node in the query
            target_node = ContentNode.objects.get(pk=value)
            if target_node.is_root_node():
                return queryset.filter(pk=value)

            return queryset.filter(
                tree_id=target_node.tree_id,
                lft__lte=target_node.lft,
                rght__gte=target_node.rght,
            )
        except ContentNode.DoesNotExist:
            return queryset.none()

    def filter__node_id_channel_id(self, queryset, name, value):
        query = Q()
        values = value.split(",")
        num_pairs = len(values) // 2
        for i in range(0, num_pairs):
            query |= Q(node_id=values[i * 2], channel_id=values[i * 2 + 1])
        return queryset.filter(query)


tags_values_cte_fields = {
    'tag': models.CharField(),
    'node_id': UUIDField()
}


def set_tags(tags_by_id):
    tag_tuples = []
    tags_relations_to_delete = []

    # put all tags into a tuple (tag_name, node_id) to send into SQL
    for target_node_id, tag_names in tags_by_id.items():
        for tag_name, value in tag_names.items():
            tag_tuples.append((tag_name, target_node_id))

    # create CTE that holds the tag_tuples data
    values_cte = WithValues(tags_values_cte_fields, tag_tuples, name='values_cte')

    # create another CTE which will RIGHT join against the tag table, so we get all of our
    # tag_tuple data back, plus the tag_id if it exists. Ideally we wouldn't normally use a RIGHT
    # join, we would simply swap the tables and do a LEFT, but with the VALUES CTE
    # that isn't possible
    tags_qs = (
        values_cte.join(ContentTag, tag_name=values_cte.col.tag, _join_type=RIGHT_JOIN)
        .annotate(
            tag=values_cte.col.tag,
            node_id=values_cte.col.node_id,
            tag_id=F('id'),
        )
        .values('tag', 'node_id', 'tag_id')
    )
    tags_cte = With(tags_qs, name='tags_cte')

    # the final query, we RIGHT join against the tag relation table so we get the tag_tuple back
    # again, plus the tag_id from the previous CTE, plus annotate a boolean of whether
    # the relation exists
    qs = (
        tags_cte.join(
            CTEQuerySet(model=ContentNode.tags.through),
            contenttag_id=tags_cte.col.tag_id,
            contentnode_id=tags_cte.col.node_id,
            _join_type=RIGHT_JOIN
        )
        .with_cte(values_cte)
        .with_cte(tags_cte)
        .annotate(
            tag_name=tags_cte.col.tag,
            node_id=tags_cte.col.node_id,
            tag_id=tags_cte.col.tag_id,
            has_relation=IsNull('contentnode_id', negate=True)
        )
        .values('tag_name', 'node_id', 'tag_id', 'has_relation')
    )

    created_tags = {}
    for result in qs:
        tag_name = result["tag_name"]
        node_id = result["node_id"]
        tag_id = result["tag_id"]
        has_relation = result["has_relation"]

        tags = tags_by_id[node_id]
        value = tags[tag_name]

        # tag wasn't found in the DB, but we're adding it to the node, so create it
        if not tag_id and value:
            # keep a cache of created tags during the session
            if tag_name in created_tags:
                tag_id = created_tags[tag_name]
            else:
                tag, _ = ContentTag.objects.get_or_create(tag_name=tag_name, channel_id=None)
                tag_id = tag.pk
                created_tags.update({tag_name: tag_id})

        # if we're adding the tag but the relation didn't exist, create it now, otherwise
        # track the tag as one relation we should delete
        if value and not has_relation:
            ContentNode.tags.through.objects.get_or_create(
                contentnode_id=node_id, contenttag_id=tag_id
            )
        elif not value and has_relation:
            tags_relations_to_delete.append(
                Q(contentnode_id=node_id, contenttag_id=tag_id)
            )

    # delete tags
    if tags_relations_to_delete:
        ContentNode.tags.through.objects.filter(
            reduce(lambda x, y: x | y, tags_relations_to_delete)
        ).delete()


class ContentNodeListSerializer(BulkListSerializer):
    def gather_tags(self, validated_data):
        tags_by_id = {}

        for obj in validated_data:
            try:
                tags = obj.pop("tags")
            except KeyError:
                pass
            else:
                if tags:
                    tags_by_id[obj["id"]] = tags
        return tags_by_id

    def update(self, queryset, all_validated_data):
        tags = self.gather_tags(all_validated_data)
        modified = now()
        for data in all_validated_data:
            data["modified"] = modified
        all_objects = super(ContentNodeListSerializer, self).update(
            queryset, all_validated_data
        )
        if tags:
            set_tags(tags)
        return all_objects


class ExtraFieldsOptionsSerializer(JSONFieldDictSerializer):
    modality = ChoiceField(choices=(("QUIZ", "Quiz"),), allow_null=True, required=False)
    completion_criteria = DictField(required=False, validators=[completion_criteria.validate])


class ExtraFieldsSerializer(JSONFieldDictSerializer):
    mastery_model = ChoiceField(
        choices=exercises.MASTERY_MODELS, allow_null=True, required=False
    )
    randomize = BooleanField(allow_null=True, required=False)
    m = IntegerField(allow_null=True, required=False)
    n = IntegerField(allow_null=True, required=False)
    options = ExtraFieldsOptionsSerializer(required=False)


class TagField(DotPathValueMixin, DictField):
    pass


class MetadataLabelsField(JSONFieldDictSerializer):
    def __init__(self, choices, *args, **kwargs):
        self.choices = choices
        # Instantiate the superclass normally
        super().__init__(*args, **kwargs)

    def get_fields(self):
        fields = {}
        for label_id, label_name in self.choices:
            field = BooleanField(required=False, label=label_name, allow_null=True)
            fields[label_id] = field
        return fields


class ContentNodeSerializer(BulkModelSerializer):
    """
    This is a write only serializer - we leverage it to do create and update
    operations, but read operations are handled by the Viewset.
    """

    parent = UserFilteredPrimaryKeyRelatedField(
        queryset=ContentNode.objects.all(), required=False
    )
    extra_fields = ExtraFieldsSerializer(required=False)

    tags = TagField(required=False)

    # Fields for metadata labels
    grade_levels = MetadataLabelsField(levels.choices, required=False)
    resource_types = MetadataLabelsField(resource_type.choices, required=False)
    learning_activities = MetadataLabelsField(learning_activities.choices, required=False)
    accessibility_labels = MetadataLabelsField(accessibility_categories.choices, required=False)
    categories = MetadataLabelsField(subjects.choices, required=False)
    learner_needs = MetadataLabelsField(needs.choices, required=False)

    class Meta:
        model = ContentNode
        fields = (
            "id",
            "title",
            "description",
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
            "changed",
            "tags",
            "grade_levels",
            "resource_types",
            "learning_activities",
            "accessibility_labels",
            "categories",
            "learner_needs",
        )
        list_serializer_class = ContentNodeListSerializer
        nested_writes = True

    def validate(self, data):
        tags = data.get("tags")
        if tags is not None:
            for tag in tags:
                if len(tag) > 30:
                    raise ValidationError("tag is greater than 30 characters")
        return data

    def create(self, validated_data):
        # Creating a new node, by default put it in the orphanage on initial creation.
        if "parent" not in validated_data:
            validated_data["parent_id"] = settings.ORPHANAGE_ROOT_ID

        tags = None
        if "tags" in validated_data:
            tags = validated_data.pop("tags")

        instance = super(ContentNodeSerializer, self).create(validated_data)

        if tags:
            set_tags({instance.id: tags})

        return instance

    def update(self, instance, validated_data):
        if "parent" in validated_data:
            raise ValidationError(
                {"parent": "This field should only be changed by a move operation"}
            )

        extra_fields = validated_data.pop("extra_fields", None)
        if extra_fields is not None:
            validated_data["extra_fields"] = self.fields["extra_fields"].update(
                instance.extra_fields, extra_fields
            )
        if "tags" in validated_data:
            tags = validated_data.pop("tags")
            set_tags({instance.id: tags})
        return super(ContentNodeSerializer, self).update(instance, validated_data)


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


def get_title(item):
    # If it's the root, use the channel name (should be original channel name)
    return item["title"] if item["parent_id"] else item["original_channel_name"]


class PrerequisitesUpdateHandler(ViewSet):
    """
    Dummy viewset for handling create and delete changes for prerequisites
    """

    def _get_values_from_change(self, change):
        return {
            "target_node_id": change["key"][0],
            "prerequisite_id": change["key"][1],
        }

    def _execute_changes(self, change_type, data):
        if data:
            if change_type == CREATED:
                PrerequisiteContentRelationship.objects.bulk_create(
                    [PrerequisiteContentRelationship(**d) for d in data]
                )
            elif change_type == DELETED:
                PrerequisiteContentRelationship.objects.filter(
                    reduce(lambda x, y: x | y, map(lambda x: Q(**x), data))
                ).delete()

    def _check_permissions(self, changes):
        # Filter the passed in contentondes, on both side of the relationship
        allowed_contentnodes = set(
            ContentNode.filter_edit_queryset(
                ContentNode.objects.all(), self.request.user
            )
            .filter(
                id__in=list(map(lambda x: x["key"][0], changes))
                + list(map(lambda x: x["key"][1], changes))
            )
            .values_list("id", flat=True)
        )

        valid_changes = []
        errors = []

        for change in changes:
            if (
                change["key"][0] in allowed_contentnodes
                and change["key"][1] in allowed_contentnodes
            ):
                valid_changes.append(change)
            else:
                change.update({"errors": ValidationError("Not found").detail})
                errors.append(change)
        return valid_changes, errors

    def _check_valid(self, changes):
        # Don't allow prerequisites to be created across different trees
        # or on themselves
        valid_changes = []
        errors = []

        tree_id_lookup = {
            c["id"]: c["tree_id"]
            for c in ContentNode.objects.filter(
                id__in=list(map(lambda x: x["key"][0], changes))
                + list(map(lambda x: x["key"][1], changes))
            ).values("id", "tree_id")
        }

        # Do a lookup on existing prerequisite relationships in the opposite direction to the ones we are trying to set
        # Create a lookup string of prerequisite_id:target_node_id which we will compare against target_node_id:prerequisite_id
        existing_relationships_lookup = {
            "{}:{}".format(p["prerequisite_id"], p["target_node_id"])
            for p in PrerequisiteContentRelationship.objects.filter(
                # First part of the key is the target_node_id and prerequisite_id the second, so we reverse them here
                reduce(
                    lambda x, y: x | y,
                    map(
                        lambda x: Q(
                            target_node_id=x["key"][1], prerequisite_id=x["key"][0]
                        ),
                        changes,
                    ),
                )
            ).values("target_node_id", "prerequisite_id")
        }

        for change in changes:
            if change["key"][0] == change["key"][1]:
                change.update(
                    {
                        "errors": ValidationError(
                            "Prerequisite relationship cannot be self referential"
                        ).detail
                    }
                )
                errors.append(change)
            elif tree_id_lookup[change["key"][0]] != tree_id_lookup[change["key"][1]]:
                change.update(
                    {
                        "errors": ValidationError(
                            "Prerequisite relationship cannot cross trees"
                        ).detail
                    }
                )
                errors.append(change)
            elif (
                "{}:{}".format(change["key"][0], change["key"][1])
                in existing_relationships_lookup
            ):
                change.update(
                    {
                        "errors": ValidationError(
                            "Prerequisite relationship cannot be reciprocal"
                        ).detail
                    }
                )
                errors.append(change)
            else:
                valid_changes.append(change)
        return valid_changes, errors

    def _handle_relationship_changes(self, changes):
        change_types = set(map(lambda x: x["type"], changes))
        if len(change_types) > 1:
            raise TypeError("Mixed change types passed to change handler")

        change_type = tuple(change_types)[0]

        permissioned_changes, permission_errors = self._check_permissions(changes)

        if change_type == CREATED and permissioned_changes:
            # Only do validation on create operations and if there are any changes left to validate
            valid_changes, validation_errors = self._check_valid(permissioned_changes)
            errors = permission_errors + validation_errors
        else:
            # For delete operations, just check permissions, but let invalid
            # relationships be deleted
            valid_changes = permissioned_changes
            errors = permission_errors

        data = list(map(self._get_values_from_change, valid_changes))

        # In Django 2.2 add ignore_conflicts to make this fool proof
        try:
            self._execute_changes(change_type, data)
        except IntegrityError as e:
            for change in valid_changes:
                change.update({"errors": str(e)})
                errors.append(change)

        return errors or None, None

    def create_from_changes(self, changes):
        return self._handle_relationship_changes(changes)

    def delete_from_changes(self, changes):
        return self._handle_relationship_changes(changes)


def dict_if_none(obj, field_name=None):
    return obj[field_name] if obj[field_name] else {}


# Apply mixin first to override ValuesViewset
class ContentNodeViewSet(BulkUpdateMixin, ChangeEventMixin, ValuesViewset):
    queryset = ContentNode.objects.all()
    serializer_class = ContentNodeSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = ContentNodeFilter
    values = (
        "id",
        "content_id",
        "title",
        "description",
        "author",
        "assessment_item_count",
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
        "has_updated_descendants",
        "has_new_descendants",
        "coach_count",
        "thumbnail_checksum",
        "thumbnail_extension",
        "thumbnail_encoding",
        "published",
        "modified",
        "has_children",
        "parent_id",
        "complete",
        "changed",
        "lft",
        "grade_levels",
        "resource_types",
        "learning_activities",
        "accessibility_labels",
        "categories",
        "learner_needs",
    )

    field_map = {
        "language": "language_id",
        "license": "license_id",
        "tags": "content_tags",
        "kind": "kind__kind",
        "thumbnail_src": retrieve_thumbail_src,
        "title": get_title,
        "parent": "parent_id",
        "grade_levels": partial(dict_if_none, field_name="grade_levels"),
        "resource_types": partial(dict_if_none, field_name="resource_types"),
        "learning_activities": partial(dict_if_none, field_name="learning_activities"),
        "accessibility_labels": partial(dict_if_none, field_name="accessibility_labels"),
        "categories": partial(dict_if_none, field_name="categories"),
        "learner_needs": partial(dict_if_none, field_name="learner_needs"),
    }

    def _annotate_channel_id(self, queryset):
        return queryset.annotate(
            channel_id=Subquery(channel_query.values_list("id", flat=True)[:1])
        )

    def get_queryset(self):
        queryset = super(ContentNodeViewSet, self).get_queryset()
        return self._annotate_channel_id(queryset)

    def get_edit_queryset(self):
        queryset = super(ContentNodeViewSet, self).get_edit_queryset()
        return self._annotate_channel_id(queryset)

    @action(detail=True, methods=["get"])
    def requisites(self, request, pk=None):
        if not pk:
            raise Http404

        # Here we are fetching the entire prerequisite relationship tree
        # for the channel. It is possible that this could get very large,
        # and cause performance issues, and it may not need to be loaded
        # on every fetch.
        # However, in order to detect potential cyclic prerequisite chains,
        # we load the entire channel's prerequisite tree at once.
        # Do a filter just on the tree_id of the target node, as relationships
        # should not be cross channel, and are not meaningful if they are.
        prereq_table_entries = PrerequisiteContentRelationship.objects.filter(
            target_node__tree_id=Cast(
                ContentNode.objects.filter(pk=pk).values_list("tree_id", flat=True)[:1],
                output_field=DjangoIntegerField(),
            )
        ).values("target_node_id", "prerequisite_id")

        return Response(
            list(
                map(
                    lambda x: {
                        "target_node": x["target_node_id"],
                        "prerequisite": x["prerequisite_id"],
                    },
                    prereq_table_entries,
                )
            ),
        )

    @action(detail=True, methods=["get"])
    def size(self, request, pk=None):
        if not pk:
            raise Http404

        task_info = None
        node = self.get_object()

        # currently we restrict triggering calculations through the API to the channel root node
        if not node.is_root_node():
            raise Http404

        # we don't force the calculation, so if the channel is large, it returns the cached size
        size, stale = calculate_resource_size(node=node, force=False)
        if stale:
            # When stale, that means the value is not up-to-date with modified files in the DB,
            # and the channel is significantly large, so we'll queue an async task for calculation.
            # We don't really need more than one queued async calculation task, so we use
            # get_or_create_async_task to ensure a task is queued, as well as return info about it
            task_args = dict(node_id=node.pk, channel_id=node.channel_id)
            task_info = get_or_create_async_task(
                "calculate-resource-size", self.request.user, **task_args
            )

        changes = []
        if task_info is not None:
            changes.append(self.create_task_event(task_info))

        return Response({
            "size": size,
            "stale": stale,
            "changes": changes
        })

    def annotate_queryset(self, queryset):
        queryset = queryset.annotate(total_count=(F("rght") - F("lft") - 1) / 2)

        descendant_resources = (
            ContentNode.objects.filter(
                tree_id=OuterRef("tree_id"),
                lft__gt=OuterRef("lft"),
                rght__lt=OuterRef("rght"),
            )
            .exclude(kind_id=content_kinds.TOPIC)
            .values("id", "role_visibility", "changed")
            .order_by()
        )

        all_descendants = (
            ContentNode.objects.filter(
                tree_id=OuterRef("tree_id"),
                lft__gt=OuterRef("lft"),
                rght__lt=OuterRef("rght"),
            )
            .values("id", "complete", "published")
            .order_by()
        )

        # Get count of descendant nodes with errors
        descendant_errors = all_descendants.filter(complete=False)
        changed_descendants = descendant_resources.filter(changed=True)

        thumbnails = File.objects.filter(
            contentnode=OuterRef("id"), preset__thumbnail=True
        )
        original_channel_name = Coalesce(
            Subquery(
                Channel.objects.filter(pk=OuterRef("original_channel_id")).values(
                    "name"
                )[:1]
            ),
            Subquery(
                Channel.objects.filter(main_tree__tree_id=OuterRef("tree_id")).values(
                    "name"
                )[:1]
            ),
        )
        original_node = ContentNode.objects.filter(
            node_id=OuterRef("original_source_node_id")
        ).filter(node_id=F("original_source_node_id"))

        root_id = ContentNode.objects.filter(
            tree_id=OuterRef("tree_id"), parent__isnull=True
        ).values_list("id", flat=True)[:1]

        assessment_items = (
            AssessmentItem.objects.filter(contentnode_id=OuterRef("id"), deleted=False)
            .values_list("assessment_id", flat=True)
            .distinct()
        )

        queryset = queryset.annotate(
            resource_count=SQCount(descendant_resources, field="id"),
            coach_count=SQCount(
                descendant_resources.filter(role_visibility=roles.COACH), field="id",
            ),
            assessment_item_count=SQCount(assessment_items, field="assessment_id"),
            error_count=SQCount(descendant_errors, field="id"),
            has_updated_descendants=Exists(
                changed_descendants.filter(published=True).values("id")
            ),
            has_new_descendants=Exists(
                changed_descendants.filter(published=False).values("id")
            ),
            thumbnail_checksum=Subquery(thumbnails.values("checksum")[:1]),
            thumbnail_extension=Subquery(
                thumbnails.values("file_format__extension")[:1]
            ),
            original_channel_name=original_channel_name,
            original_parent_id=Subquery(original_node.values("parent_id")[:1]),
            has_children=Exists(
                ContentNode.objects.filter(parent=OuterRef("id")).values("pk")
            ),
            root_id=Subquery(root_id),
        )
        queryset = queryset.annotate(content_tags=NotNullMapArrayAgg("tags__tag_name"))

        return queryset

    def validate_targeting_args(self, target, position):
        position = position or "last-child"
        if target is None:
            raise ValidationError("A target must be specified")
        try:
            target = self.get_edit_queryset().get(pk=target)
        except ContentNode.DoesNotExist:
            raise ValidationError("Target: {} does not exist".format(target))
        except ValueError:
            raise ValidationError("Invalid target specified: {}".format(target))
        if position not in _valid_positions:
            raise ValidationError(
                "Invalid position specified, must be one of {}".format(
                    ", ".join(_valid_positions)
                )
            )
        return target, position

    def move_from_changes(self, changes):
        errors = []
        changes_to_return = []
        for move in changes:
            # Move change will have key, must also have target property
            # optionally can include the desired position.
            move_error, move_change = self.move(
                move["key"], target=move.get("target"), position=move.get("position")
            )
            if move_error:
                move.update({"errors": [move_error]})
                errors.append(move)
            if move_change:
                changes_to_return.append(move_change)
        return errors, changes_to_return

    def move(self, pk, target=None, position=None):
        try:
            contentnode = self.get_edit_queryset().get(pk=pk)
        except ContentNode.DoesNotExist:
            error = ValidationError("Specified node does not exist")
            return str(error), None

        try:
            target, position = self.validate_targeting_args(target, position)

            channel_id = target.channel_id

            task_args = {
                "user_id": self.request.user.id,
                "channel_id": channel_id,
                "node_id": contentnode.id,
                "target_id": target.id,
                "position": position,
            }

            task, task_info = create_async_task(
                "move-nodes", self.request.user, **task_args
            )

            return (
                None,
                None,
            )
        except ValidationError as e:
            return str(e), None

    def copy_from_changes(self, changes):
        errors = []
        changes_to_return = []
        for copy in changes:
            # Copy change will have key, must also have other attributes, defined in `copy`
            # Just pass as keyword arguments here to let copy do the validation
            copy_errors, copy_changes = self.copy(copy["key"], **copy)
            if copy_errors:
                copy.update({"errors": copy_errors})
                errors.append(copy)
            if copy_changes:
                changes_to_return.extend(copy_changes)
        return errors, changes_to_return

    def copy(
        self,
        pk,
        from_key=None,
        target=None,
        position=None,
        mods=None,
        excluded_descendants=None,
        **kwargs
    ):
        try:
            target, position = self.validate_targeting_args(target, position)
        except ValidationError as e:
            return str(e), None

        try:
            source = self.get_queryset().get(pk=from_key)
        except ContentNode.DoesNotExist:
            error = ValidationError("Copy source node does not exist")
            return str(error), [generate_delete_event(pk, CONTENTNODE)]

        # Affected channel for the copy is the target's channel
        channel_id = target.channel_id

        if ContentNode.objects.filter(pk=pk).exists():
            error = ValidationError("Copy pk already exists")
            return str(error), None

        task_args = {
            "user_id": self.request.user.id,
            "channel_id": channel_id,
            "source_id": source.id,
            "target_id": target.id,
            "pk": pk,
            "mods": mods,
            "excluded_descendants": excluded_descendants,
            "position": position,
        }

        task, task_info = create_async_task(
            "duplicate-nodes", self.request.user, **task_args
        )

        return (
            None,
            [generate_update_event(pk, CONTENTNODE, {TASK_ID: task_info.task_id})],
        )

    def delete_from_changes(self, changes):
        errors = []
        changes_to_return = []
        queryset = self.get_edit_queryset().order_by()
        for change in changes:
            try:
                instance = queryset.get(**dict(self.values_from_key(change["key"])))

                task_args = {
                    "user_id": self.request.user.id,
                    "channel_id": instance.channel_id,
                    "node_id": instance.id,
                }

                task, task_info = create_async_task(
                    "delete-node", self.request.user, **task_args
                )
            except ContentNode.DoesNotExist:
                # If the object already doesn't exist, as far as the user is concerned
                # job done!
                pass
            except Exception as e:
                log_sync_exception(e)
                change["errors"] = [str(e)]
                errors.append(change)
        return errors, changes_to_return
