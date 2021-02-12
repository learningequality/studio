import logging

from django.conf import settings
from django.db.models import Exists
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django.http import Http404
from django.utils.decorators import method_decorator
from django.utils.translation import get_language
from django.views.decorators.cache import cache_page
from django_cte import With
from django_filters.rest_framework import BooleanFilter
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from le_utils.constants import content_kinds
from le_utils.constants import roles
from rest_framework import serializers
from rest_framework.decorators import detail_route
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAdminUser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.serializers import CharField
from rest_framework.serializers import FloatField
from rest_framework.serializers import IntegerField

from contentcuration.decorators import cache_no_user_data
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import File
from contentcuration.models import generate_storage_url
from contentcuration.models import SecretToken
from contentcuration.models import User
from contentcuration.tasks import create_async_task
from contentcuration.utils.pagination import CachedListPagination
from contentcuration.utils.pagination import get_order_queryset
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import ReadOnlyValuesViewset
from contentcuration.viewsets.base import RequiredFilterSet
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.common import CatalogPaginator
from contentcuration.viewsets.common import ContentDefaultsSerializer
from contentcuration.viewsets.common import JSONFieldDictSerializer
from contentcuration.viewsets.common import SQCount
from contentcuration.viewsets.common import SQSum
from contentcuration.viewsets.common import UUIDInFilter
from contentcuration.viewsets.sync.constants import CHANNEL
from contentcuration.viewsets.sync.utils import generate_update_event


class CatalogListPagination(CachedListPagination):
    page_size = None
    page_size_query_param = "page_size"
    max_page_size = 1000
    django_paginator_class = CatalogPaginator


primary_token_subquery = Subquery(
    SecretToken.objects.filter(channels=OuterRef("id"), is_primary=True)
    .values("token")
    .order_by("-token")[:1]
)


base_channel_filter_fields = (
    "keywords",
    "published",
    "languages",
    "licenses",
    "kinds",
    "coach",
    "assessments",
    "subtitles",
    "public",
    "id__in",
    "collection",
    "deleted",
    "staged",
    "cheffed",
)


