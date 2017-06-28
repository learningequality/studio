from django.db.models import Q
from contentcuration import models as cc_models
from rest_framework.decorators import api_view
from rest_framework.response import Response
from . import serializers


# def get_editable_tree_ids(user_id):
#     """
#     Returns a list of i
#     """
#     return cc_models.Channel.objects.select_related('main_tree') \
#         .filter(Q(deleted=False) & (Q(public=True) | Q(editors=user_id) | Q(viewers=user_id))) \
#         .values_list('main_tree__tree_id', flat=True)


@api_view(['GET'])
def search_documents(request):
    exclude_channel = request.query_params.get('exclude_channel', '')

    # Get tree_ids for channels accessible to the user
    tree_ids = cc_models.Channel.objects \
        .select_related('main_tree') \
        .filter(Q(deleted=False) & (Q(public=True) | Q(editors=request.user) | Q(viewers=request.user))) \
        .exclude(pk=exclude_channel) \
        .values_list('main_tree__tree_id', flat=True)

    queryset = cc_models.ContentNode.objects \
        .filter(tree_id__in=tree_ids) \
        .exclude(kind='topic')

    search_query = request.query_params.get('q', None)

    if search_query is not None:
        queryset = queryset.filter(title__icontains=search_query)

    serializer = serializers.ContentSearchResultSerializer(queryset, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def search_topics(request):
    queryset = cc_models.ContentNode.objects.filter(kind='topic')
    search_query = request.query_params.get('q', None)
    if search_query is not None:
        queryset = queryset.filter(title__icontains=search_query)

    serializer = serializers.ContentSearchResultSerializer(queryset, many=True)
    return Response(serializer.data)
