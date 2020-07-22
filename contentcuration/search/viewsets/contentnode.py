import re

from django.db.models import Case
from django.db.models import F
from django.db.models import IntegerField
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django.db.models import Value
from django.db.models import When
from django_filters.rest_framework import BooleanFilter
from django_filters.rest_framework import CharFilter
from le_utils.constants import content_kinds
from le_utils.constants import roles
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.viewsets.base import RequiredFilterSet
from contentcuration.viewsets.common import SQArrayAgg
from contentcuration.viewsets.contentnode import ContentNodeViewSet


class ListPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(
            {
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "page_number": self.page.number,
                "count": self.page.paginator.count,
                "total_pages": self.page.paginator.num_pages,
                "results": data,
            }
        )


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
    channels = CharFilter(method="filter_channel_ids")

    def filter_keywords(self, queryset, name, value):
        return queryset.filter(
            Q(title__icontains=value)
            | Q(description__icontains=value)
            | Q(tags__tag_name__icontains=value)
        )

    def filter_author(self, queryset, name, value):
        return queryset.filter(
            Q(author__icontains=value)
            | Q(aggregator__icontains=value)
            | Q(provider__icontains=value)
        )

    def filter_languages(self, queryset, name, value):
        return queryset.filter(language__lang_code__in=value.split(","))

    def filter_licenses(self, queryset, name, value):
        licenses = [int(l) for l in value.split(",")]
        return queryset.filter(license__in=licenses)

    def filter_kinds(self, queryset, name, value):
        return queryset.filter(kind_id__in=value.split(","))

    def filter_coach(self, queryset, name, value):
        return queryset.filter(role_visibility=roles.COACH)

    def filter_resources(self, queryset, name, value):
        return queryset.exclude(kind_id=content_kinds.TOPIC)

    def filter_assessments(self, queryset, name, value):
        return queryset.filter(kind_id=content_kinds.EXERCISE)

    def filter_created_after(self, queryset, name, value):
        date = re.search(r"(\d{4})-0?(\d+)-(\d+)", value)
        return queryset.filter(
            created__year__gte=date.group(1),
            created__month__gte=date.group(2),
            created__day__gte=date.group(3),
        )

    def filter_channel_ids(self, queryset, name, value):
        return queryset.filter(channel_id__in=value.split(','))

    class Meta:
        model = ContentNode
        fields = (
            "keywords",
            "languages",
            "licenses",
            "kinds",
            "coach",
            "author",
            "resources",
            "assessments",
            "channels",
        )


class SearchContentNodeViewSet(ContentNodeViewSet):
    filter_class = ContentNodeFilter
    pagination_class = ListPagination
    values = ContentNodeViewSet.values + (
        "channel_id",
        "location_ids",
        "location_channel_ids",
    )

    def get_accessible_nodes_queryset(self):
        # Annotate channel id
        channel_query = Channel.objects.filter(main_tree__tree_id=OuterRef('tree_id'))
        user_id = not self.request.user.is_anonymous() and self.request.user.id
        return ContentNode.objects.filter(
            tree_id__in=Channel.objects.filter(deleted=False)
            .filter(
                Q(editors=user_id)
                | Q(viewers=user_id)
                | Q(public=True)
            )
            .exclude(pk=self.request.query_params.get('exclude_channel', ''))
            .values_list("main_tree__tree_id", flat=True)
            .distinct()
        ).annotate(
            channel_id=Subquery(channel_query.values('id')[:1]),
        )

    def get_queryset(self):
        return self.get_accessible_nodes_queryset()

    def annotate_queryset(self, queryset):
        """
            1. Do a distinct by 'content_id,' using the original node if possible
            2. Annotate lists of content node and channel pks
        """
        queryset = super().annotate_queryset(queryset)

        # Get accessible content nodes that match the content id
        content_id_query = self.get_accessible_nodes_queryset()\
            .filter(content_id=OuterRef('content_id'))

        # Combine by unique content id
        deduped_content_query = content_id_query.filter(content_id=OuterRef('content_id'))\
            .annotate(
                is_original=Case(
                    When(
                        original_source_node_id=F('node_id'),
                        then=Value(1)
                    ),
                    default=Value(2),
                    output_field=IntegerField()
                ),
            ).order_by('is_original', 'created')

        queryset = queryset.filter(
            pk__in=Subquery(deduped_content_query.values_list('id', flat=True)[:1])
        ).annotate(
            location_ids=SQArrayAgg(content_id_query, field="id"),
            location_channel_ids=SQArrayAgg(content_id_query, field="channel_id"),
        )
        return queryset
