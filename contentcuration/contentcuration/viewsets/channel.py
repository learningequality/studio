import logging
from functools import reduce
from operator import or_

from django.conf import settings
from django.db import IntegrityError
from django.db.models import Exists
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django.db.models import Value
from django.db.models.functions import Coalesce
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django_cte import With
from django_filters.rest_framework import BooleanFilter
from django_filters.rest_framework import CharFilter
from le_utils.constants import content_kinds
from le_utils.constants import roles
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
from rest_framework.serializers import CharField
from rest_framework.serializers import FloatField
from rest_framework.serializers import IntegerField
from search.models import ChannelFullTextSearch
from search.models import ContentNodeFullTextSearch
from search.utils import get_fts_search_query

import contentcuration.models as models
from contentcuration.decorators import cache_no_user_data
from contentcuration.models import Change
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import File
from contentcuration.models import generate_storage_url
from contentcuration.models import SecretToken
from contentcuration.models import User
from contentcuration.utils.garbage_collect import get_deleted_chefs_root
from contentcuration.utils.pagination import CachedListPagination
from contentcuration.utils.pagination import ValuesViewsetPageNumberPagination
from contentcuration.utils.publish import publish_channel
from contentcuration.utils.sync import sync_channel
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import create_change_tracker
from contentcuration.viewsets.base import ReadOnlyValuesViewset
from contentcuration.viewsets.base import RequiredFilterSet
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.common import ContentDefaultsSerializer
from contentcuration.viewsets.common import JSONFieldDictSerializer
from contentcuration.viewsets.common import SQCount
from contentcuration.viewsets.common import SQSum
from contentcuration.viewsets.common import UUIDInFilter
from contentcuration.viewsets.sync.constants import CHANNEL
from contentcuration.viewsets.sync.constants import PUBLISHED
from contentcuration.viewsets.sync.utils import generate_update_event
from contentcuration.viewsets.sync.utils import log_sync_exception
from contentcuration.viewsets.user import IsAdminUser


class ChannelListPagination(ValuesViewsetPageNumberPagination):
    page_size = None
    page_size_query_param = "page_size"
    max_page_size = 1000


class CatalogListPagination(CachedListPagination):
    page_size = None
    page_size_query_param = "page_size"
    max_page_size = 1000


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
    published = BooleanFilter(field_name="main_tree__published")
    id__in = UUIDInFilter(field_name="id")
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
    exclude = CharFilter(field_name="id", method="filter_excluded_id")

    def __init__(self, *args, **kwargs):
        super(BaseChannelFilter, self).__init__(*args, **kwargs)
        self.main_tree_query = ContentNode.objects.filter(
            tree_id=OuterRef("main_tree__tree_id")
        )

    def filter_deleted(self, queryset, name, value):
        return queryset.filter(deleted=value)

    def filter_keywords(self, queryset, name, value):
        search_query = get_fts_search_query(value)
        dash_replaced_search_query = get_fts_search_query(value.replace("-", ""))

        channel_keywords_query = (Exists(ChannelFullTextSearch.objects.filter(
            Q(keywords_tsvector=search_query) | Q(keywords_tsvector=dash_replaced_search_query), channel_id=OuterRef("id"))))
        contentnode_search_query = (Exists(ContentNodeFullTextSearch.objects.filter(
            Q(keywords_tsvector=search_query) | Q(author_tsvector=search_query), channel_id=OuterRef("id"))))

        return queryset.filter(Q(channel_keywords_query) | Q(contentnode_search_query))

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
        return queryset.filter(bookmarked_by=self.request.user)

    class Meta:
        model = Channel
        fields = base_channel_filter_fields + ("bookmark", "edit", "view",)


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
            "content_defaults",
            "source_domain",
        )
        read_only_fields = ("version",)
        list_serializer_class = BulkListSerializer
        nested_writes = True

    def create(self, validated_data):
        content_defaults = validated_data.pop("content_defaults", {})
        validated_data["content_defaults"] = self.fields["content_defaults"].create(
            content_defaults
        )
        instance = super(ChannelSerializer, self).create(validated_data)
        if "request" in self.context:
            user = self.context["request"].user
            instance.mark_created(user)
            try:
                # Wrap in try catch, fix for #3049
                # This has been newly created so add the current user as an editor
                instance.editors.add(user)
            except IntegrityError:
                pass

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
                channel_id=instance.id,
            )
        )
        return instance

    def update(self, instance, validated_data):
        content_defaults = validated_data.pop("content_defaults", None)
        is_deleted = validated_data.get("deleted")
        if content_defaults is not None:
            validated_data["content_defaults"] = self.fields["content_defaults"].update(
                instance.content_defaults, content_defaults
            )

        user_id = None
        if "request" in self.context:
            user_id = self.context["request"].user.id

        was_deleted = instance.deleted
        instance = super(ChannelSerializer, self).update(instance, validated_data)
        # mark the instance as deleted or recovered, if requested
        if user_id is not None and is_deleted is not None and is_deleted != was_deleted:
            if is_deleted:
                instance.mark_deleted(user_id)
            else:
                instance.mark_recovered(user_id)
        return instance


