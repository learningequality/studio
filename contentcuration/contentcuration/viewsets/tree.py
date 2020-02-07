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


_valid_positions = set(["first-child", "last-child", "left", "right",])


class TreeFilter(FilterSet):
    class Meta:
        model = ContentNode
        fields = ("parent",)


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
        contentnode = get_object_or_404(ContentNode, pk=pk)
        target = kwargs.pop("target", None)
        try:
            if target is None:
                raise ValidationError("A target content node must be specified")
            try:
                target = ContentNode.get(pk=target)
            except ContentNode.DoesNotExist:
                raise ValidationError(
                    "Target content node: {} does not exist".format(target)
                )
            except ValueError:
                raise ValidationError(
                    "Invalid target content node specified: {}".format(target)
                )
            position = kwargs.pop("position", "first-child")
            if position not in _valid_positions:
                raise ValidationError(
                    "Invalid node position specified, must be one of {}".format(
                        ", ".join(_valid_positions)
                    )
                )
            try:
                with transaction.atomic():
                    # Lock only MPTT columns for updates on this tree and the target tree
                    # until the end of this transaction
                    ContentNode.objects.select_for_update().order_by().filter(
                        Q(tree_id=contentnode.tree_id) | Q(tree_id=target.tree_id)
                    ).values("tree_id", "lft", "rght")
                    contentnode.move_to(target, position)

            except ValueError:
                raise ValidationError(
                    "Invalid position argument specified: {}".format(position)
                )
            return None, None
        except ValidationError as e:
            return None, str(e)
