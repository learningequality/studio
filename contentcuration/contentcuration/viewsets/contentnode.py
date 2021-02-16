import json
from functools import reduce

from django.conf import settings
from django.db import IntegrityError
from django.db.models import Exists
from django.db.models import F
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django.db.models.functions import Coalesce
from django.http import Http404
from django.utils.timezone import now
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import UUIDFilter
from le_utils.constants import content_kinds
from le_utils.constants import exercises
from le_utils.constants import roles
from rest_framework.decorators import detail_route
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.serializers import ChoiceField
from rest_framework.serializers import BooleanField
from rest_framework.serializers import DictField
from rest_framework.serializers import IntegerField
from rest_framework.serializers import ValidationError
from rest_framework.viewsets import ViewSet

from contentcuration.models import AssessmentItem
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import ContentTag
from contentcuration.models import File
from contentcuration.models import generate_storage_url
from contentcuration.models import PrerequisiteContentRelationship
from contentcuration.tasks import create_async_task
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import BulkUpdateMixin
from contentcuration.viewsets.base import RequiredFilterSet
from contentcuration.viewsets.base import ValuesViewset
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


def bulk_create_tag_relations(tags_relations_to_create):
    if tags_relations_to_create:
        # In Django 2.2 add ignore_conflicts to make this fool proof
        try:
            ContentNode.tags.through.objects.bulk_create(tags_relations_to_create)
        except IntegrityError:
            # One of the relations already exists, so just save them one by one.
            # Django's default upsert behaviour should mean we get no errors this way
            for to_create in tags_relations_to_create:
                to_create.save()


def set_tags(tags_by_id):
    all_tag_names = set()
    tags_relations_to_create = []
    tags_relations_to_delete = []
    for target_node_id, tag_names in tags_by_id.items():
        for tag_name, value in tag_names.items():
            if value:
                all_tag_names.add(tag_name)

    # channel is no longer used on the tag object, so don't bother using it
    available_tags = set(
        ContentTag.objects.filter(
            tag_name__in=all_tag_names, channel__isnull=True
        ).values_list("tag_name", flat=True)
    )

    tags_to_create = all_tag_names.difference(available_tags)

    new_tags = [ContentTag(tag_name=tag_name) for tag_name in tags_to_create]
    ContentTag.objects.bulk_create(new_tags)

    tag_id_by_tag_name = {
        t["tag_name"]: t["id"]
        for t in ContentTag.objects.filter(
            tag_name__in=all_tag_names, channel__isnull=True
        ).values("tag_name", "id")
    }

    for target_node_id, tag_names in tags_by_id.items():
        for tag_name, value in tag_names.items():
            if value:
                tag_id = tag_id_by_tag_name[tag_name]
                tags_relations_to_create.append(
                    ContentNode.tags.through(
                        contentnode_id=target_node_id, contenttag_id=tag_id
                    )
                )
            else:
                tags_relations_to_delete.append(
                    Q(contentnode_id=target_node_id, contenttag__tag_name=tag_name)
                )
    bulk_create_tag_relations(tags_relations_to_create)
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


class ExtraFieldsSerializer(JSONFieldDictSerializer):
    mastery_model = ChoiceField(
        choices=exercises.MASTERY_MODELS, allow_null=True, required=False
    )
    randomize = BooleanField()
    m = IntegerField(allow_null=True, required=False)
    n = IntegerField(allow_null=True, required=False)


class TagField(DotPathValueMixin, DictField):
    pass


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
        )
        list_serializer_class = ContentNodeListSerializer
        nested_writes = True

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


# Apply mixin first to override ValuesViewset
class ContentNodeViewSet(BulkUpdateMixin, ValuesViewset):
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
    )

    field_map = {
        "language": "language_id",
        "license": "license_id",
        "tags": "content_tags",
        "kind": "kind__kind",
        "thumbnail_src": retrieve_thumbail_src,
        "title": get_title,
        "parent": "parent_id",
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

    @detail_route(methods=["get"])
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
            target_node__tree_id=ContentNode.objects.filter(pk=pk).values_list(
                "tree_id", flat=True
            )[:1]
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
            Subquery(Channel.objects.filter(pk=OuterRef("original_channel_id")).values("name")[:1]),
            Subquery(Channel.objects.filter(main_tree__tree_id=OuterRef("tree_id")).values("name")[:1]),
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
            original_node_id=Subquery(original_node.values("pk")[:1]),
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
