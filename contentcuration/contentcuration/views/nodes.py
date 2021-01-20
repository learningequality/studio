import json
from datetime import datetime

from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import PermissionDenied
from django.db.models import Max
from django.db.models import Q
from django.db.models import Sum
from django.http import HttpResponse
from django.http import HttpResponseNotFound
from django.shortcuts import get_object_or_404
from le_utils.constants import content_kinds
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.authentication import TokenAuthentication
from rest_framework.decorators import api_view
from rest_framework.decorators import authentication_classes
from rest_framework.decorators import permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from contentcuration.models import ContentNode
from contentcuration.models import Task
from contentcuration.tasks import create_async_task
from contentcuration.tasks import getnodedetails_task
from contentcuration.utils.nodes import get_diff


@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
@api_view(["GET"])
def get_total_size(request, ids):
    # Get the minimal set of nodes that we need to check permissions on first.
    nodes = ContentNode.objects.exclude(
        kind_id=content_kinds.EXERCISE, published=False
    ).filter(id__in=ids.split(","))
    try:
        request.user.can_view_nodes(nodes)
    except PermissionDenied:
        return HttpResponseNotFound("No nodes found for {}".format(ids))
    nodes = (
        nodes.prefetch_related("files")
        .get_descendants(include_self=True)
        .values("files__checksum", "files__file_size")
        .distinct()
    )
    sizes = nodes.aggregate(resource_size=Sum("files__file_size"))

    return Response({"success": True, "size": sizes["resource_size"] or 0})


@api_view(["GET"])
@permission_classes((AllowAny,))
def get_channel_details(request, channel_id):
    """ Generates data for channel contents. Used for look-inside previews
        Keyword arguments:
            channel_id (str): id of channel to get details from
    """
    # Get nodes and channel
    node = get_object_or_404(ContentNode, channel_main=channel_id)
    try:
        if not node.channel_main.filter(public=True).exists():
            request.user.can_view_node(node)
    except PermissionDenied:
        return HttpResponseNotFound("No topic found for {}".format(channel_id))
    data = get_node_details_cached(node, channel_id=channel_id)
    return HttpResponse(json.dumps(data))


@api_view(["GET"])
@permission_classes((AllowAny,))
def get_node_details(request, node_id):
    node = ContentNode.objects.get(pk=node_id)
    channel = node.get_channel()
    if channel and not channel.public:
        return HttpResponseNotFound("No topic found for {}".format(node_id))
    data = get_node_details_cached(node)
    return HttpResponse(json.dumps(data))


def get_node_details_cached(node, channel_id=None):
    cached_data = cache.get("details_{}".format(node.node_id))
    if cached_data:
        descendants = (
            node.get_descendants()
            .prefetch_related("children", "files", "tags")
            .select_related("license", "language")
        )
        channel = node.get_channel()

        # If channel is a sushi chef channel, use date created for faster query
        # Otherwise, find the last time anything was updated in the channel
        last_update = (
            channel.main_tree.created
            if channel and channel.ricecooker_version
            else descendants.filter(changed=True)
            .aggregate(latest_update=Max("modified"))
            .get("latest_update")
        )

        if last_update:
            last_cache_update = datetime.strptime(
                json.loads(cached_data)["last_update"], settings.DATE_TIME_FORMAT
            )
            if last_update.replace(tzinfo=None) > last_cache_update:
                # update the stats async, then return the cached value
                getnodedetails_task.apply_async((node.pk,))
        return json.loads(cached_data)

    return node.get_details(channel_id=channel_id)


@api_view(["GET"])
@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
def get_node_diff(request, updated_id, original_id):
    try:
        # Get queryset to test permissions
        nodes = ContentNode.objects.filter(Q(pk=updated_id) | Q(pk=original_id))
        updated = nodes.filter(pk=updated_id).first()
        original = nodes.filter(pk=original_id).first()
        request.user.can_view_nodes(nodes)

        # Check to see if diff has been generated
        data = get_diff(updated, original)
        if data:
            return Response(data)

        # See if there's already a staging task in progress
        is_generating = Task.objects.filter(
            task_type="get-node-diff",
            metadata__args__updated_id=updated_id,
            metadata__args__original_id=original_id,
        ).exclude(Q(status='FAILURE') | Q(status='SUCCESS')).exists()

        if is_generating:
            return Response('Diff is being generated', status=status.HTTP_302_FOUND)
    except PermissionDenied:
        pass

    return Response('Diff is not available', status=status.HTTP_404_NOT_FOUND)


@api_view(["POST"])
@authentication_classes((TokenAuthentication, SessionAuthentication))
@permission_classes((IsAuthenticated,))
def generate_node_diff(request, updated_id, original_id):
    try:
        # Get queryset to test permissions
        nodes = ContentNode.objects.filter(Q(pk=updated_id) | Q(pk=original_id))
        request.user.can_view_nodes(nodes)

    except PermissionDenied:
        return Response('Diff is not available', status=status.HTTP_403_FORBIDDEN)

    # See if there's already a staging task in progress
    is_generating = Task.objects.filter(
        task_type="get-node-diff",
        metadata__args__updated_id=updated_id,
        metadata__args__original_id=original_id,
    ).exclude(Q(status='FAILURE') | Q(status='SUCCESS')).exists()

    if not is_generating:
        create_async_task("get-node-diff", request.user, updated_id=updated_id, original_id=original_id)
    return Response('Diff is being generated')
