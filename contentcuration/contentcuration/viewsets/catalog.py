from django.db.models import BooleanField
from django.db.models import IntegerField
from django.db.models import Max
from django.db.models import OuterRef
from django.db.models import Prefetch
from django.db.models import Q
from django.db.models import Subquery
from django.db.models.functions import Cast
from django_filters.rest_framework import BooleanFilter
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from le_utils.constants import content_kinds
from le_utils.constants import roles
from rest_framework import serializers
from rest_framework.filters import SearchFilter
from rest_framework.mixins import ListModelMixin
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import get_channel_thumbnail
from contentcuration.models import SecretToken
from contentcuration.models import User


DEFAULT_PAGE_SIZE = 25


class ChannelFilter(FilterSet):
    keywords = CharFilter(method="filter_keywords")
    language = CharFilter(method="filter_language")
    licenses = CharFilter(method="filter_licenses")
    kinds = CharFilter(method="filter_kinds")
    coach = BooleanFilter(method="filter_coach")
    assessments = BooleanFilter(method="filter_assessments")
    subtitles = BooleanFilter(method="filter_subtitles")
    bookmark = BooleanFilter(method="filter_bookmarked")
    published = BooleanFilter(method="filter_published")

    def __init__(self, *args, **kwargs):
        super(ChannelFilter, self).__init__(*args, **kwargs)
        self.main_tree_query = ContentNode.objects.filter(
            tree_id=OuterRef("main_tree__tree_id")
        )

    class Meta:
        model = Channel
        fields = ("keywords", "published", "language", "licenses", "kinds", "coach", "assessments", "subtitles", "bookmark")

    def filter_keywords(self, queryset, name, value):
        keywords_query = (
            self.main_tree_query.filter(
                Q(tags__tag_name__icontains=value) |
                Q(author__icontains=value) |
                Q(aggregator__icontains=value) |
                Q(provider__icontains=value)
            )
        )
        return queryset.annotate(
            keyword_match_count=SQCount(keywords_query, field="content_id")
        ).filter(
            Q(name__icontains=value) | Q(description__icontains=value) |
            Q(pk__istartswith=value) | Q(primary_token=value.replace('-', '')) |
            Q(keyword_match_count__gt=0)
        )

    def filter_published(self, queryset, name, value):
        return queryset.filter(main_tree__published=True)

    def filter_language(self, queryset, name, value):
        language_query = (
            self.main_tree_query.filter(language_id=value)
            .values("content_id").distinct()
        )
        return queryset.annotate(
            language_count=SQCount(language_query, field="content_id")
        ).filter(Q(language_id=value) | Q(language_count__gt=0))

    def filter_licenses(self, queryset, name, value):
        license_query = (
            self.main_tree_query.filter(license_id__in=[int(l) for l in value.split(',')])
            .values("content_id").distinct()
        )
        return queryset.annotate(
            license_count=SQCount(license_query, field="content_id")
        ).exclude(license_count=0)

    def filter_kinds(self, queryset, name, value):
        kinds_query = (
            self.main_tree_query.filter(kind_id__in=value.split(','))
            .values("content_id").distinct()
        )
        return queryset.annotate(
            kind_match_count=SQCount(kinds_query, field="content_id")
        ).exclude(kind_match_count=0)

    def filter_coach(self, queryset, name, value):
        coach_query = (
            self.main_tree_query.filter(role_visibility=roles.COACH)
        )
        return queryset.annotate(
            coach_count=SQCount(coach_query, field="content_id")
        ).exclude(coach_count=0)

    def filter_assessments(self, queryset, name, value):
        assessment_query = (
            self.main_tree_query.filter(kind_id=content_kinds.EXERCISE)
        )
        return queryset.annotate(
            assessment_count=SQCount(assessment_query, field="content_id")
        ).exclude(assessment_count=0)

    def filter_subtitles(self, queryset, name, value):
        subtitle_query = (
            self.main_tree_query.filter(files__preset__subtitle=True)
        )
        return queryset.annotate(
            subtitle_count=SQCount(subtitle_query, field="content_id")
        ).exclude(subtitle_count=0)

    def filter_bookmarked(self, queryset, name, value):
        return queryset.filter(bookmark=True)


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


class SQCount(Subquery):
    # Include ALIAS at the end to support Postgres
    template = "(SELECT COUNT(%(field)s) FROM (%(subquery)s) AS %(field)s__sum)"
    output_field = IntegerField()


class ChannelSerializer(serializers.ModelSerializer):
    """
    This is a write only serializer - we leverage it to do create and update
    operations, but read operations are handled by the Viewset.
    """
    published = serializers.SerializerMethodField()
    created = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    count = serializers.SerializerMethodField()
    root_id = serializers.SerializerMethodField()
    modified = serializers.SerializerMethodField()
    primary_token = serializers.SerializerMethodField()
    download_count = serializers.SerializerMethodField()
    bookmark = serializers.SerializerMethodField()

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

    def get_bookmark(self, channel):
        return channel.bookmark

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
            "bookmark",
            "last_published",
            "primary_token",
            "download_count",
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
            "bookmark",
            "last_published",
            "primary_token",
            "download_count",
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
    filter_class = ChannelFilter
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
        "bookmark",
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

        user_id = not self.request.user.is_anonymous() and self.request.user.id
        user_queryset = User.objects.filter(id=user_id)
        # Annotate edit, view, and bookmark onto the channels
        # Have to cast to integer first as it initially gets set
        # as a Big Integer, which cannot be cast directly to a Boolean
        queryset = queryset.annotate(
            bookmark=Cast(
                Cast(
                    SQCount(
                        user_queryset.filter(bookmarked_channels=OuterRef("id")),
                        field="id",
                    ),
                    IntegerField(),
                ),
                BooleanField(),
            ),
        )

        return queryset
