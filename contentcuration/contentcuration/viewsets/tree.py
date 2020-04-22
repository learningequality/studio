import uuid

from django.db import transaction
from django.db.models import CharField
from django.db.models.functions import Coalesce
from django.db.models.sql.constants import LOUTER
from django.shortcuts import get_object_or_404
from django_cte import With
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from rest_framework.response import Response
from rest_framework.serializers import ValidationError
from rest_framework.viewsets import GenericViewSet

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.viewsets.common import MissingRequiredParamsException
from contentcuration.viewsets.sync.constants import CONTENTNODE
from contentcuration.viewsets.sync.constants import DELETED
from contentcuration.viewsets.sync.constants import TREE
from contentcuration.viewsets.sync.constants import UPDATED


_valid_positions = {"first-child", "last-child", "left", "right"}


class TreeFilter(FilterSet):
    class Meta:
        model = ContentNode
        fields = ("id", "parent",)


def validate_targeting_args(target, position):
    if target is None:
        raise ValidationError("A target content node must be specified")
    try:
        target = ContentNode.objects.get(pk=target)
    except ContentNode.DoesNotExist:
        raise ValidationError("Target content node: {} does not exist".format(target))
    except ValueError:
        raise ValidationError(
            "Invalid target content node specified: {}".format(target)
        )
    if position not in _valid_positions:
        raise ValidationError(
            "Invalid node position specified, must be one of {}".format(
                ", ".join(_valid_positions)
            )
        )
    return target, position


def map_sort_order(item):
    return item.pop("lft")


def map_source_id(item):
    return item.pop("real_source_id")


def map_channel_id(item):
    return item.pop("source_channel_id", item.pop("original_channel_id", None))


class Mapper(object):
    def __init__(self, field_map, channel_id=None, tree_id=None):
        self.field_map = field_map
        self.channel_id = channel_id
        self.tree_id = tree_id

    def __call__(self, item):
        item.update({
            key: mapping(item)
            for key, mapping in self.field_map.items()
        })

        item["channel_id"] = self.channel_id or item["channel_id"]
        item["tree_id"] = self.tree_id
        return item


class TreeViewSet(GenericViewSet):
    filter_backends = (DjangoFilterBackend,)
    filter_class = TreeFilter
    values = (
        "id",
        "tree_id",
        "real_source_id",
        "source_channel_id",
        "original_channel_id",
        "parent",
        "level",
        "lft",
    )

    field_map = {
        "sort_order": map_sort_order,
        "source_id": map_source_id,
        "channel_id": map_channel_id
    }

    def add_source_cte(self, queryset, field):
        cte = With(
            ContentNode.objects.filter(node_id__in=queryset.values(field)).values("id", "node_id"),
            name='{}_cte'.format(field)
        )

        queryset = cte.join(queryset, _join_type=LOUTER, **{field: cte.col.node_id})\
            .with_cte(cte)
        return queryset, cte

    def filter_queryset(self, queryset):
        queryset, source_node_cte = self.add_source_cte(queryset, "source_node_id")
        queryset, original_node_cte = self.add_source_cte(queryset, "original_source_node_id")

        real_source_id = Coalesce(source_node_cte.col.id, original_node_cte.col.id,
                                  output_field=CharField())
        return queryset.annotate(real_source_id=real_source_id)

    @classmethod
    def id_attr(cls):
        return None

    def list(self, request, *args, **kwargs):
        channel_id = request.query_params.get("channel_id")
        tree_id = request.query_params.get("tree_id")

        if channel_id is None and tree_id is None:
            raise MissingRequiredParamsException(
                "tree_id or channel_id query parameter is required but was missing from the request"
            )

        root_filter = dict()
        if channel_id is not None:
            root_filter.update(channel_main=channel_id)
        else:
            root_filter.update(pk=tree_id)

        root = get_object_or_404(ContentNode, **root_filter)

        if tree_id is None:
            tree_id = root.pk

        map_data = Mapper(self.field_map, channel_id=channel_id, tree_id=tree_id)
        queryset = self.filter_queryset(root.get_descendants(include_self=True))
        tree = map(map_data, queryset.values(*self.values))
        return Response(tree)

    def map_model(self, node):
        tree_id = node.get_root_id()
        channel_id = Channel.objects.filter(main_tree_id=tree_id)\
            .values_list("pk", flat=True)\
            .first()

        mapper = Mapper(self.field_map, channel_id=channel_id, tree_id=tree_id)
        queryset = self.filter_queryset(ContentNode.objects.filter(pk=node.pk))
        return next(map(mapper, queryset.values(*self.values)))

    def move(self, pk, target=None, position="first-child", **kwargs):
        try:
            contentnode = ContentNode.objects.get(pk=pk)
        except ContentNode.DoesNotExist:
            error = ValidationError("Specified node does not exist")
            return str(error), None

        try:
            target, position = validate_targeting_args(target, position)
            try:
                contentnode.move_to(target, position)
            except ValueError:
                raise ValidationError(
                    "Invalid position argument specified: {}".format(position)
                )

            contentnode.refresh_from_db()
            return None, dict(
                key=pk,
                table=TREE,
                type=UPDATED,
                mods=self.map_model(contentnode)
            )
        except ValidationError as e:
            return str(e), None

    def copy(self, pk, user=None, from_key=None, **mods):
        """
        Creates a minimal copy, primarily for the clipboard
        """
        target = mods.pop("target")
        position = mods.pop("position")
        sort_order = mods.pop("sort_order")
        channel_id = mods.pop("channel_id")

        delete_response = [
            dict(
                key=pk,
                table=TREE,
                type=DELETED,
            ),
            dict(
                key=pk,
                table=CONTENTNODE,
                type=DELETED,
            ),
        ]

        try:
            target, position = validate_targeting_args(target, position)
        except ValidationError as e:
            return str(e), None

        try:
            source = ContentNode.objects.get(pk=from_key)
        except ContentNode.DoesNotExist:
            error = ValidationError("Copy source node does not exist")
            return str(error), delete_response

        if ContentNode.objects.filter(pk=pk).exists():
            error = ValidationError("Copy pk already exists")
            return str(error), None

        with transaction.atomic():
            # Lock only MPTT columns for updates on this tree and the target tree
            # until the end of this transaction
            ContentNode.objects.select_for_update().order_by() \
                .filter(tree_id=target.tree_id).values("tree_id", "lft", "rght")

            # create a very basic copy
            new_node = ContentNode(
                content_id=source.content_id,
                kind=source.kind,
                title=source.title,
                description=source.description,
                sort_order=sort_order,
                cloned_source=source,
                source_channel_id=channel_id,
                node_id=uuid.uuid4().hex,
                source_node_id=source.node_id,
                freeze_authoring_data=True,
                changed=True,
                published=False,
            )
            new_node.id = pk

            # There might be some legacy nodes that don't have these, so ensure they are added
            if not new_node.original_channel_id or not new_node.original_source_node_id:
                original_node = source.get_original_node()
                original_channel = original_node.get_channel()
                new_node.original_channel_id = original_channel.id if original_channel else None
                new_node.original_source_node_id = original_node.node_id

            new_node.insert_at(target, position, save=False, allow_existing_pk=True)
            new_node.save(force_insert=True)
            new_node.refresh_from_db()

            return None, [
                dict(
                    key=pk,
                    table=TREE,
                    type=UPDATED,
                    mods=self.map_model(new_node)
                ),
            ]
