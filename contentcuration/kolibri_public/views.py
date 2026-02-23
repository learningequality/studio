"""
The code in this file is vendored and modified from Kolibri.
The main changes are to remove unneeded parts of the code,
and to swap in Kolibri Studio specific code in place
of Kolibri.
Copied from:
https://github.com/learningequality/kolibri/blob/b8ef7212f9ab44660e2c7cabeb0122311e5ae5ed/kolibri/core/content/api.py
"""
import logging
import re
from collections import OrderedDict
from functools import reduce
from uuid import UUID

from django.core.exceptions import ValidationError
from django.db.models import Exists
from django.db.models import F
from django.db.models import Max
from django.db.models import OuterRef
from django.db.models import Q
from django.http import Http404
from django.utils.cache import patch_cache_control
from django.utils.cache import patch_response_headers
from django.utils.decorators import method_decorator
from django.utils.translation import ugettext as _
from django.views.decorators.http import last_modified
from django_filters.rest_framework import BaseInFilter
from django_filters.rest_framework import BooleanFilter
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import ChoiceFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from django_filters.rest_framework import NumberFilter
from django_filters.rest_framework import UUIDFilter
from kolibri_public import models
from kolibri_public.search import get_contentnode_available_metadata_labels
from kolibri_public.stopwords import stopwords_set
from le_utils.constants import content_kinds
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from contentcuration.middleware.locale import locale_exempt
from contentcuration.middleware.session import session_exempt
from contentcuration.models import Channel
from contentcuration.models import ChannelVersion
from contentcuration.models import Country
from contentcuration.models import generate_storage_url
from contentcuration.utils.pagination import ValuesViewsetCursorPagination
from contentcuration.viewsets.base import BaseValuesViewset
from contentcuration.viewsets.base import ReadOnlyValuesViewset

logger = logging.getLogger(__name__)


def get_last_modified(*args, **kwargs):
    return models.ChannelMetadata.objects.all().aggregate(updated=Max("last_updated"))[
        "updated"
    ]


def metadata_cache(some_func):
    """
    Decorator to apply consistent caching across metadata endpoints
    """
    # 5 minutes
    cache_timeout = 300

    @last_modified(get_last_modified)
    def wrapper_func(*args, **kwargs):
        response = some_func(*args, **kwargs)
        patch_response_headers(response, cache_timeout=cache_timeout)
        # The above function does call patch_cache_control within it
        # but it is intelligent enough to combine successive invocations.
        # Set stale while revalidate to 100 seconds, which is how long a request
        # would take before timing out, so within that time frame, we should have
        # refreshed the cache.
        patch_cache_control(response, public=True, stale_while_revalidate=100)

        return response

    return locale_exempt(session_exempt(wrapper_func))


MODALITIES = set(["QUIZ"])


def bitmask_contains_and(queryset, name, value):
    """
    A filtering method that filters instances matching all provided
    comma-separated values using bitmask fields on the model.
    """
    return queryset.has_all_labels(name, value.split(","))


class UUIDInFilter(BaseInFilter, UUIDFilter):
    pass


class CharInFilter(BaseInFilter, CharFilter):
    pass


class ChannelMetadataFilter(FilterSet):
    def __init__(self, data=None, *args, **kwargs):
        # if filterset is bound, use initial values as defaults
        if data is not None:
            data = data.copy()
            for name, f in self.base_filters.items():
                initial = f.extra.get("initial")
                # filter param is either missing or empty, use initial as default
                if not data.get(name) and initial:
                    data[name] = initial
        super().__init__(data, *args, **kwargs)

    available = BooleanFilter(method="filter_available", label="Available")
    has_exercise = BooleanFilter(method="filter_has_exercise", label="Has exercises")
    categories = CharFilter(method=bitmask_contains_and, label="Categories")
    countries = CharInFilter(field_name="countries", label="Countries")
    public = BooleanFilter(field_name="public", label="Public", initial=True)

    class Meta:
        model = models.ChannelMetadata
        fields = ("available", "has_exercise", "categories", "countries", "public")

    def filter_has_exercise(self, queryset, name, value):
        queryset = queryset.annotate(
            has_exercise=Exists(
                models.ContentNode.objects.filter(
                    kind=content_kinds.EXERCISE,
                    available=True,
                    channel_id=OuterRef("id"),
                )
            )
        )

        return queryset.filter(has_exercise=True)

    def filter_available(self, queryset, name, value):
        return queryset.filter(root__available=value)


