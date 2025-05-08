import json
from datetime import datetime

from django.conf import settings
from django.core.cache import cache
from django.db.models import Max
from django.http import Http404
from django.http import HttpResponse
from django.http import HttpResponseNotFound
from django.shortcuts import get_object_or_404
from django_cte import With
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view
from rest_framework.decorators import authentication_classes
from rest_framework.decorators import permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.tasks import generatenodediff_task
from contentcuration.tasks import getnodedetails_task
from contentcuration.utils.nodes import get_diff


@api_view(["GET"])
@permission_classes((AllowAny,))
def get_channel_details(request, channel_id):
    """Generates data for channel contents. Used for look-inside previews
    Keyword arguments:
        channel_id (str): id of channel to get details from
    """
    # Get nodes and channel
    channel = get_object_or_404(
        Channel.filter_view_queryset(Channel.objects.all(), request.user), id=channel_id
    )
    if not channel.main_tree:
        raise Http404
    data = get_node_details_cached(request.user, channel.main_tree, channel)
    return HttpResponse(json.dumps(data))


@api_view(["GET"])
@permission_classes((AllowAny,))
def get_node_details(request, node_id):
    node = ContentNode.objects.get(pk=node_id)
    channel = node.get_channel()
    if channel and not channel.public:
        return HttpResponseNotFound("No topic found for {}".format(node_id))
    data = get_node_details_cached(request.user, node, channel)
    return HttpResponse(json.dumps(data))


def get_node_details_cached(user, node, channel):
    cached_data = cache.get("details_{}".format(node.node_id))

    if cached_data:
        # If channel is a sushi chef channel, use date created for faster query
        # Otherwise, find the last time anything was updated in the channel
        if channel and channel.ricecooker_version:
            last_update = channel.main_tree.created
        else:
            # The query should never span across multiple trees, so we can filter by tree_id first.
            # Since the tree_id is indexed, this should be a fast query, and perfect candidate
            # for the CTE select query.
            cte = With(
                ContentNode.objects.filter(tree_id=node.tree_id)
                .values(
                    "id", "modified", "changed", "tree_id", "parent_id", "lft", "rght"
                )
                .order_by()
            )
            last_update_qs = cte.queryset().with_cte(cte).filter(changed=True)

            # If the node is not the root node, the intent is to calculate node details for the
            # descendants of this node
            if node.parent_id is not None:
                # See MPTTModel.get_descendants for details on the lft/rght query
                last_update_qs = last_update_qs.filter(
                    lft__gte=node.lft + 1, rght__lte=node.rght - 1
                )
            else:
                # Maintain that query should not 'include_self'
                last_update_qs = last_update_qs.filter(parent_id__isnull=False)

            last_update = last_update_qs.aggregate(latest_update=Max("modified")).get(
                "latest_update"
            )

        if last_update:
            last_cache_update = datetime.strptime(
                json.loads(cached_data)["last_update"], settings.DATE_TIME_FORMAT
            )
            if (
                not user.is_anonymous
                and last_update.replace(tzinfo=None) > last_cache_update
            ):
                # update the stats async, then return the cached value
                getnodedetails_task.enqueue(user, node_id=node.pk)
        return json.loads(cached_data)

    return node.get_details(channel=channel)


@api_view(["GET"])
@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
def get_node_diff(request, updated_id, original_id):
    try:
        # Get queryset to test permissions
        nodes = ContentNode.filter_view_queryset(
            ContentNode.objects.all(), request.user
        )
        updated = nodes.get(pk=updated_id)
        original = nodes.get(pk=original_id)

        # Check to see if diff has been generated
        data = get_diff(updated, original)
        if data:
            return Response(data)

        signature = generatenodediff_task.generate_signature(
            dict(updated_id=updated_id, original_id=original_id)
        )
        # See if there's already a staging task in progress
        if generatenodediff_task.find_incomplete_ids(signature).exists():
            return Response("Diff is being generated", status=status.HTTP_302_FOUND)
    except ContentNode.DoesNotExist:
        pass

    return Response("Diff is not available", status=status.HTTP_404_NOT_FOUND)


@api_view(["POST"])
@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
def generate_node_diff(request, updated_id, original_id):
    try:
        # Get queryset to test permissions
        nodes = ContentNode.filter_view_queryset(
            ContentNode.objects.all(), request.user
        ).values("id")
        nodes.get(pk=updated_id)
        nodes.get(pk=original_id)

    except ContentNode.DoesNotExist:
        return Response("Diff is not available", status=status.HTTP_403_FORBIDDEN)

    # See if there's already a staging task in progress
    generatenodediff_task.fetch_or_enqueue(
        request.user, updated_id=updated_id, original_id=original_id
    )
    return Response("Diff is being generated")
