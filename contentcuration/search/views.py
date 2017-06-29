from django.db.models import Q
from contentcuration import models as cc_models
from rest_framework.decorators import api_view
from rest_framework.response import Response
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
    queryset = get_accessible_contentnodes(request).exclude(kind='topic')
    search_query = request.query_params.get('q', None)
    if search_query is not None:
        queryset = queryset.filter(title__icontains=search_query)
    # Using same serializer as Tree View UI to match props of ImportListItem
    serializer = serializers.SimplifiedContentNodeSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def search_topics(request):
    """
    Keyword search of topics
    """
    queryset = get_accessible_contentnodes(request).filter(kind='topic')
    search_query = request.query_params.get('q', None)
    if search_query is not None:
        queryset = queryset.filter(title__icontains=search_query)
    serializer = serializers.SimplifiedContentNodeSerializer(queryset, many=True)
    return Response(serializer.data)
