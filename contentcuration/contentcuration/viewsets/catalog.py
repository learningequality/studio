from django.db.models import IntegerField
from django.db.models import Max
from django.db.models import OuterRef
from django.db.models import Prefetch
from django.db.models import Subquery
from django_filters.rest_framework import DjangoFilterBackend
from le_utils.constants import content_kinds
from le_utils.constants import roles
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.viewsets import ModelViewSet

from contentcuration.models import CatalogItem
from contentcuration.models import ContentNode
from contentcuration.models import SecretToken
from contentcuration.serializers import StudioChannelListSerializer


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
    details = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    channel = StudioChannelListSerializer(read_only=True)
    coach_count = serializers.SerializerMethodField()

    def get_details(self, item):
        return item.channel and item.channel.main_tree.get_details()

    def get_thumbnail_url(self, item):
        return item.channel and item.channel.get_thumbnail()

    def get_coach_count(self, item):
        return item.channel and item.channel.main_tree.get_descendants().filter(role_visibility=roles.COACH).count()

    class Meta:
        model = CatalogItem
        fields = ('__all__')
        read_only_fields = ('id', 'channel', 'details', 'thumbnail_url', 'coach_count')


class SQCount(Subquery):
    # Include ALIAS at the end to support Postgres
    template = "(SELECT COUNT(%(field)s) FROM (%(subquery)s) AS %(field)s__sum)"
    output_field = IntegerField()


class CatalogViewSet(ModelViewSet):
    queryset = CatalogItem.objects.all()
    serializer_class = CatalogSerializer
    filter_backends = (DjangoFilterBackend,)
    # filter_class = CatalogFilter
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = CatalogItem.objects.all()
        return self.prefetch_queryset(queryset)

    def prefetch_queryset(self, queryset):
        prefetch_secret_token = Prefetch(
            "channel__secret_tokens", queryset=SecretToken.objects.filter(is_primary=True)
        )
        queryset = queryset.select_related("channel", "channel__language", "channel__main_tree").prefetch_related(
            prefetch_secret_token
        )
        return queryset

    def annotate_queryset(self, queryset):
        queryset = queryset.annotate(primary_token=Max("channel__secret_tokens__token"))
        channel_main_tree_nodes = ContentNode.objects.filter(
            tree_id=OuterRef("channel__main_tree__tree_id")
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