@method_decorator(metadata_cache, name="dispatch")
class ChannelMetadataViewSet(ReadOnlyValuesViewset):
    filter_backends = (DjangoFilterBackend,)
    # Update from filter_class to filterset_class for newer version of Django Filters
    filterset_class = ChannelMetadataFilter
    # Add an explicit allow any permission class to override the Studio default
    permission_classes = (AllowAny,)

    values = (
        "author",
        "description",
        "tagline",
        "id",
        "last_updated",
        "root__lang__lang_code",
        # Read from native_name from content curation model
        "root__lang__native_name",
        "name",
        "root",
        "thumbnail",
        "version",
        "root__available",
        "root__num_coach_contents",
        "public",
        "total_resource_count",
        "published_size",
        "categories",
    )

    field_map = {
        "num_coach_contents": "root__num_coach_contents",
        "available": "root__available",
        "lang_code": "root__lang__lang_code",
        # Map to lang_name to map from native_name to map from content curation model
        # to how we want to expose it for Kolibri.
        "lang_name": "root__lang__native_name",
    }

    def get_queryset_from_token(self, token):
        """
        Retrieve a queryset of channels based on a token.

        This method checks both Channel.secret_tokens and ChannelVersion.secret_token
        to find matching channels. It returns an annotated queryset from the
        ChannelMetadata model.

        Args:
            token: The secret token string to look up

        Returns:
            tuple: (QuerySet, dict or None)
                - QuerySet: A queryset of ChannelMetadata objects
                - dict or None: Version-specific data for ChannelVersion tokens, or None for Channel tokens
        """
        normalized_token = token.replace("-", "").strip()

        channels = Channel.objects.filter(
            secret_tokens__token=normalized_token,
            deleted=False,
            main_tree__published=True,
        )

        if channels.exists():
            channel_ids = list(channels.values_list("id", flat=True))
            return models.ChannelMetadata.objects.filter(id__in=channel_ids), None

        channel_versions = ChannelVersion.objects.filter(
            secret_token__token=normalized_token
        ).select_related("channel")

        if channel_versions.exists():
            channel_ids = [cv.channel_id for cv in channel_versions]

            version_data = {}
            for cv in channel_versions:
                version_data[str(cv.channel_id)] = {
                    "published_size": cv.size,
                    "total_resource_count": cv.resource_count,
                    "last_updated": cv.date_published,
                    "included_languages": cv.included_languages or [],
                    "categories": cv.included_categories or [],
                    "version": cv.version,
                }

            queryset = models.ChannelMetadata.objects.filter(id__in=channel_ids)

            return queryset, version_data

        return models.ChannelMetadata.objects.none(), None

    def get_queryset(self):
        """
        Get the base queryset for the viewset.

        If a 'token' query parameter is present, this will return channels
        matching that token. Otherwise, returns all channels.
        """
        token = self.request.query_params.get("token")
        if token:
            self._token_queryset, self._version_data = self.get_queryset_from_token(
                token
            )
            return self._token_queryset
        self._version_data = None
        return models.ChannelMetadata.objects.all()

    def filter_queryset(self, queryset):
        """
        Filter the queryset.

        If a 'token' query parameter is present, all other filters are disabled
        and the queryset is returned unfiltered. Otherwise, applies the normal
        filter behavior.
        """
        token = self.request.query_params.get("token")
        if token:
            return queryset
        return super().filter_queryset(queryset)

    def consolidate(self, items, queryset):
        """
        Consolidate items by adding additional data.

        For token-based queries, this uses data from ChannelVersion.
        For regular queries, it computes included_languages and countries.
        """
        items = list(OrderedDict((item["id"], item) for item in items).values())

        version_data = getattr(self, "_version_data", None)

        if version_data:
            for item in items:
                channel_id = str(item["id"])
                if channel_id in version_data:
                    data = version_data[channel_id]
                    if data["published_size"] is not None:
                        item["published_size"] = data["published_size"]
                    if data["total_resource_count"] is not None:
                        item["total_resource_count"] = data["total_resource_count"]
                    if data["last_updated"] is not None:
                        item["last_updated"] = data["last_updated"]
                    if data["categories"]:
                        item["categories"] = data["categories"]
                    item["included_languages"] = data["included_languages"] or []
                    item["last_published"] = item["last_updated"]
                    item["countries"] = []
                else:
                    item["included_languages"] = []
                    item["countries"] = []
                    item["last_published"] = item["last_updated"]
        else:
            included_languages = {}
            for (
                channel_id,
                language_id,
            ) in models.ChannelMetadata.included_languages.through.objects.filter(
                channelmetadata__in=queryset
            ).values_list(
                "channelmetadata_id", "language_id"
            ):
                if channel_id not in included_languages:
                    included_languages[channel_id] = []
                included_languages[channel_id].append(language_id)
            for item in items:
                item["included_languages"] = included_languages.get(item["id"], [])
                item["last_published"] = item["last_updated"]

            countries = {}
            for (channel_id, country_code) in Country.objects.filter(
                public_channels__in=queryset
            ).values_list("public_channels", "code"):
                if channel_id not in countries:
                    countries[channel_id] = []
                countries[channel_id].append(country_code)

            for item in items:
                item["countries"] = countries.get(item["id"], [])

        return items