def get_thumbnail_url(item):
    return item.get("thumbnail") and generate_storage_url(item["thumbnail"])


def _format_url(url):
    if not url:
        return ""
    if url.startswith("http"):
        return url
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


def _unpublished_changes_query(channel):
    """
    :param channel: Either an `OuterRef` or `Channel` object
    :type channel: Channel|OuterRef
    :return: QuerySet for unpublished changes
    """
    # double wrap the channel if it's an outer ref so that we can match the outermost channel
    # to optimize query performance
    channel_ref = OuterRef(channel) if isinstance(channel, OuterRef) else channel

    return Change.objects.filter(
        server_rev__gt=Coalesce(Change.objects.filter(
            channel=channel_ref,
            change_type=PUBLISHED,
            errored=False
        ).values("server_rev").order_by("-server_rev")[:1], Value(0)),
        created_by__isnull=False,
        channel=channel,
        user__isnull=True
    )


class ChannelViewSet(ValuesViewset):
    queryset = Channel.objects.all()
    permission_classes = [IsAuthenticated]
    serializer_class = ChannelSerializer
    pagination_class = ChannelListPagination
    filterset_class = ChannelFilter
    ordering_fields = ["modified", "name"]
    ordering = "-modified"

    field_map = channel_field_map
    values = base_channel_values + ("edit", "view", "unpublished_changes")

    def perform_destroy(self, instance):
        instance.deleted = True
        instance.save(update_fields=["deleted"])

    def get_queryset(self):
        queryset = super(ChannelViewSet, self).get_queryset()
        user_id = not self.request.user.is_anonymous and self.request.user.id
        user_queryset = User.objects.filter(id=user_id)
        # Add the last modified node modified value as the channel last modified
        channel_main_tree_nodes = ContentNode.objects.filter(
            tree_id=OuterRef("main_tree__tree_id")
        )
        queryset = queryset.annotate(
            modified=Subquery(
                channel_main_tree_nodes.values("modified").order_by("-modified")[:1]
            )
        )

        return queryset.annotate(
            edit=Exists(user_queryset.filter(editable_channels=OuterRef("id"))),
            view=Exists(user_queryset.filter(view_only_channels=OuterRef("id"))),
        )

    def annotate_queryset(self, queryset):
        queryset = queryset.annotate(primary_token=primary_token_subquery)
        channel_main_tree_nodes = ContentNode.objects.filter(
            tree_id=OuterRef("main_tree__tree_id")
        )

        # Add the unique count of distinct non-topic node content_ids
        non_topic_content_ids = (
            channel_main_tree_nodes.exclude(kind_id=content_kinds.TOPIC)
            .values_list("content_id", flat=True)
            .order_by()
        )

        queryset = queryset.annotate(
            count=SQCount(non_topic_content_ids, field="content_id"),
        )

        queryset = queryset.annotate(unpublished_changes=Exists(_unpublished_changes_query(OuterRef("id"))))

        return queryset

    def publish_from_changes(self, changes):
        errors = []
        for publish in changes:
            # Publish change will have key, version_notes, and language.
            try:
                self.publish(
                    publish["key"], version_notes=publish.get("version_notes"), language=publish.get("language")
                )
            except Exception as e:
                log_sync_exception(e, user=self.request.user, change=publish)
                publish["errors"] = [str(e)]
                errors.append(publish)
        return errors

    def publish(self, pk, version_notes="", language=None):
        logging.debug("Entering the publish channel endpoint")

        channel = self.get_edit_queryset().get(pk=pk)

        if channel.deleted:
            raise ValidationError("Cannot publish a deleted channel")
        elif channel.main_tree.publishing:
            raise ValidationError("Channel is already publishing")

        channel.mark_publishing(self.request.user)

        with create_change_tracker(pk, CHANNEL, channel.id, self.request.user, "export-channel") as progress_tracker:
            try:
                channel = publish_channel(
                    self.request.user.pk,
                    channel.id,
                    version_notes=version_notes,
                    send_email=True,
                    progress_tracker=progress_tracker,
                    language=language
                )
                Change.create_changes([
                    generate_update_event(
                        channel.id, CHANNEL, {
                            "published": True,
                            "publishing": False,
                            "primary_token": channel.get_human_token().token,
                            "last_published": channel.last_published,
                            "unpublished_changes": _unpublished_changes_query(channel).exists()
                        }, channel_id=channel.id
                    ),
                ], applied=True)
            except Exception:
                Change.create_changes([
                    generate_update_event(
                        channel.id, CHANNEL, {"publishing": False, "unpublished_changes": True}, channel_id=channel.id
                    ),
                ], applied=True)
                raise

    def sync_from_changes(self, changes):
        errors = []
        for sync in changes:
            # Publish change will have key, attributes, tags, files, and assessment_items.
            try:
                self.sync(
                    sync["key"],
                    attributes=sync.get("attributes"),
                    tags=sync.get("tags"),
                    files=sync.get("files"),
                    assessment_items=sync.get("assessment_items")
                )
            except Exception as e:
                log_sync_exception(e, user=self.request.user, change=sync)
                sync["errors"] = [str(e)]
                errors.append(sync)
        return errors

    def sync(self, pk, attributes=False, tags=False, files=False, assessment_items=False):
        logging.debug("Entering the sync channel endpoint")

        channel = self.get_edit_queryset().get(pk=pk)

        if channel.deleted:
            raise ValidationError("Cannot sync a deleted channel")

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

        with create_change_tracker(pk, CHANNEL, channel.id, self.request.user, "sync-channel") as progress_tracker:
            sync_channel(
                channel,
                attributes,
                tags,
                files,
                assessment_items,
                progress_tracker=progress_tracker,
            )

    def deploy_from_changes(self, changes):
        errors = []
        for deploy in changes:
            try:
                self.deploy(self.request.user, deploy["key"])
            except Exception as e:
                log_sync_exception(e, user=self.request.user, change=deploy)
                deploy["errors"] = [str(e)]
                errors.append(deploy)
        return errors

    def deploy(self, user, pk):

        channel = self.get_edit_queryset().get(pk=pk)

        if channel.staging_tree is None:
            raise ValidationError("Cannot deploy a channel without staging tree")

        user.check_channel_space(channel)

        if channel.previous_tree and channel.previous_tree != channel.main_tree:
            # IMPORTANT: Do not remove this block, MPTT updating the deleted chefs block could hang the server
            with models.ContentNode.objects.disable_mptt_updates():
                garbage_node = get_deleted_chefs_root()
                channel.previous_tree.parent = garbage_node
                channel.previous_tree.title = "Previous tree for channel {}".format(channel.pk)
                channel.previous_tree.save()

        channel.previous_tree = channel.main_tree
        channel.main_tree = channel.staging_tree
        channel.staging_tree = None
        channel.save()

        user.staged_files.all().delete()
        user.set_space_used()

        models.Change.create_change(generate_update_event(
            channel.id,
            CHANNEL,
            {
                "root_id": channel.main_tree.id,
                "staging_root_id": None
            },
            channel_id=channel.id,
        ), applied=True, created_by_id=user.id)


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
    pagination_class = CatalogListPagination
    filterset_class = BaseChannelFilter
    ordering_fields = []
    ordering = ("-priority", "name")

    permission_classes = [AllowAny]

    field_map = channel_field_map
    values = (
        "id",
        "name",
        "description",
        "thumbnail",
        "thumbnail_encoding",
        "language",
        "primary_token",
        "count",
        "public",
        "last_published",
        "demo_server_url",
    )

    def get_queryset(self):
        queryset = Channel.objects.values("id").filter(deleted=False, public=True)

        return queryset.order_by("name")

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
        keywords = value.split(" ")
        editors_first_name = reduce(or_, (Q(editors__first_name__icontains=k) for k in keywords))
        editors_last_name = reduce(or_, (Q(editors__last_name__icontains=k) for k in keywords))
        editors_email = reduce(or_, (Q(editors__email__icontains=k) for k in keywords))
        return queryset.annotate(primary_token=primary_token_subquery,).filter(
            Q(name__icontains=value)
            | Q(pk__istartswith=value)
            | Q(primary_token=value.replace("-", ""))
            | (
                editors_first_name
                & editors_last_name
            )
            | editors_email
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
    filterset_class = AdminChannelFilter
    field_map = {
        "published": "main_tree__published",
        "created": "main_tree__created",
        "source_url": format_source_url,
        "demo_server_url": format_demo_server_url,
    }

    values = (
        "id",
        "name",
        "description",
        "main_tree__published",
        "modified",
        "editors_count",
        "viewers_count",
        "size",
        "public",
        "main_tree__created",
        "main_tree__id",
        "main_tree__tree_id",
        "deleted",
        "source_url",
        "demo_server_url",
        "primary_token",
    )

    def perform_destroy(self, instance):
        instance.delete()

    def get_queryset(self):
        channel_main_tree_nodes = ContentNode.objects.filter(
            tree_id=OuterRef("main_tree__tree_id")
        )
        queryset = Channel.objects.all().annotate(
            modified=Subquery(
                channel_main_tree_nodes.values("modified").order_by("-modified")[:1]
            ),
            primary_token=primary_token_subquery,
        )
        return queryset

    def annotate_queryset(self, queryset):
        page_tree_ids = list(queryset.values_list("main_tree__tree_id", flat=True))

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
            .filter(tree_id__in=page_tree_ids)
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