class BaseChannelFilter(RequiredFilterSet):
    published = BooleanFilter(name="main_tree__published")
    id__in = UUIDInFilter(name="id")
    keywords = CharFilter(method="filter_keywords")
    languages = CharFilter(method="filter_languages")
    licenses = CharFilter(method="filter_licenses")
    kinds = CharFilter(method="filter_kinds")
    coach = BooleanFilter(method="filter_coach")
    assessments = BooleanFilter(method="filter_assessments")
    subtitles = BooleanFilter(method="filter_subtitles")
    collection = CharFilter(method="filter_collection")
    deleted = BooleanFilter(method="filter_deleted")
    staged = BooleanFilter(method="filter_staged")
    public = BooleanFilter(method="filter_public")
    cheffed = BooleanFilter(method="filter_cheffed")
    exclude = CharFilter(name="id", method="filter_excluded_id")

    def __init__(self, *args, **kwargs):
        super(BaseChannelFilter, self).__init__(*args, **kwargs)
        self.main_tree_query = ContentNode.objects.filter(
            tree_id=OuterRef("main_tree__tree_id")
        )

    def filter_deleted(self, queryset, name, value):
        return queryset.filter(deleted=value)

    def filter_keywords(self, queryset, name, value):
        # TODO: Wait until we show more metadata on cards to add this back in
        # keywords_query = self.main_tree_query.filter(
        #     Q(tags__tag_name__icontains=value)
        #     | Q(author__icontains=value)
        #     | Q(aggregator__icontains=value)
        #     | Q(provider__icontains=value)
        # )
        return queryset.annotate(
            # keyword_match_count=SQCount(keywords_query, field="content_id"),
            primary_token=primary_token_subquery,
        ).filter(
            Q(name__icontains=value)
            | Q(description__icontains=value)
            | Q(pk__istartswith=value)
            | Q(primary_token=value.replace("-", ""))
            # | Q(keyword_match_count__gt=0)
        )

    def filter_languages(self, queryset, name, value):
        languages = value.split(",")

        # TODO: Wait until we show more metadata on cards to add this back in
        # language_query = (
        #     self.main_tree_query.filter(language_id__in=languages)
        #     .values("content_id")
        #     .distinct()
        # )
        # return queryset.annotate(
        #     language_count=SQCount(language_query, field="content_id")
        # ).filter(Q(language_id__in=languages) | Q(language_count__gt=0))

        return queryset.filter(language__lang_code__in=languages)

    def filter_licenses(self, queryset, name, value):
        license_query = (
            self.main_tree_query.filter(
                license_id__in=[int(l_id) for l_id in value.split(",")]
            )
            .values("content_id")
            .distinct()
        )
        return queryset.annotate(
            license_count=SQCount(license_query, field="content_id")
        ).exclude(license_count=0)

    def filter_kinds(self, queryset, name, value):
        kinds_query = (
            self.main_tree_query.filter(kind_id__in=value.split(","))
            .values("content_id")
            .distinct()
        )
        return queryset.annotate(
            kind_match_count=SQCount(kinds_query, field="content_id")
        ).exclude(kind_match_count=0)

    def filter_coach(self, queryset, name, value):
        coach_query = self.main_tree_query.filter(role_visibility=roles.COACH)
        return queryset.annotate(
            coach_count=SQCount(coach_query, field="content_id")
        ).exclude(coach_count=0)

    def filter_assessments(self, queryset, name, value):
        assessment_query = self.main_tree_query.filter(kind_id=content_kinds.EXERCISE)
        return queryset.annotate(
            assessment_count=SQCount(assessment_query, field="content_id")
        ).exclude(assessment_count=0)

    def filter_subtitles(self, queryset, name, value):
        subtitle_query = self.main_tree_query.filter(
            files__preset__subtitle=True, kind_id=content_kinds.VIDEO
        )
        return queryset.annotate(
            subtitle_count=SQCount(subtitle_query, field="content_id")
        ).exclude(subtitle_count=0)

    def filter_collection(self, queryset, name, value):
        return queryset.filter(secret_tokens__channel_sets__pk=value)

    def filter_staged(self, queryset, name, value):
        return queryset.exclude(staging_tree=None)

    def filter_public(self, queryset, name, value):
        return queryset.filter(public=value)

    def filter_cheffed(self, queryset, name, value):
        return queryset.exclude(ricecooker_version=None)

    def filter_excluded_id(self, queryset, name, value):
        return queryset.exclude(pk=value)

    class Meta:
        model = Channel
        fields = base_channel_filter_fields


class ChannelFilter(BaseChannelFilter):
    edit = BooleanFilter(method="filter_edit")
    view = BooleanFilter(method="filter_view")
    bookmark = BooleanFilter(method="filter_bookmark")

    def filter_edit(self, queryset, name, value):
        return queryset.filter(edit=True)

    def filter_view(self, queryset, name, value):
        return queryset.filter(view=True)

    def filter_bookmark(self, queryset, name, value):
        return queryset.filter(bookmark=True)

    class Meta:
        model = Channel
        fields = base_channel_filter_fields + (
            "bookmark",
            "edit",
            "view",
        )


class ThumbnailEncodingFieldsSerializer(JSONFieldDictSerializer):
    base64 = CharField(allow_blank=True)
    orientation = IntegerField(required=False)
    scale = FloatField(required=False)
    startX = FloatField(required=False)
    startY = FloatField(required=False)


