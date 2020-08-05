import logging

from django.db.models import Q
from rest_framework.decorators import api_view
from rest_framework.response import Response

from contentcuration import models as cc_models
from contentcuration import serializers


def get_accessible_contentnodes(request):
    exclude_channel = request.query_params.get('exclude_channel', '')

    # Get tree_ids for channels accessible to the user
    tree_ids = cc_models.Channel.objects \
        .select_related('main_tree') \
        .filter(Q(deleted=False) & (Q(public=True) | Q(editors=request.user) | Q(viewers=request.user))) \

    if exclude_channel is not None:
        tree_ids = tree_ids.exclude(pk=exclude_channel)

    tree_ids = tree_ids.values_list('main_tree__tree_id', flat=True)

    return cc_models.ContentNode.objects \
        .filter(tree_id__in=tree_ids)


@api_view(['GET'])
def search_items(request):
    """
    Keyword search of items (i.e. non-topics)
    """
    search_query = request.query_params.get('q', '').strip()

    if search_query == '':
        # TODO maybe return a proper error code
        return Response([])

    queryset = get_accessible_contentnodes(request).exclude(kind='topic')

    filter = Q(title__icontains=search_query)

    # Check if we have a Kolibri URL or a node id or ids and add them to the search if so.
    # Add to, rather than replace, the filters so that we never misinterpret a search term as a UUID.
    try:
        if len(search_query) >= 32:  # 32 is UUID length
            node_ids = search_query.split(',')

            if len(node_ids) > 0:
                for node_id in node_ids:
                    # check for the major ID types
                    filter |= Q(node_id=node_id)
                    filter |= Q(content_id=node_id)
                    filter |= Q(id=node_id)

    except Exception as e:
        # if we fail, just continue and try a regular search
        logging.warning("failed parsing possible URL or ID(s): {}".format(e))

    queryset = queryset.filter(filter)
    # Using same serializer as Tree View UI to match props of ImportListItem
    serializer = serializers.SimplifiedContentNodeSerializer(queryset[:50], many=True)
    return Response(serializer.data)


@api_view(['GET'])
def search_topics(request):
    """
    Keyword search of topics
    """
    search_query = request.query_params.get('q', '').strip()

    if search_query == '':
        return Response([])

    queryset = get_accessible_contentnodes(request).filter(kind='topic')
    queryset = queryset.filter(title__icontains=search_query)
    serializer = serializers.SimplifiedContentNodeSerializer(queryset[:50], many=True)
    return Response(serializer.data)
