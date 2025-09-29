import json
from functools import partial
from functools import reduce

from django.core.exceptions import ValidationError as DjangoValidationError
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
from django_filters.rest_framework import BooleanFilter
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import UUIDFilter
from le_utils.constants import completion_criteria
from le_utils.constants import content_kinds
from le_utils.constants import roles
from le_utils.constants.labels import accessibility_categories
from le_utils.constants.labels import learning_activities
from le_utils.constants.labels import levels
from le_utils.constants.labels import needs
from le_utils.constants.labels import resource_type
from le_utils.constants.labels import subjects
from rest_framework.decorators import action
from rest_framework.pagination import Cursor
from rest_framework.pagination import replace_query_param
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.serializers import BooleanField
from rest_framework.serializers import CharField
from rest_framework.serializers import ChoiceField
from rest_framework.serializers import DictField
from rest_framework.serializers import Field
from rest_framework.serializers import ValidationError

from contentcuration.constants import (
    completion_criteria as completion_criteria_validator,
)
from contentcuration.db.models.expressions import IsNull
from contentcuration.db.models.query import RIGHT_JOIN
from contentcuration.db.models.query import With
from contentcuration.db.models.query import WithValues
from contentcuration.models import AssessmentItem
from contentcuration.models import Change
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import ContentTag
from contentcuration.models import File
from contentcuration.models import generate_storage_url
from contentcuration.models import PrerequisiteContentRelationship
from contentcuration.models import UUIDField
from contentcuration.tasks import calculate_resource_size_task
from contentcuration.utils.nodes import calculate_resource_size
from contentcuration.utils.nodes import migrate_extra_fields
from contentcuration.utils.nodes import validate_and_conform_to_schema_threshold_none
from contentcuration.utils.pagination import ValuesViewsetCursorPagination
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import BulkUpdateMixin
from contentcuration.viewsets.base import create_change_tracker
from contentcuration.viewsets.base import RequiredFilterSet
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.common import DotPathValueMixin
from contentcuration.viewsets.common import JSONFieldDictSerializer
from contentcuration.viewsets.common import NotNullMapArrayAgg
from contentcuration.viewsets.common import SQCount
from contentcuration.viewsets.common import UserFilteredPrimaryKeyRelatedField
from contentcuration.viewsets.common import UUIDInFilter
from contentcuration.viewsets.sync.constants import CONTENTNODE
from contentcuration.viewsets.sync.constants import COPYING_STATUS
from contentcuration.viewsets.sync.constants import COPYING_STATUS_VALUES
from contentcuration.viewsets.sync.constants import CREATED
from contentcuration.viewsets.sync.constants import DELETED
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
    complete = BooleanFilter(field_name="complete")

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


tags_values_cte_fields = {"tag": models.CharField(), "node_id": UUIDField()}


