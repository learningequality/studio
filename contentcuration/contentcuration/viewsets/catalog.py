from django.db.models import IntegerField
from django.db.models import Max
from django.db.models import OuterRef
from django.db.models import Prefetch
from django.db.models import Q
from django.db.models import Subquery
from django_filters.rest_framework import DjangoFilterBackend
from le_utils.constants import content_kinds
from le_utils.constants import roles
from rest_framework import serializers
from rest_framework.filters import SearchFilter
from rest_framework.mixins import ListModelMixin
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from contentcuration.models import CatalogItem
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import get_channel_thumbnail
from contentcuration.models import SecretToken


DEFAULT_PAGE_SIZE = 25


class CatalogChannelListPagination(PageNumberPagination):
    page_size = DEFAULT_PAGE_SIZE
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'links': {
                'next': self.get_next_link(),
                'previous': self.get_previous_link()
            },
            'page_number': self.page.number,
            'count': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'results': data
        })


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
    published = serializers.SerializerMethodField()
    created = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    count = serializers.SerializerMethodField()
    root_id = serializers.SerializerMethodField()
    modified = serializers.SerializerMethodField()
    primary_token = serializers.SerializerMethodField()
    download_count = serializers.SerializerMethodField()

    def get_published(self, channel):
        return channel.main_tree.published

    def get_thumbnail_url(self, channel):
        return get_channel_thumbnail(channel)

    def get_created(self, channel):
        return channel.main_tree.created

    def get_modified(self, channel):
        return channel.modified

    def get_count(self, channel):
        return channel.count

    def get_root_id(self, channel):
        return channel.main_tree.id

    def get_primary_token(self, channel):
        return channel.primary_token

    def get_download_count(self, channel):
        return channel.download_count

    class Meta:
        model = Channel
        fields = (
            "id",
            "name",
            "description",
            "language",
            "version",
            "published",
            "created",
            "modified",
            "thumbnail_url",
            "count",
            "root_id",
            "last_published",
            "primary_token",
            "download_count",
            "catalog_item",
        )
        read_only_fields = (
            "id",
            "name",
            "description",
            "version",
            "language",
            "published",
            "created",
            "modified",
            "thumbnail_url",
            "count",
            "root_id",
            "last_published",
            "primary_token",
            "download_count",
            "catalog_item",
        )


def get_catalog_queryset():
    queryset = Channel.objects.filter(deleted=False, public=True)
    active_tree_ids = Channel.objects.filter(deleted=False).values_list('main_tree__tree_id', flat=True)
    prefetch_secret_token = Prefetch(
        "secret_tokens", queryset=SecretToken.objects.filter(is_primary=True)
    )
    queryset = queryset.select_related("language", "main_tree").prefetch_related(
        prefetch_secret_token
    )
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

    imports = (
        ContentNode.objects.filter(tree_id__in=active_tree_ids, original_channel_id=OuterRef('pk'))
        .exclude(tree_id=OuterRef("main_tree__tree_id"))
        .values('tree_id')
        .distinct("tree_id")
    )
    queryset = queryset.annotate(
        download_count=SQCount(imports, field="tree_id")
    )
    return queryset.order_by('-priority', 'name')


class CatalogChannelViewSet(ListModelMixin, GenericViewSet):
    queryset = Channel.objects.all()
    serializer_class = ChannelSerializer
    filter_backends = (DjangoFilterBackend, SearchFilter)
    pagination_class = CatalogChannelListPagination
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
        queryset = get_catalog_queryset()
        channel_main_tree_nodes = ContentNode.objects.filter(
            tree_id=OuterRef("main_tree__tree_id")
        )

        # Keyword search
        if self.request.GET.get('keywords'):
            keywords = self.request.GET['keywords']
            keywords_query = (
                channel_main_tree_nodes.filter(
                    Q(tags__tag_name__icontains=keywords) |
                    Q(author__icontains=keywords) |
                    Q(aggregator__icontains=keywords) |
                    Q(provider__icontains=keywords)
                )
            )
            queryset = queryset.annotate(
                keyword_match_count=SQCount(keywords_query, field="content_id")
            ).filter(
                Q(name__icontains=keywords) | Q(description__icontains=keywords) |
                Q(pk__istartswith=keywords) | Q(primary_token=keywords.replace('-', '')) |
                Q(keyword_match_count__gt=0)
            )

        # Language
        if self.request.GET.get('language'):
            language = self.request.GET['language']
            language_query = (
                channel_main_tree_nodes.filter(language_id=language)
                .values("content_id").distinct()
            )
            queryset = queryset.annotate(
                language_count=SQCount(language_query, field="content_id")
            ).filter(Q(language_id=language) | Q(language_count__gt=0))

        # License
        if self.request.GET.get('licenses'):
            licenses = [int(l) for l in self.request.GET['licenses'].split(',')]
            license_query = (
                channel_main_tree_nodes.filter(license_id__in=licenses)
                .values("content_id").distinct()
            )
            queryset = queryset.annotate(
                license_count=SQCount(license_query, field="content_id")
            ).exclude(license_count=0)

        # Formats
        if self.request.GET.get('kinds'):
            kinds = self.request.GET['kinds'].split(',')
            kinds_query = (
                channel_main_tree_nodes.filter(kind_id__in=kinds)
                .values("content_id").distinct()
            )
            queryset = queryset.annotate(
                kind_match_count=SQCount(kinds_query, field="content_id")
            ).exclude(kind_match_count=0)

        # Includes coach content
        if self.request.GET.get('coach'):
            coach_query = (
                channel_main_tree_nodes.filter(role_visibility=roles.COACH)
            )
            queryset = queryset.annotate(
                coach_count=SQCount(coach_query, field="content_id")
            ).exclude(coach_count=0)

        # Includes exercises
        if self.request.GET.get('assessments'):
            assessment_query = (
                channel_main_tree_nodes.filter(kind_id=content_kinds.EXERCISE)
            )
            queryset = queryset.annotate(
                assessment_count=SQCount(assessment_query, field="content_id")
            ).exclude(assessment_count=0)

        # Includes subtitles
        if self.request.GET.get('subtitles'):
            subtitle_query = (
                channel_main_tree_nodes.filter(files__preset__subtitle=True)
            )
            queryset = queryset.annotate(
                subtitle_count=SQCount(subtitle_query, field="content_id")
            ).exclude(subtitle_count=0)

        return queryset