contentnode_filter_fields = [
    "parent",
    "parent__isnull",
    "prerequisite_for",
    "has_prerequisite",
    "related",
    "exclude_content_ids",
    "ids",
    "content_id",
    "channel_id",
    "kind",
    "include_coach_content",
    "kind_in",
    "contains_quiz",
    "grade_levels",
    "resource_types",
    "learning_activities",
    "accessibility_labels",
    "categories",
    "learner_needs",
    "keywords",
    "channels",
    "languages",
    "tree_id",
    "lft__gt",
    "rght__lt",
]


# return the result of and-ing a list of queries
def intersection(queries):
    if queries:
        return reduce(lambda x, y: x & y, queries)
    return None


def union(queries):
    if queries:
        return reduce(lambda x, y: x | y, queries)
    return None


class ContentNodeFilter(FilterSet):
    ids = UUIDInFilter(field_name="id")
    kind = ChoiceFilter(
        method="filter_kind",
        choices=(content_kinds.choices + (("content", _("Resource")),)),
    )
    exclude_content_ids = CharFilter(method="filter_exclude_content_ids")
    kind_in = CharFilter(method="filter_kind_in")
    parent = UUIDFilter("parent")
    parent__isnull = BooleanFilter(field_name="parent", lookup_expr="isnull")
    include_coach_content = BooleanFilter(method="filter_include_coach_content")
    contains_quiz = CharFilter(method="filter_contains_quiz")
    grade_levels = CharFilter(method=bitmask_contains_and)
    resource_types = CharFilter(method=bitmask_contains_and)
    learning_activities = CharFilter(method=bitmask_contains_and)
    accessibility_labels = CharFilter(method=bitmask_contains_and)
    categories = CharFilter(method=bitmask_contains_and)
    learner_needs = CharFilter(method=bitmask_contains_and)
    keywords = CharFilter(method="filter_keywords")
    channels = UUIDInFilter(field_name="channel_id")
    languages = CharInFilter(field_name="lang_id")
    categories__isnull = BooleanFilter(field_name="categories", lookup_expr="isnull")
    lft__gt = NumberFilter(field_name="lft", lookup_expr="gt")
    rght__lt = NumberFilter(field_name="rght", lookup_expr="lt")
    authors = CharFilter(method="filter_by_authors")
    tags = CharFilter(method="filter_by_tags")
    descendant_of = UUIDFilter(method="filter_descendant_of")

    class Meta:
        model = models.ContentNode
        fields = contentnode_filter_fields

    def filter_by_authors(self, queryset, name, value):
        """
        Show content filtered by author

        :param queryset: all content nodes for this channel
        :param value: an array of authors to filter by
        :return: content nodes that match the authors
        """
        authors = value.split(",")
        return queryset.filter(author__in=authors).order_by("lft")

    def filter_by_tags(self, queryset, name, value):
        """
        Show content filtered by tag

        :param queryset: all content nodes for this channel
        :param value: an array of tags to filter by
        :return: content nodes that match the tags
        """
        tags = value.split(",")
        return queryset.filter(tags__tag_name__in=tags).order_by("lft").distinct()

    def filter_descendant_of(self, queryset, name, value):
        """
        Show content that is descendant of the given node

        :param queryset: all content nodes for this channel
        :param value: the root node to filter descendant of
        :return: all descendants content
        """
        try:
            node = models.ContentNode.objects.values("lft", "rght", "tree_id").get(
                pk=value
            )
        except (models.ContentNode.DoesNotExist, ValueError):
            return queryset.none()
        return queryset.filter(
            lft__gt=node["lft"], rght__lt=node["rght"], tree_id=node["tree_id"]
        )

    def filter_kind(self, queryset, name, value):
        """
        Show only content of a given kind.

        :param queryset: all content nodes for this channel
        :param value: 'content' for everything except topics, or one of the content kind constants
        :return: content nodes of the given kind
        """
        if value == "content":
            return queryset.exclude(kind=content_kinds.TOPIC).order_by("lft")
        return queryset.filter(kind=value).order_by("lft")

    def filter_kind_in(self, queryset, name, value):
        """
        Show only content of given kinds.

        :param queryset: all content nodes for this channel
        :param value: A list of content node kinds
        :return: content nodes of the given kinds
        """
        kinds = value.split(",")
        return queryset.filter(kind__in=kinds).order_by("lft")

    def filter_exclude_content_ids(self, queryset, name, value):
        return queryset.exclude_by_content_ids(value.split(","))

    def filter_include_coach_content(self, queryset, name, value):
        if value:
            return queryset
        return queryset.filter(coach_content=False)

    def filter_contains_quiz(self, queryset, name, value):
        if value:
            quizzes = models.ContentNode.objects.filter(
                options__contains='"modality": "QUIZ"'
            ).get_ancestors(include_self=True)
            return queryset.filter(pk__in=quizzes.values_list("pk", flat=True))
        return queryset

    def filter_keywords(self, queryset, name, value):
        # all words with punctuation removed
        all_words = [w for w in re.split('[?.,!";: ]', value) if w]
        # words in all_words that are not stopwords
        critical_words = [w for w in all_words if w not in stopwords_set]
        words = critical_words if critical_words else all_words
        query = union(
            [
                # all critical words in title
                intersection([Q(title__icontains=w) for w in words]),
                # all critical words in description
                intersection([Q(description__icontains=w) for w in words]),
            ]
        )

        return queryset.filter(query)