def set_tags(tags_by_id):
    tag_tuples = []
    tags_relations_to_delete = []

    # put all tags into a tuple (tag_name, node_id) to send into SQL
    for target_node_id, tag_names in tags_by_id.items():
        for tag_name, value in tag_names.items():
            tag_tuples.append((tag_name, target_node_id))

    # create CTE that holds the tag_tuples data
    values_cte = WithValues(tags_values_cte_fields, tag_tuples, name="values_cte")

    # create another CTE which will RIGHT join against the tag table, so we get all of our
    # tag_tuple data back, plus the tag_id if it exists. Ideally we wouldn't normally use a RIGHT
    # join, we would simply swap the tables and do a LEFT, but with the VALUES CTE
    # that isn't possible
    tags_qs = (
        values_cte.join(ContentTag, tag_name=values_cte.col.tag, _join_type=RIGHT_JOIN)
        .annotate(
            tag=values_cte.col.tag,
            node_id=values_cte.col.node_id,
            tag_id=F("id"),
        )
        .values("tag", "node_id", "tag_id")
    )
    tags_cte = With(tags_qs, name="tags_cte")

    # the final query, we RIGHT join against the tag relation table so we get the tag_tuple back
    # again, plus the tag_id from the previous CTE, plus annotate a boolean of whether
    # the relation exists
    qs = (
        tags_cte.join(
            CTEQuerySet(model=ContentNode.tags.through),
            contenttag_id=tags_cte.col.tag_id,
            contentnode_id=tags_cte.col.node_id,
            _join_type=RIGHT_JOIN,
        )
        .with_cte(values_cte)
        .with_cte(tags_cte)
        .annotate(
            tag_name=tags_cte.col.tag,
            node_id=tags_cte.col.node_id,
            tag_id=tags_cte.col.tag_id,
            has_relation=IsNull("contentnode_id", negate=True),
        )
        .values("tag_name", "node_id", "tag_id", "has_relation")
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
                tag, _ = ContentTag.objects.get_or_create(
                    tag_name=tag_name, channel_id=None
                )
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


class ThresholdField(Field):
    def to_representation(self, value):
        return value

    def to_internal_value(self, data):
        try:
            data = int(data)
        except (ValueError, TypeError):
            if not isinstance(data, (str, dict)):
                self.fail("Must be either an integer, string or dictionary")
        return data

    def update(self, instance, validated_data):
        if isinstance(instance, dict) and isinstance(validated_data, dict):
            instance.update(validated_data)
            return instance
        return validated_data


class CompletionCriteriaSerializer(JSONFieldDictSerializer):
    threshold = ThresholdField(allow_null=True)
    model = CharField()
    learner_managed = BooleanField(required=False, allow_null=True)

    def update(self, instance, validated_data):
        validated_data = validate_and_conform_to_schema_threshold_none(validated_data)
        return super(CompletionCriteriaSerializer, self).update(
            instance, validated_data
        )


class ExtraFieldsOptionsSerializer(JSONFieldDictSerializer):
    modality = ChoiceField(
        choices=(("QUIZ", "Quiz"), ("SURVEY", "Survey")),
        allow_null=True,
        required=False,
    )
    completion_criteria = CompletionCriteriaSerializer(required=False)


class InheritedMetadataSerializer(JSONFieldDictSerializer):
    categories = BooleanField(required=False)
    language = BooleanField(required=False)
    grade_levels = BooleanField(required=False)
    learner_needs = BooleanField(required=False)


class ExtraFieldsSerializer(JSONFieldDictSerializer):
    randomize = BooleanField()
    options = ExtraFieldsOptionsSerializer(required=False)
    suggested_duration_type = ChoiceField(
        choices=[completion_criteria.TIME, completion_criteria.APPROX_TIME],
        allow_null=True,
        required=False,
    )
    inherited_metadata = InheritedMetadataSerializer(required=False)

    def update(self, instance, validated_data):
        instance = migrate_extra_fields(instance)
        return super(ExtraFieldsSerializer, self).update(instance, validated_data)


class TagField(DotPathValueMixin, DictField):
    pass


class MetadataLabelBooleanField(BooleanField):
    def bind(self, field_name, parent):
        # By default the bind method of the Field class sets the source_attrs to field_name.split(".").
        # As we have literal field names that include "." we need to override this behavior.
        # Otherwise it will attempt to set the source_attrs to a nested path, assuming that it is a source path,
        # not a materialized path. This probably means that it was a bad idea to use "." in the materialized path,
        # but alea iacta est.
        super(MetadataLabelBooleanField, self).bind(field_name, parent)
        self.source_attrs = [self.source]


class MetadataLabelsField(JSONFieldDictSerializer):
    def __init__(self, choices, *args, **kwargs):
        self.choices = choices
        # Instantiate the superclass normally
        super().__init__(*args, **kwargs)

    def get_fields(self):
        fields = {}
        for label_id, label_name in self.choices:
            field = MetadataLabelBooleanField(
                required=False, label=label_name, allow_null=True
            )
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
    learning_activities = MetadataLabelsField(
        learning_activities.choices, required=False
    )
    accessibility_labels = MetadataLabelsField(
        accessibility_categories.choices, required=False
    )
    categories = MetadataLabelsField(subjects.choices, required=False)
    learner_needs = MetadataLabelsField(needs.choices, required=False)

    dict_fields = [
        "extra_fields",
        "grade_levels",
        "resource_types",
        "learning_activities",
        "accessibility_labels",
        "categories",
        "learner_needs",
    ]

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
            "suggested_duration",
        )
        list_serializer_class = ContentNodeListSerializer
        nested_writes = True

    def validate(self, data):
        # Creating, we require a parent to be set.
        if self.instance is None and "parent" not in data:
            raise ValidationError("Parent is required for creating a node.")
        elif self.instance is not None and "parent" in data:
            raise ValidationError(
                {"parent": "This field should only be changed by a move operation"}
            )
        tags = data.get("tags")
        if tags is not None:
            for tag in tags:
                if len(tag) > 30:
                    raise ValidationError("tag is greater than 30 characters")
        return data

    def _check_completion_criteria(self, kind, complete, validated_data):
        completion_criteria = (
            validated_data.get("extra_fields", {})
            .get("options", {})
            .get("completion_criteria", {})
        )
        try:
            if complete:
                completion_criteria_validator.validate(completion_criteria, kind)
            else:
                completion_criteria_validator.check_model_for_kind(
                    completion_criteria, kind
                )
        except DjangoValidationError as e:
            raise ValidationError(e)

    def _ensure_complete(self, instance):
        """
        If an instance is marked as complete, ensure that it is actually complete.
        If it is not, update the value, save, and issue a change event.
        """
        if instance.complete:
            instance.mark_complete()
            if not instance.complete:
                instance.save()
                user_id = None
                if "request" in self.context:
                    user_id = self.context["request"].user.id
                Change.create_change(
                    generate_update_event(
                        instance.id,
                        CONTENTNODE,
                        {"complete": False},
                        channel_id=instance.get_channel_id(),
                    ),
                    created_by_id=user_id,
                    applied=True,
                )

    def create(self, validated_data):
        tags = None
        if "tags" in validated_data:
            tags = validated_data.pop("tags")

        self._check_completion_criteria(
            validated_data.get("kind"),
            validated_data.get("complete", False),
            validated_data,
        )

        instance = super(ContentNodeSerializer, self).create(validated_data)

        if tags:
            set_tags({instance.id: tags})

        self._ensure_complete(instance)

        return instance

    def update(self, instance, validated_data):
        for field in self.dict_fields:
            field_data = validated_data.pop(field, None)
            if field_data is not None:
                validated_data[field] = self.fields[field].update(
                    getattr(instance, field), field_data
                )
        if "tags" in validated_data:
            tags = validated_data.pop("tags")
            set_tags({instance.id: tags})

        self._check_completion_criteria(
            validated_data.get("kind", instance.kind_id),
            validated_data.get("complete", instance.complete),
            validated_data,
        )

        instance = super(ContentNodeSerializer, self).update(instance, validated_data)

        self._ensure_complete(instance)
        return instance


