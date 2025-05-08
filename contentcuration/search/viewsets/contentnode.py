import re

from django.db.models import ExpressionWrapper
from django.db.models import F
from django.db.models import IntegerField
from django.db.models import OuterRef
from django.db.models import Subquery
from django.db.models import Value
from django.db.models.functions import Coalesce
from django_filters.rest_framework import BooleanFilter
from django_filters.rest_framework import CharFilter
from le_utils.constants import content_kinds
from le_utils.constants import roles
from rest_framework.permissions import IsAuthenticated
from search.models import ContentNodeFullTextSearch
from search.utils import get_fts_search_query

from contentcuration.models import Channel
from contentcuration.utils.pagination import ValuesViewsetPageNumberPagination
from contentcuration.viewsets.base import ReadOnlyValuesViewset
from contentcuration.viewsets.base import RequiredFilterSet
from contentcuration.viewsets.common import UUIDFilter
from contentcuration.viewsets.common import UUIDInFilter


class ListPagination(ValuesViewsetPageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


class ContentNodeFilter(RequiredFilterSet):
    keywords = CharFilter(method="filter_keywords")
    languages = CharFilter(method="filter_languages")
    licenses = CharFilter(method="filter_licenses")
    kinds = CharFilter(method="filter_kinds")
    coach = BooleanFilter(method="filter_coach")
    author = CharFilter(method="filter_author")
    resources = BooleanFilter(method="filter_resources")
    assessments = BooleanFilter(method="filter_assessments")
    created_after = CharFilter(method="filter_created_after")
    channel_id__in = UUIDInFilter(field_name="channel_id")
    channel_list = CharFilter(method="filter_channel_list")
    exclude_channel = UUIDFilter(field_name="channel_id", exclude=True)

    def filter_channel_list(self, queryset, name, value):
        user = not self.request.user.is_anonymous and self.request.user
        channel_ids = []

        if value == "public":
            channel_ids = Channel.get_public_channels().values_list("id", flat=True)
        elif value == "edit" and user:
            channel_ids = user.editable_channels.filter(deleted=False).values_list(
                "id", flat=True
            )
        elif value == "bookmark" and user:
            channel_ids = user.bookmarked_channels.filter(deleted=False).values_list(
                "id", flat=True
            )
        elif value == "view" and user:
            channel_ids = user.view_only_channels.filter(deleted=False).values_list(
                "id", flat=True
            )

        return queryset.filter(channel_id__in=list(channel_ids))

    def filter_keywords(self, queryset, name, value):
        return queryset.filter(keywords_tsvector=get_fts_search_query(value))

    def filter_author(self, queryset, name, value):
        return queryset.filter(author_tsvector=get_fts_search_query(value))

    def filter_languages(self, queryset, name, value):
        return queryset.filter(contentnode__language__lang_code__in=value.split(","))

    def filter_licenses(self, queryset, name, value):
        licenses = [int(li) for li in value.split(",")]
        return queryset.filter(contentnode__license__in=licenses)

    def filter_kinds(self, queryset, name, value):
        return queryset.filter(contentnode__kind_id__in=value.split(","))

    def filter_coach(self, queryset, name, value):
        return queryset.filter(contentnode__role_visibility=roles.COACH)

    def filter_resources(self, queryset, name, value):
        return queryset.exclude(contentnode__kind_id=content_kinds.TOPIC)

    def filter_assessments(self, queryset, name, value):
        return queryset.filter(contentnode__kind_id=content_kinds.EXERCISE)

    def filter_created_after(self, queryset, name, value):
        date = re.search(r"(\d{4})-0?(\d+)-(\d+)", value)
        return queryset.filter(
            contentnode__created__year__gte=date.group(1),
            contentnode__created__month__gte=date.group(2),
            contentnode__created__day__gte=date.group(3),
        )


class SearchContentNodeViewSet(ReadOnlyValuesViewset):
    filterset_class = ContentNodeFilter
    pagination_class = ListPagination
    permission_classes = [IsAuthenticated]
    queryset = ContentNodeFullTextSearch.objects.all()

    field_map = {
        "id": "contentnode__id",
        "content_id": "contentnode__content_id",
        "node_id": "contentnode__node_id",
        "root_id": "channel__main_tree_id",
        "kind": "contentnode__kind__kind",
        "parent": "contentnode__parent_id",
        "public": "channel__public",
    }

    values = (
        "channel__public",
        "channel__main_tree_id",
        "contentnode__id",
        "contentnode__content_id",
        "contentnode__node_id",
        "contentnode__kind__kind",
        "contentnode__parent_id",
        "channel_id",
        "resource_count",
        "original_channel_name",
        # TODO: currently loading nodes separately
        # "thumbnail_checksum",
        # "thumbnail_extension",
        # "content_tags",
        # "contentnode__title",
        # "contentnode__description",
        # "contentnode__author",
        # "contentnode__provider",
        # "contentnode__changed",
        # "contentnode__thumbnail_encoding",
        # "contentnode__published",
        # "contentnode__modified",
    )

    def annotate_queryset(self, queryset):
        """
        Annotates thumbnails, resources count and original channel name.
        """
        descendant_resources_count = ExpressionWrapper(
            ((F("contentnode__rght") - F("contentnode__lft") - Value(1)) / Value(2)),
            output_field=IntegerField(),
        )

        original_channel_name = Coalesce(
            Subquery(
                Channel.objects.filter(
                    pk=OuterRef("contentnode__original_channel_id")
                ).values("name")[:1]
            ),
            Subquery(
                Channel.objects.filter(
                    main_tree__tree_id=OuterRef("contentnode__tree_id")
                ).values("name")[:1]
            ),
        )

        queryset = queryset.annotate(
            resource_count=descendant_resources_count,
            original_channel_name=original_channel_name,
        )

        return queryset