class ChannelSerializer(BulkModelSerializer):
    """
    This is a write only serializer - we leverage it to do create and update
    operations, but read operations are handled by the Viewset.
    """

    thumbnail_encoding = ThumbnailEncodingFieldsSerializer(required=False)
    bookmark = serializers.BooleanField(required=False)
    content_defaults = ContentDefaultsSerializer(partial=True, required=False)

    class Meta:
        model = Channel
        fields = (
            "id",
            "deleted",
            "name",
            "description",
            "thumbnail",
            "thumbnail_encoding",
            "version",
            "language",
            "bookmark",
            "content_defaults",
            "source_domain",
        )
        read_only_fields = ("version",)
        list_serializer_class = BulkListSerializer
        nested_writes = True

    def create(self, validated_data):
        bookmark = validated_data.pop("bookmark", None)
        content_defaults = validated_data.pop("content_defaults", {})
        validated_data["content_defaults"] = self.fields["content_defaults"].create(
            content_defaults
        )
        instance = super(ChannelSerializer, self).create(validated_data)
        if "request" in self.context:
            user = self.context["request"].user
            # This has been newly created so add the current user as an editor
            instance.editors.add(user)
            if bookmark:
                user.bookmarked_channels.add(instance)
        self.changes.append(
            generate_update_event(
                instance.id,
                CHANNEL,
                {
                    "root_id": instance.main_tree.id,
                    "created": instance.main_tree.created,
                    "published": instance.main_tree.published,
                    "content_defaults": instance.content_defaults,
                },
            )
        )
        return instance

    def update(self, instance, validated_data):
        bookmark = validated_data.pop("bookmark", None)
        content_defaults = validated_data.pop("content_defaults", None)
        if content_defaults is not None:
            validated_data["content_defaults"] = self.fields["content_defaults"].update(
                instance.content_defaults, content_defaults
            )

        if "request" in self.context:
            user_id = self.context["request"].user.id
            # We could possibly do this in bulk later in the process,
            # but bulk creating many to many through table models
            # would be required, and that would need us to be able to
            # efficiently ignore conflicts with existing models.
            # When we have upgraded to Django 2.2, we can do the bulk
            # creation of many to many models to make this more efficient
            # and use the `ignore_conflicts=True` kwarg to ignore
            # any conflicts.
            if bookmark is not None and bookmark:
                instance.bookmarked_by.add(user_id)
            elif bookmark is not None:
                instance.bookmarked_by.remove(user_id)

        return super(ChannelSerializer, self).update(instance, validated_data)


def get_thumbnail_url(item):
    return item.get("thumbnail") and generate_storage_url(item["thumbnail"])


def _format_url(url):
    if not url:
        return ""
    elif url.startswith("http"):
        return url
    else:
        return "//{}".format(url)


def format_source_url(item):
    return _format_url(item.get("source_url"))


def format_demo_server_url(item):
    return _format_url(item.get("demo_server_url"))


base_channel_values = (
    "id",
    "name",
    "description",
    "main_tree__published",
    "main_tree__publishing",
    "thumbnail",
    "thumbnail_encoding",
    "language",
    "primary_token",
    "modified",
    "count",
    "public",
    "version",
    "main_tree__created",
    "last_published",
    "ricecooker_version",
    "main_tree__id",
    "content_defaults",
    "deleted",
    "trash_tree__id",
    "staging_tree__id",
    "source_url",
    "demo_server_url",
)

channel_field_map = {
    "thumbnail_url": get_thumbnail_url,
    "published": "main_tree__published",
    "publishing": "main_tree__publishing",
    "created": "main_tree__created",
    "root_id": "main_tree__id",
    "trash_root_id": "trash_tree__id",
    "staging_root_id": "staging_tree__id",
    "source_url": format_source_url,
    "demo_server_url": format_demo_server_url,
}


