## Original search imports
from django.db.models import Q
from contentcuration import models as cc_models
from rest_framework.decorators import api_view
from rest_framework.response import Response
from contentcuration import serializers

from contentcuration.models import ContentNode
from contentcuration.serializers import ContentNodeSerializer

##  haystack/elasticsearch related imports
from .search_indexes import ContentNodeIndex
from drf_haystack.serializers import HaystackSerializer, HaystackFacetSerializer, HaystackSerializerMixin
from drf_haystack.mixins import FacetMixin
from drf_haystack.viewsets import HaystackViewSet
from contentcuration.models import ContentNode
from .search_indexes import ContentNodeIndex
from contentcuration.serializers import ContentNodeSerializer

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

from rest_framework.pagination import PageNumberPagination
class Paginator(PageNumberPagination):
    page_size = 1
    page_size_query_param = 'page_size'
    max_page_size = 1000

class SimpleContentNodeResultSerializer(HaystackSerializerMixin, FacetMixin, serializers.SimplifiedContentNodeSerializer):
    serialize_objects = True

    class Meta(serializers.SimplifiedContentNodeSerializer.Meta):
        # The `index_classes` attribute is a list of which search indexes
        # we want to include in the search.
        # index_classes = [ContentNodeIndex]

        # The `fields` contains all the fields we want to include.
        # NOTE: Make sure you don't confuse these with model attributes. These
        # fields belong to the search index!
        search_fields = [
            "title", "description", "language", "content_kind", "channel_name", "channel_pk", "pk", "in_channel_tree"
        ]

        field_options = {
            "in_channel_tree": "main_tree"
        }

class ContentNodeResultSerializer(HaystackSerializer):
    serialize_objects = True

    class Meta:
        # The `index_classes` attribute is a list of which search indexes
        # we want to include in the search.
        index_classes = [ContentNodeIndex]

        # The `fields` contains all the fields we want to include.
        # NOTE: Make sure you don't confuse these with model attributes. These
        # fields belong to the search index!
        search_fields = [
            "title", "description", "language", "content_kind", "channel_pk", "channel_name", "pk", "in_channel_tree"
        ]

        # TODO: figure out how to pre-filter results using faceting
        field_options = {
            "in_channel_tree": "main_tree"
        }



class ContentNodeSearchView(HaystackViewSet):

    # `index_models` is an optional list of which models you would like to include
    # in the search result. You might have several models indexed, and this provides
    # a way to filter out those of no interest for this particular view.
    # (Translates to `SearchQuerySet().models(*index_models)` behind the scenes.
    index_models = [ContentNode]

    serializer_class = ContentNodeResultSerializer
