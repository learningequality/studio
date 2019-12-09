from django.db.models import IntegerField
from django.db.models import Max
from django.db.models import OuterRef
from django.db.models import Prefetch
from django.db.models import Subquery
from django_filters.rest_framework import DjangoFilterBackend
from le_utils.constants import content_kinds
from rest_framework import serializers
from rest_framework.permissions import AllowAny

from contentcuration.models import CatalogItem
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import get_channel_thumbnail
from contentcuration.models import SecretToken
from contentcuration.viewsets.base import ValuesViewset

# class CatalogFilter(FilterSet):
#     ids = CharFilter(method="filter_ids")

#     class Meta:
#         model = CatalogItem
#         fields = ("ids",)

#     def filter_ids(self, queryset, name, value):
#         try:
#             # Limit SQL params to 50 - shouldn't be fetching this many
#             # ids at once
#             return queryset.filter(pk__in=value.split(",")[:50])
#         except ValueError:
#             # Catch in case of a poorly formed UUID
#             return queryset.none()


class CatalogSerializer(serializers.ModelSerializer):

    class Meta:
        model = CatalogItem
        fields = ('__all__')
        read_only_fields = ('id', 'metadata')


class SQCount(Subquery):
    # Include ALIAS at the end to support Postgres
    template = "(SELECT COUNT(%(field)s) FROM (%(subquery)s) AS %(field)s__sum)"
    output_field = IntegerField()


class ChannelSerializer(serializers.ModelSerializer):
    """
    This is a write only serializer - we leverage it to do create and update
    operations, but read operations are handled by the Viewset.
    """

    catalog_item = CatalogSerializer(read_only=True)

    class Meta:
        model = Channel
        fields = (
            "id",
            "name",
            "description",
            "thumbnail",
            "thumbnail_encoding",
            "language",
            "catalog_item",
        )
        read_only_fields = (
            "id",
            "name",
            "description",
            "thumbnail",
            "thumbnail_encoding",
            "language",
            "catalog_item",
        )


class CatalogChannelViewSet(ValuesViewset):
    queryset = Channel.objects.all()
    serializer_class = ChannelSerializer
    filter_backends = (DjangoFilterBackend,)
    # filter_class = ChannelFilter
    permission_classes = [AllowAny]
    values = (
        "id",
        "name",
        "description",
        "main_tree__published",
        "thumbnail",
        "thumbnail_encoding",
        "language",
        "primary_token",
        "modified",
        "count",
        "version",
        "main_tree__created",
        "last_published",
        "main_tree__id"
    )

    field_map = {
        "thumbnail_url": get_channel_thumbnail,
        "published": "main_tree__published",
        "created": "main_tree__created",
        "root_id": "main_tree__id",
    }

    def get_queryset(self):
        queryset = Channel.objects.filter(deleted=False, public=True)

        return self.prefetch_queryset(queryset)

    def prefetch_queryset(self, queryset):
        prefetch_secret_token = Prefetch(
            "secret_tokens", queryset=SecretToken.objects.filter(is_primary=True)
        )
        queryset = queryset.select_related("language", "main_tree").prefetch_related(
            prefetch_secret_token
        )
        return queryset

    def annotate_queryset(self, queryset):
        queryset = queryset.annotate(primary_token=Max("secret_tokens__token"))
        channel_main_tree_nodes = ContentNode.objects.filter(
            tree_id=OuterRef("main_tree__tree_id")
        )
        # Add the last modified node modified value as the channel last modified
        queryset = queryset.annotate(
            modified=Subquery(
                channel_main_tree_nodes.values("modified").order_by("-modified")[:1]
            )
        )
        # Add the unique count of distinct non-topic node content_ids
        non_topic_content_ids = (
            channel_main_tree_nodes.exclude(kind_id=content_kinds.TOPIC)
            .order_by("content_id")
            .distinct("content_id")
            .values_list("content_id", flat=True)
        )
        queryset = queryset.annotate(
            count=SQCount(non_topic_content_ids, field="content_id")
        )
        return queryset