class ChannelViewSet(ValuesViewset):
    queryset = Channel.objects.all()
    permission_classes = [IsAuthenticated]
    serializer_class = ChannelSerializer
    filter_backends = (DjangoFilterBackend,)
    pagination_class = CatalogListPagination
    filter_class = ChannelFilter

    field_map = channel_field_map
    values = base_channel_values + ("edit", "view", "bookmark")

    def get_queryset(self):
        queryset = super(ChannelViewSet, self).get_queryset()
        user_id = not self.request.user.is_anonymous() and self.request.user.id
        user_queryset = User.objects.filter(id=user_id)
        queryset = queryset.order_by(self.request.GET.get("sortBy", "") or "name")

        return queryset.annotate(
            edit=Exists(user_queryset.filter(editable_channels=OuterRef("id"))),
            view=Exists(user_queryset.filter(view_only_channels=OuterRef("id"))),
            bookmark=Exists(user_queryset.filter(bookmarked_channels=OuterRef("id"))),
        )

    def annotate_queryset(self, queryset):
        queryset = queryset.annotate(primary_token=primary_token_subquery)
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
            .values_list("content_id", flat=True)
            .order_by()
            .distinct()
        )

        queryset = queryset.annotate(
            count=SQCount(non_topic_content_ids, field="content_id"),
        )
        return queryset

    @detail_route(methods=["post"])
    def publish(self, request, pk=None):
        if not pk:
            raise Http404
        logging.debug("Entering the publish channel endpoint")

        channel = self.get_edit_object()

        if (
            not channel.main_tree.get_descendants(include_self=True)
            .filter(changed=True)
            .exists()
        ):
            raise ValidationError("Cannot publish an unchanged channel")

        channel.main_tree.publishing = True
        channel.main_tree.save()

        version_notes = request.data.get("version_notes")

        task_args = {
            "user_id": request.user.pk,
            "channel_id": channel.id,
            "version_notes": version_notes,
            "language": get_language(),
        }

        create_async_task("export-channel", request.user, **task_args)
        return Response("")

    @detail_route(methods=["post"])
    def sync(self, request, pk=None):
        if not pk:
            raise Http404
        logging.debug("Entering the sync channel endpoint")

        channel = self.get_edit_object()

        if (
            not channel.main_tree.get_descendants()
            .filter(
                Q(original_node__isnull=False)
                | Q(
                    original_channel_id__isnull=False,
                    original_source_node_id__isnull=False,
                )
            )
            .exists()
        ):
            raise ValidationError("Cannot sync a channel with no imported content")

        data = request.data

        task_args = {
            "user_id": request.user.pk,
            "channel_id": channel.id,
            "sync_attributes": data.get("attributes"),
            "sync_tags": data.get("tags"),
            "sync_files": data.get("files"),
            "sync_assessment_items": data.get("assessment_items"),
        }

        task, task_info = create_async_task("sync-channel", request.user, **task_args)
        return Response("")


@method_decorator(
    cache_page(
        settings.PUBLIC_CHANNELS_CACHE_DURATION, key_prefix="public_catalog_list"
    ),
    name="dispatch",
)
@method_decorator(cache_no_user_data, name="dispatch")
class CatalogViewSet(ReadOnlyValuesViewset):
    queryset = Channel.objects.all()
    serializer_class = ChannelSerializer
    filter_backends = (DjangoFilterBackend,)
    pagination_class = CatalogListPagination
    filter_class = BaseChannelFilter

    permission_classes = [AllowAny]

    field_map = channel_field_map
    values = ("id", "name")
    base_values = (
        "description",
        "thumbnail",
        "thumbnail_encoding",
        "language",
        "primary_token",
        "count",
        "public",
        "last_published",
    )

    def get_queryset(self):
        queryset = Channel.objects.values("id").filter(deleted=False, public=True)

        return queryset.order_by("name")

    def paginate_queryset(self, queryset):
        page_results = self.paginator.paginate_queryset(
            queryset, self.request, view=self
        )
        ids = [result["id"] for result in page_results]
        queryset = Channel.objects.filter(id__in=ids)
        queryset = self.complete_annotations(queryset)
        self.values = self.values + self.base_values
        return list(queryset.values(*self.values))

    def complete_annotations(self, queryset):
        queryset = queryset.annotate(primary_token=primary_token_subquery)
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
            count=SQCount(non_topic_content_ids, field="content_id"),
        )
        return queryset


class AdminChannelFilter(BaseChannelFilter):
    def filter_keywords(self, queryset, name, value):
        regex = r"^(" + "|".join(value.split(" ")) + ")$"
        return queryset.annotate(primary_token=primary_token_subquery,).filter(
            Q(name__icontains=value)
            | Q(pk__istartswith=value)
            | Q(primary_token=value.replace("-", ""))
            | (
                Q(editors__first_name__iregex=regex)
                & Q(editors__last_name__iregex=regex)
            )
            | Q(editors__email__iregex=regex)
        )