def map_file(file):
    file["checksum"] = file.pop("local_file__id")
    file["available"] = file.pop("local_file__available")
    file["file_size"] = file.pop("local_file__file_size")
    file["extension"] = file.pop("local_file__extension")
    # Swap in the contentcuration generate_storage_url function here
    file["storage_url"] = generate_storage_url(
        "{}.{}".format(file["checksum"], file["extension"])
    )
    return file


def _split_text_field(text):
    return text.split(",") if text else []


class BaseContentNodeMixin(object):
    """
    A base mixin for viewsets that need to return the same format of data
    serialization for ContentNodes.
    """

    filter_backends = (DjangoFilterBackend,)
    # Update from filter_class to filterset_class for newer version of Django Filters
    filterset_class = ContentNodeFilter
    # Add an explicit allow any permission class to override the Studio default
    permission_classes = (AllowAny,)

    values = (
        "id",
        "author",
        "available",
        "channel_id",
        "coach_content",
        "content_id",
        "description",
        "kind",
        "lang_id",
        "license_description",
        "license_name",
        "license_owner",
        "num_coach_contents",
        "options",
        "parent",
        "sort_order",
        "title",
        "lft",
        "rght",
        "tree_id",
        "learning_activities",
        "grade_levels",
        "resource_types",
        "accessibility_labels",
        "learner_needs",
        "categories",
        "duration",
        "ancestors",
    )

    field_map = {
        "learning_activities": lambda x: _split_text_field(x["learning_activities"]),
        "grade_levels": lambda x: _split_text_field(x["grade_levels"]),
        "resource_types": lambda x: _split_text_field(x["resource_types"]),
        "accessibility_labels": lambda x: _split_text_field(x["accessibility_labels"]),
        "categories": lambda x: _split_text_field(x["categories"]),
        "learner_needs": lambda x: _split_text_field(x["learner_needs"]),
    }

    def get_queryset(self):
        return models.ContentNode.objects.filter(available=True)

    def get_related_data_maps(self, items, queryset):
        assessmentmetadata_map = {
            a["contentnode"]: a
            for a in models.AssessmentMetaData.objects.filter(
                contentnode__in=queryset
            ).values(
                "assessment_item_ids",
                "number_of_assessments",
                "mastery_model",
                "randomize",
                "is_manipulable",
                "contentnode",
            )
        }

        files_map = {}

        files = list(
            models.File.objects.filter(contentnode__in=queryset).values(
                "id",
                "contentnode",
                "local_file__id",
                "priority",
                "local_file__available",
                "local_file__file_size",
                "local_file__extension",
                "preset",
                "lang_id",
                "supplementary",
                "thumbnail",
            )
        )

        lang_ids = set([obj["lang_id"] for obj in items + files])

        languages_map = {
            lang["id"]: lang
            # Add an annotation for lang_name to map to native_name to map from content curation model
            # to how we want to expose it for Kolibri.
            for lang in models.Language.objects.filter(id__in=lang_ids)
            .annotate(lang_name=F("native_name"))
            .values("id", "lang_code", "lang_subcode", "lang_name", "lang_direction")
        }

        for f in files:
            contentnode_id = f.pop("contentnode")
            if contentnode_id not in files_map:
                files_map[contentnode_id] = []
            lang_id = f.pop("lang_id")
            f["lang"] = languages_map.get(lang_id)
            files_map[contentnode_id].append(map_file(f))

        tags_map = {}

        for t in (
            models.ContentTag.objects.filter(tagged_content__in=queryset)
            .values(
                "tag_name",
                "tagged_content",
            )
            .order_by("tag_name")
        ):
            if t["tagged_content"] not in tags_map:
                tags_map[t["tagged_content"]] = [t["tag_name"]]
            else:
                tags_map[t["tagged_content"]].append(t["tag_name"])

        return assessmentmetadata_map, files_map, languages_map, tags_map

    def consolidate(self, items, queryset):
        output = []
        if items:
            (
                assessmentmetadata,
                files_map,
                languages_map,
                tags,
            ) = self.get_related_data_maps(items, queryset)
            for item in items:
                item["assessmentmetadata"] = assessmentmetadata.get(item["id"])
                item["tags"] = tags.get(item["id"], [])
                item["files"] = files_map.get(item["id"], [])
                thumb_file = next(
                    iter(filter(lambda f: f["thumbnail"] is True, item["files"])),
                    None,
                )
                if thumb_file:
                    item["thumbnail"] = thumb_file["storage_url"]
                else:
                    item["thumbnail"] = None
                lang_id = item.pop("lang_id")
                item["lang"] = languages_map.get(lang_id)
                item["is_leaf"] = item.get("kind") != content_kinds.TOPIC
                output.append(item)
        return output