def retrieve_thumbail_src(item):
    """Get either the encoding or the url to use as the <img> src attribute"""
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


def consolidate_extra_fields(item):
    extra_fields = item.get("extra_fields")
    if item["kind"] == content_kinds.EXERCISE:
        extra_fields = migrate_extra_fields(extra_fields)

    return extra_fields


class PrerequisitesUpdateHandler(ValuesViewset):
    values = tuple()
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

        return errors or None

    def create_from_changes(self, changes):
        return self._handle_relationship_changes(changes)

    def delete_from_changes(self, changes):
        return self._handle_relationship_changes(changes)


def dict_if_none(obj, field_name=None):
    return obj[field_name] if field_name in obj and obj[field_name] else {}


class ContentNodePagination(ValuesViewsetCursorPagination):
    """
    A simplified cursor pagination class
    Instead of using a fixed 'lft' cursor, it dynamically sets the pagination field and operator
    based on the incoming `ordering` query parameter.
    """

    page_size_query_param = "max_results"
    max_page_size = 100

    def get_pagination_params(self):
        # Default ordering is "lft" if not provided.
        ordering_param = self.request.query_params.get("ordering", "lft")
        # Remove the leading '-' if present to get the field name.
        pagination_field = ordering_param.lstrip("-")
        # Determine operator: if ordering starts with '-', use __lt; otherwise __gt.
        operator = "__lt" if ordering_param.startswith("-") else "__gt"
        return pagination_field, operator

    def decode_cursor(self, request):
        """
        Given a request with a cursor parameter, return a `Cursor` instance.
        The cursor parameter name is dynamically built from the pagination field and operator.
        """
        pagination_field, operator = self.get_pagination_params()
        cursor_param = f"{pagination_field}{operator}"
        value = request.query_params.get(cursor_param)
        if value is None:
            return None

        if pagination_field == "lft":
            try:
                value = int(value)
            except ValueError:
                raise ValidationError(
                    "lft must be an integer but an invalid value was given."
                )

        return Cursor(offset=0, reverse=False, position=value)

    def encode_cursor(self, cursor):
        """
        Given a Cursor instance, return a URL with the dynamic pagination cursor query parameter.
        """
        pagination_field, operator = self.get_pagination_params()
        cursor_param = f"{pagination_field}{operator}"
        return replace_query_param(self.base_url, cursor_param, str(cursor.position))

    def get_more(self):
        """
        Construct a "more" URL (or query parameters) that includes the pagination cursor
        built from the dynamic field and operator.
        """
        pagination_field, operator = self.get_pagination_params()
        cursor_param = f"{pagination_field}{operator}"
        position, offset = self._get_more_position_offset()
        if position is None and offset is None:
            return None
        params = self.request.query_params.copy()
        params.update({cursor_param: position})
        return params


