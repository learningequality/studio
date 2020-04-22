from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from rest_framework.response import Response
from rest_framework.serializers import ValidationError
from rest_framework.viewsets import GenericViewSet

from contentcuration.models import ContentNode
from contentcuration.viewsets.common import MissingRequiredParamsException

_valid_positions = set(["first-child", "last-child", "left", "right"])


class TreeFilter(FilterSet):
    class Meta:
        model = ContentNode
        fields = {
            'parent': ['exact'],
            'lft': ['gt', 'gte', 'lt', 'lte'],
            'rght': ['gt', 'gte', 'lt', 'lte'],
        }


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
        "rght",
        "parent",
    )

    @classmethod
    def id_attr(cls):
        return None

    def list(self, request, *args, **kwargs):
        channel_id = request.query_params.get("channel_id")
        if channel_id is None:
            raise MissingRequiredParamsException(
                "channel_id query parameter is required but was missing from the request"
            )
        if request.query_params.get("trash"):
            root = get_object_or_404(ContentNode, channel_trash=channel_id)
        else:
            root = get_object_or_404(ContentNode, channel_main=channel_id)

        def map_data(item):
            item["channel_id"] = channel_id
            return item

        queryset = self.filter_queryset(root.get_descendants(include_self=True))
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
                contentnode.move_to(target, position)
            except ValueError:
                raise ValidationError(
                    "Invalid position argument specified: {}".format(position)
                )
            return None, None
        except ValidationError as e:
            return str(e), None