class OptionalContentNodePagination(ValuesViewsetCursorPagination):
    ordering = ("lft", "id")
    page_size_query_param = "max_results"

    def paginate_queryset(self, queryset, request, view=None):
        # Record the queryset for use in returning available filters
        self.queryset = queryset
        return super(OptionalContentNodePagination, self).paginate_queryset(
            queryset, request, view=view
        )

    def get_paginated_response(self, data):
        return Response(
            OrderedDict(
                [
                    ("more", self.get_more()),
                    ("results", data),
                    (
                        "labels",
                        get_contentnode_available_metadata_labels(self.queryset),
                    ),
                ]
            )
        )

    def get_paginated_response_schema(self, schema):
        return {
            "type": "object",
            "properties": {
                "more": {
                    "type": "object",
                    "nullable": True,
                    "example": {
                        "cursor": "asdadshjashjadh",
                    },
                },
                "results": schema,
                "labels": {
                    "type": "object",
                    "example": {"accessibility_labels": ["id1", "id2"]},
                },
            },
        }


@method_decorator(metadata_cache, name="dispatch")
class ContentNodeViewset(BaseContentNodeMixin, ReadOnlyValuesViewset):
    pagination_class = OptionalContentNodePagination


# The max recursed page size should be less than 25 for a couple of reasons:
# 1. At this size the query appears to be relatively performant, and will deliver most of the tree
#    data to the frontend in a single query.
# 2. In the case where the tree topology means that this will not produce the full query, the limit of
#    25 immediate children and 25 grand children means that we are at most using 1 + 25 + 25 * 25 = 651
#    SQL parameters in the query to get the nodes for serialization - this means that we should not ever
#    run into an issue where we hit a SQL parameters limit in the queries in here.
# If we find that this page size is too high, we should lower it, but for the reasons noted above, we
# should not raise it.
NUM_CHILDREN = 12
NUM_GRANDCHILDREN_PER_CHILD = 12


