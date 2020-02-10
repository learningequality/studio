from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework.serializers import ValidationError

from contentcuration.models import ContentNode


class MissingRequiredParamsException(APIException):
    status_code = 412
    default_detail = "Required query parameters were missing from the request"
    default_code = "missing_parameters"


_valid_positions = set(["first-child", "last-child", "left", "right"])


class TreeFilter(FilterSet):
    class Meta:
        model = ContentNode
        fields = ("parent",)


def validate_move_args(target, position):
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


class TreeViewSet(GenericViewSet):
    filter_backends = (DjangoFilterBackend,)
    filter_class = TreeFilter
    values = (
        "id",
        "tree_id",
        "lft",
        "parent",
    )

    field_map = {
        "sort_order": "lft",
    }

    @classmethod
    def id_attr(cls):
        return None

    def list(self, request, *args, **kwargs):
        channel_id = request.query_params.get("channel_id")
        if channel_id is None:
            raise MissingRequiredParamsException(
                "channel_id query parameter is required but was missing from the request"
            )
        root = get_object_or_404(ContentNode, channel_main=channel_id)

        def map_data(item):
            item["sort_order"] = item.pop("lft")
            item["channel_id"] = channel_id
            return item

        queryset = self.filter_queryset(root.get_descendants())
        tree = map(map_data, queryset.values(*self.values))
        return Response(tree)

    def move(self, pk, *args, **kwargs):
        try:
            contentnode = ContentNode.objects.get(pk=pk)
        except ContentNode.DoesNotExist:
            error = ValidationError("Specified node does not exist")
            return str(error), None
        target = kwargs.pop("target", None)
        position = kwargs.pop("position", "first-child")
        try:
            target, position = validate_move_args(target, position)
            try:
                original_parent_id = contentnode.parent_id
                with transaction.atomic():
                    # Lock only MPTT columns for updates on this tree and the target tree
                    # until the end of this transaction
                    ContentNode.objects.select_for_update().order_by().filter(
                        Q(tree_id=contentnode.tree_id) | Q(tree_id=target.tree_id)
                    ).values("tree_id", "lft", "rght")
                    contentnode.changed = True
                    contentnode.move_to(target, position)
                new_parent_id = (
                    ContentNode.objects.all()
                    .values_list("parent_id", flat=True)
                    .get(id=contentnode.id)
                )
                if original_parent_id != new_parent_id:
                    ContentNode.objects.filter(id=original_parent_id).update(
                        changed=True
                    )

            except ValueError:
                raise ValidationError(
                    "Invalid position argument specified: {}".format(position)
                )
            return None, None
        except ValidationError as e:
            return str(e), None