# Apply mixin first to override ValuesViewset
class ContentNodeViewSet(BulkUpdateMixin, ValuesViewset):
    queryset = ContentNode.objects.all()
    serializer_class = ContentNodeSerializer
    permission_classes = [IsAuthenticated]
    filterset_class = ContentNodeFilter
    pagination_class = ContentNodePagination
    # This must exactly match the ordering on the pagination class defined above.
    ordering = ["lft"]
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
        "suggested_duration",
    )

    field_map = {
        "language": "language_id",
        "license": "license_id",
        "tags": "content_tags",
        "kind": "kind__kind",
        "thumbnail_src": retrieve_thumbail_src,
        "parent": "parent_id",
        "grade_levels": partial(dict_if_none, field_name="grade_levels"),
        "resource_types": partial(dict_if_none, field_name="resource_types"),
        "learning_activities": partial(dict_if_none, field_name="learning_activities"),
        "accessibility_labels": partial(
            dict_if_none, field_name="accessibility_labels"
        ),
        "categories": partial(dict_if_none, field_name="categories"),
        "learner_needs": partial(dict_if_none, field_name="learner_needs"),
        "extra_fields": consolidate_extra_fields,
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
                ContentNode.filter_by_pk(pk=pk).values_list("tree_id", flat=True)[:1],
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
            # fetch_or_enqueue to ensure a task is queued, as well as return info about it
            task_args = dict(node_id=node.pk, channel_id=node.channel_id)
            calculate_resource_size_task.fetch_or_enqueue(
                self.request.user, **task_args
            )

        return Response(
            {
                "size": size,
                "stale": stale,
            }
        )

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
                descendant_resources.filter(role_visibility=roles.COACH),
                field="id",
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
        for move in changes:
            # Move change will have key, must also have target property
            # optionally can include the desired position.
            move_error = self.move(
                move["key"], target=move.get("target"), position=move.get("position")
            )
            if move_error:
                move.update({"errors": [move_error]})
                errors.append(move)
        return errors

    def move(self, pk, target=None, position=None):
        try:
            contentnode = self.get_edit_queryset().get(pk=pk)
        except ContentNode.DoesNotExist:
            error = ValidationError("Specified node does not exist")
            return str(error)

        try:
            target, position = self.validate_targeting_args(target, position)

            contentnode.move_to(
                target,
                position,
            )

            return None
        except ValidationError as e:
            return str(e)

    def copy_from_changes(self, changes):
        errors = []
        for copy in changes:
            # Copy change will have key, must also have other attributes, defined in `copy`
            # Just pass as keyword arguments here to let copy do the validation
            try:
                self.copy(copy["key"], **copy)
            except Exception as e:
                log_sync_exception(e, user=self.request.user, change=copy)
                copy["errors"] = [str(e)]
                errors.append(copy)
                failed_copy_node = self.get_queryset().filter(pk=copy["key"]).first()
                if failed_copy_node is not None:
                    failed_copy_node.delete()
        return errors

    def copy(
        self,
        pk,
        from_key=None,
        target=None,
        position=None,
        mods=None,
        excluded_descendants=None,
        **kwargs,
    ):
        target, position = self.validate_targeting_args(target, position)

        try:
            source = self.get_queryset().get(pk=from_key)
        except ContentNode.DoesNotExist:
            raise ValidationError("Copy source node does not exist")

        # Affected channel for the copy is the target's channel
        channel_id = target.channel_id

        if ContentNode.filter_by_pk(pk=pk).exists():
            raise ValidationError("Copy pk already exists")

        can_edit_source_channel = ContentNode.filter_edit_queryset(
            ContentNode.filter_by_pk(pk=source.id), user=self.request.user
        ).exists()

        with create_change_tracker(
            pk, CONTENTNODE, channel_id, self.request.user, "copy_nodes"
        ) as progress_tracker:
            new_node = source.copy_to(
                target,
                position,
                pk,
                mods,
                excluded_descendants,
                can_edit_source_channel=can_edit_source_channel,
                progress_tracker=progress_tracker,
            )

            Change.create_change(
                generate_update_event(
                    pk,
                    CONTENTNODE,
                    {
                        COPYING_STATUS: COPYING_STATUS_VALUES.SUCCESS,
                        "node_id": new_node.node_id,
                    },
                    channel_id=channel_id,
                ),
                applied=True,
                created_by_id=self.request.user.id,
                # This is not a publishable change, as it is just updating ephemeral status updates.
                unpublishable=True,
            )

    def perform_create(self, serializer, change=None):
        instance = serializer.save()

        # return change to the frontend for updating the `node_id` and `content_id`
        if change is not None:
            Change.create_change(
                generate_update_event(
                    instance.pk,
                    CONTENTNODE,
                    {"node_id": instance.node_id, "content_id": instance.content_id},
                    channel_id=change["channel_id"],
                ),
                created_by_id=change["created_by_id"],
                applied=True,
            )

    def update_descendants(self, pk, mods):
        """Update a node and all of its descendants with the given mods"""
        root = ContentNode.objects.get(id=pk)

        if root.kind_id != content_kinds.TOPIC:
            raise ValidationError("Only topics can have descendants to update")

        descendantsIds = root.get_descendants(include_self=True).values_list(
            "id", flat=True
        )

        changes = [
            {"key": descendantId, "mods": mods} for descendantId in descendantsIds
        ]

        # Bulk update
        return self.update_from_changes(changes)

    def update_descendants_from_changes(self, changes):
        errors = []
        for change in changes:
            try:
                change_errors = self.update_descendants(change["key"], change["mods"])
                errors += change_errors
            except Exception as e:
                log_sync_exception(e, user=self.request.user, change=change)
                change["errors"] = [str(e)]
                errors.append(change)
        return errors