class TreeQueryMixin(object):
    def validate_and_return_params(self, request):
        depth = request.query_params.get("depth", 2)
        next__gt = request.query_params.get("next__gt")

        try:
            depth = int(depth)
            if 1 > depth or depth > 2:
                raise ValueError
        except ValueError:
            raise ValidationError("Depth query parameter must have the value 1 or 2")

        if next__gt is not None:
            try:
                next__gt = int(next__gt)
                if 1 > next__gt:
                    raise ValueError
            except ValueError:
                raise ValidationError(
                    "next__gt query parameter must be a positive integer if specified"
                )

        return depth, next__gt

    def _get_gc_by_parent(self, child_ids):
        # Use this to keep track of how many grand children we have accumulated per child of the parent node
        gc_by_parent = {}
        # Iterate through the grand children of the parent node in lft order so we follow the tree traversal order
        for gc in (
            self.filter_queryset(self.get_queryset())
            .filter(parent_id__in=child_ids)
            .values("id", "parent_id")
            .order_by("lft")
        ):
            # If we have not already added a list of nodes to the gc_by_parent map, initialize it here
            if gc["parent_id"] not in gc_by_parent:
                gc_by_parent[gc["parent_id"]] = []
            gc_by_parent[gc["parent_id"]].append(gc["id"])
        return gc_by_parent

    def get_grandchild_ids(self, child_ids, depth, page_size):
        grandchild_ids = []
        if depth == 2:
            # Use this to keep track of how many grand children we have accumulated per child of the parent node
            gc_by_parent = self._get_gc_by_parent(child_ids)
            singletons = []
            # Now loop through each of the child_ids we passed in
            # that have any children, check if any of them have only one
            # child, and also add up to the page size to the list of
            # grandchild_ids.
            for child_id in gc_by_parent:
                gc_ids = gc_by_parent[child_id]
                if len(gc_ids) == 1:
                    singletons.append(gc_ids[0])
                # Only add up to the page size to the list
                grandchild_ids.extend(gc_ids[:page_size])
            if singletons:
                grandchild_ids.extend(
                    self.get_grandchild_ids(singletons, depth, page_size)
                )
        return grandchild_ids

    def get_child_ids(self, parent_id, next__gt):
        # Get a list of child_ids of the parent node up to the pagination limit
        child_qs = self.get_queryset().filter(parent_id=parent_id)
        if next__gt is not None:
            child_qs = child_qs.filter(lft__gt=next__gt)
        return child_qs.values_list("id", flat=True).order_by("lft")[0:NUM_CHILDREN]

    def get_tree_queryset(self, request, pk):
        # Get the model for the parent node here - we do this so that we trigger a 404 immediately if the node
        # does not exist (or exists but is not available, or is filtered).
        parent_id = (
            pk
            if pk and self.filter_queryset(self.get_queryset()).filter(id=pk).exists()
            else None
        )

        if parent_id is None:
            raise Http404
        depth, next__gt = self.validate_and_return_params(request)

        child_ids = self.get_child_ids(parent_id, next__gt)

        ancestor_ids = []

        while next__gt is None and len(child_ids) == 1:
            ancestor_ids.extend(child_ids)
            child_ids = self.get_child_ids(child_ids[0], next__gt)

        # Get a flat list of ids for grandchildren we will be returning
        gc_ids = self.get_grandchild_ids(child_ids, depth, NUM_GRANDCHILDREN_PER_CHILD)
        return self.filter_queryset(self.get_queryset()).filter(
            Q(id=parent_id)
            | Q(id__in=ancestor_ids)
            | Q(id__in=child_ids)
            | Q(id__in=gc_ids)
        )