class AdminChannelSerializer(ChannelSerializer):
    """
    This is a write only serializer - we leverage it to do create and update
    operations, but read operations are handled by the Viewset.
    """
    class Meta:
        model = Channel
        fields = (
            "id",
            "deleted",
            "source_domain",
            "source_url",
            "demo_server_url",
            "public",
        )
        list_serializer_class = BulkListSerializer
        nested_writes = True


class AdminChannelViewSet(ChannelViewSet):
    pagination_class = CatalogListPagination
    permission_classes = [IsAdminUser]
    serializer_class = AdminChannelSerializer
    filter_class = AdminChannelFilter
    filter_backends = (
        DjangoFilterBackend,
    )
    field_map = {
        "published": "main_tree__published",
        "created": "main_tree__created",
        "source_url": format_source_url,
        "demo_server_url": format_demo_server_url,
    }

    base_values = (
        "id",
        "name",
        "description",
        "main_tree__published",
        "public",
        "main_tree__created",
        "main_tree__id",
        "main_tree__tree_id",
        "deleted",
        "source_url",
        "demo_server_url",
    )
    values = base_values

    def paginate_queryset(self, queryset):
        order, queryset = get_order_queryset(self.request, queryset, self.field_map)
        page_results = self.paginator.paginate_queryset(
            queryset, self.request, view=self
        )
        ids = [result["id"] for result in page_results]
        # tree_ids are needed to optimize files size annotation:
        self.page_tree_ids = [result["main_tree__tree_id"] for result in page_results]

        self.values = self.base_values
        queryset = Channel.objects.filter(id__in=ids).values(*(self.values))
        if order != "undefined":
            queryset = queryset.order_by(order)
        return self.complete_annotations(queryset)

    def get_queryset(self):
        self.annotations = self.compose_annotations()
        order = self.request.GET.get("sortBy", "")
        if order in self.annotations:
            self.values = self.values + (order,)
        return Channel.objects.values("id").order_by("name")

    def annotate_queryset(self, queryset):
        # will do it after paginate excepting for order by
        order = self.request.GET.get("sortBy", "")
        if order in self.annotations:
            queryset = queryset.annotate(**{order: self.annotations[order]})
        return queryset

    def compose_annotations(self):
        channel_main_tree_nodes = ContentNode.objects.filter(
            tree_id=OuterRef("main_tree__tree_id")
        )

        annotations = {}
        annotations["primary_token"] = primary_token_subquery
        # Add the last modified node modified value as the channel last modified
        annotations["modified"] = Subquery(
            channel_main_tree_nodes.values("modified").order_by("-modified")[:1]
        )
        return annotations

    def complete_annotations(self, queryset):

        queryset = queryset.annotate(**self.annotations)

        editors_query = (
            User.objects.filter(editable_channels__id=OuterRef("id"))
            .values_list("id", flat=True)
            .distinct()
        )
        viewers_query = (
            User.objects.filter(view_only_channels__id=OuterRef("id"))
            .values_list("id", flat=True)
            .distinct()
        )

        nodes = With(
            ContentNode.objects.values("id", "tree_id")
            .filter(tree_id__in=self.page_tree_ids)
            .order_by(),
            name="nodes",
        )

        file_query = (
            nodes.join(File, contentnode_id=nodes.col.id)
            .with_cte(nodes)
            .filter(contentnode__tree_id=OuterRef("main_tree__tree_id"))
            .values("checksum", "file_size")
            .distinct()
        )

        queryset = queryset.annotate(
            editors_count=SQCount(editors_query, field="id"),
            viewers_count=SQCount(viewers_query, field="id"),
            size=SQSum(file_query, field="file_size"),
        )
        return queryset


class SettingsChannelSerializer(BulkModelSerializer):
    """ Used for displaying list of user's channels on settings page """

    editor_count = serializers.SerializerMethodField()

    def get_editor_count(self, value):
        return value.editor_count

    class Meta:
        model = Channel
        fields = ("id", "name", "editor_count", "public")
        read_only_fields = ("id", "name", "editor_count", "public")