@method_decorator(metadata_cache, name="dispatch")
class ContentNodeTreeViewset(BaseContentNodeMixin, TreeQueryMixin, BaseValuesViewset):
    def retrieve(self, request, pk=None):
        """
        A nested, paginated representation of the children and grandchildren of a specific node

        GET parameters on request can be:
        depth - a value of either 1 or 2 indicating the depth to recurse the tree, either 1 or 2 levels
        if this parameter is missing it will default to 2.
        next__gt - a value to return child nodes with a lft value greater than this, if missing defaults to None

        The pagination object returned for "children" will have this form:
        results - a list of serialized children, that can also have their own nested children attribute.
        more - a dictionary or None, if a dictionary, will have an id key that is the id of the parent object
        for these children, and a params key that is a dictionary of the required query parameters to query more
        children for this parent - at a minimum this will include next__gt and depth, but may also include
        other query parameters for filtering content nodes.

        The "more" property describes the "id" required to do URL reversal on this endpoint, and the params that should
        be passed as query parameters to get the next set of results for pagination.

        :param request: request object
        :param pk: id parent node
        :return: an object representing the parent with a pagination object as "children"
        """

        try:
            UUID(pk)
        except ValueError:
            return Response(
                {"error": "Invalid UUID format."}, status=status.HTTP_400_BAD_REQUEST
            )

        queryset = self.get_tree_queryset(request, pk)
        # We explicitly order by lft here, so that the nodes are in tree traversal order, so we can iterate over them and build
        # out our nested representation, being sure that any ancestors have already been processed.
        nodes = self.serialize(queryset.order_by("lft"))

        # The serialized parent representation is the first node in the lft order
        parent = nodes[0]

        # Use this to keep track of descendants of the parent node
        # this will allow us to do lookups for any further descendants, in order
        # to insert them into the "children" property
        descendants_by_id = {}

        # Iterate through all the descendants that we have serialized
        for desc in nodes[1:]:
            # Add them to the descendants_by_id map so that
            # descendants can reference them later
            descendants_by_id[desc["id"]] = desc
            # First check to see whether it is a direct child of the
            # parent node that we initially queried
            if desc["parent"] == pk:
                # The parent of this descendant is the parent node
                # for this query
                desc_parent = parent
                # When we request more results for pagination, we want to return
                # both nodes at this level, and the nodes at the lower level
                more_depth = 2
                # For the parent node the page size is the maximum number of children
                # we are returning (regardless of whether they have a full representation)
                page_size = NUM_CHILDREN
            elif desc["parent"] in descendants_by_id:
                # Otherwise, check to see if our descendant's parent is in the
                # descendants_by_id map - if it failed the first condition,
                # it really should not fail this
                desc_parent = descendants_by_id[desc["parent"]]
                # When we request more results for pagination, we only want to return
                # nodes at this level, and not any of its children
                more_depth = 1
                # For a child node, the page size is the maximum number of grandchildren
                # per node that we are returning if it is a recursed node
                page_size = NUM_GRANDCHILDREN_PER_CHILD
            else:
                # If we get to here, we have a node that is not in the tree subsection we are
                # trying to return, so we just ignore it. This shouldn't happen.
                continue
            if "children" not in desc_parent:
                # If the parent of the descendant does not already have its `children` property
                # initialized, do so here.
                desc_parent["children"] = {"results": [], "more": None}
            # Add this descendant to the results for the children pagination object
            desc_parent["children"]["results"].append(desc)
            # Only bother updating the URL for more if we have hit the page size limit
            # otherwise it will just continue to be None
            if len(desc_parent["children"]["results"]) == page_size:
                # Any subsequent queries to get siblings of this node can restrict themselves
                # to looking for nodes with lft greater than the rght value of this descendant
                next__gt = desc["rght"]
                # If the rght value of this descendant is exactly 1 less than the rght value of
                # its parent, then there are no more children that can be queried.
                # So only in this instance do we update the more URL
                if desc["rght"] + 1 < desc_parent["rght"]:
                    params = request.query_params.copy()
                    params["next__gt"] = next__gt
                    params["depth"] = more_depth
                    desc_parent["children"]["more"] = {
                        "id": desc_parent["id"],
                        "params": params,
                    }
        return Response(parent)
