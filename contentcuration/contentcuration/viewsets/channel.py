import logging
from functools import reduce
from operator import or_
from typing import Dict
from typing import List
from typing import Union

from django.conf import settings
from django.db import IntegrityError
from django.db.models import Exists
from django.db.models import FilteredRelation
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django.db.models import Value
from django.db.models.functions import Coalesce
from django.http import HttpResponse
from django.http import HttpResponseNotFound
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django_cte import With
from django_filters.rest_framework import BooleanFilter
from django_filters.rest_framework import CharFilter
from kolibri_public.utils.export_channel_to_kolibri_public import (
    export_channel_to_kolibri_public,
)
from le_utils.constants import content_kinds
from le_utils.constants import roles
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.serializers import CharField
from rest_framework.serializers import FloatField
from rest_framework.serializers import IntegerField
from rest_framework.status import HTTP_201_CREATED
from rest_framework.status import HTTP_204_NO_CONTENT
from search.models import ChannelFullTextSearch
from search.models import ContentNodeFullTextSearch
from search.utils import get_fts_search_query

import contentcuration.models as models
from contentcuration.constants import (
    community_library_submission as community_library_submission_constants,
)
from contentcuration.decorators import cache_no_user_data
from contentcuration.models import Change
from contentcuration.models import Channel
from contentcuration.models import CommunityLibrarySubmission
from contentcuration.models import ContentNode
from contentcuration.models import Country
from contentcuration.models import File
from contentcuration.models import generate_storage_url
from contentcuration.models import SecretToken
from contentcuration.models import User
from contentcuration.utils.garbage_collect import get_deleted_chefs_root
from contentcuration.utils.pagination import CachedListPagination
from contentcuration.utils.pagination import ValuesViewsetPageNumberPagination
from contentcuration.utils.publish import ChannelIncompleteError
from contentcuration.utils.publish import publish_channel
from contentcuration.utils.sync import sync_channel
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import create_change_tracker
from contentcuration.viewsets.base import ReadOnlyValuesViewset
from contentcuration.viewsets.base import RequiredFilterSet
from contentcuration.viewsets.base import RequiredFiltersFilterBackend
from contentcuration.viewsets.base import RESTDestroyModelMixin
from contentcuration.viewsets.base import RESTUpdateModelMixin
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.base import ValuesViewsetOrderingFilter
from contentcuration.viewsets.common import ContentDefaultsSerializer
from contentcuration.viewsets.common import JSONFieldDictSerializer
from contentcuration.viewsets.common import SQCount
from contentcuration.viewsets.common import SQSum
from contentcuration.viewsets.common import UUIDInFilter
from contentcuration.viewsets.sync.constants import CHANNEL
from contentcuration.viewsets.sync.constants import PUBLISHED
from contentcuration.viewsets.sync.utils import generate_create_event
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

        channel_keywords_query = Exists(
            ChannelFullTextSearch.objects.filter(
                Q(keywords_tsvector=search_query)
                | Q(keywords_tsvector=dash_replaced_search_query),
                channel_id=OuterRef("id"),
            )
        )
        contentnode_search_query = Exists(
            ContentNodeFullTextSearch.objects.filter(
                Q(keywords_tsvector=search_query) | Q(author_tsvector=search_query),
                channel_id=OuterRef("id"),
            )
        )

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
        instance = Channel(**validated_data)
        user = None
        if "request" in self.context:
            user = self.context["request"].user
        instance.save(actor_id=user.id)
        if user:
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
        if content_defaults is not None:
            validated_data["content_defaults"] = self.fields["content_defaults"].update(
                instance.content_defaults, content_defaults
            )

        user_id = None
        if "request" in self.context:
            user_id = self.context["request"].user.id

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save(actor_id=user_id)
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
        server_rev__gt=Coalesce(
            Change.objects.filter(
                channel=channel_ref, change_type=PUBLISHED, errored=False
            )
            .values("server_rev")
            .order_by("-server_rev")[:1],
            Value(0),
        ),
        channel=channel,
        # Going forwards, these changes will be marked as unpublishable,
        # but leave these filters here for now for backwards compatibility
        created_by__isnull=False,
        user__isnull=True,
    ).exclude(unpublishable=True)


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

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            self.perform_create(serializer)

        except IntegrityError as e:
            return Response({"error": str(e)}, status=409)
        instance = serializer.instance
        Change.create_change(
            generate_create_event(
                instance.id, CHANNEL, request.data, channel_id=instance.id
            ),
            applied=True,
            created_by_id=request.user.id,
        )
        return Response(self.serialize_object(pk=instance.pk), status=HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_edit_object()
        self.perform_destroy(instance)
        Change.create_change(
            generate_update_event(
                instance.id, CHANNEL, {"deleted": True}, channel_id=instance.id
            ),
            applied=True,
            created_by_id=request.user.id,
        )
        return Response(status=HTTP_204_NO_CONTENT)

    def perform_destroy(self, instance):
        instance.deleted = True
        instance.save(update_fields=["deleted"], actor_id=self.request.user.id)

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

        queryset = queryset.annotate(
            unpublished_changes=Exists(_unpublished_changes_query(OuterRef("id")))
        )

        return queryset

    def publish_from_changes(self, changes):
        errors = []
        for publish in changes:
            # Publish change will have key, version_notes, and language.
            try:
                self.publish(
                    publish["key"],
                    version_notes=publish.get("version_notes"),
                    language=publish.get("language"),
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

        with create_change_tracker(
            pk, CHANNEL, channel.id, self.request.user, "export-channel"
        ) as progress_tracker:
            try:
                channel = publish_channel(
                    self.request.user.pk,
                    channel.id,
                    version_notes=version_notes,
                    send_email=True,
                    progress_tracker=progress_tracker,
                    language=language,
                )
                Change.create_changes(
                    [
                        generate_update_event(
                            channel.id,
                            CHANNEL,
                            {
                                "published": True,
                                "publishing": False,
                                "primary_token": channel.get_human_token().token,
                                "last_published": channel.last_published,
                                "unpublished_changes": _unpublished_changes_query(
                                    channel
                                ).exists(),
                            },
                            channel_id=channel.id,
                        ),
                    ],
                    applied=True,
                    unpublishable=True,
                )
            except ChannelIncompleteError:
                Change.create_changes(
                    [
                        generate_update_event(
                            channel.id,
                            CHANNEL,
                            {"publishing": False},
                            channel_id=channel.id,
                        ),
                    ],
                    applied=True,
                    unpublishable=True,
                )
                raise ValidationError("Channel is not ready to be published")
            except Exception:
                Change.create_changes(
                    [
                        generate_update_event(
                            channel.id,
                            CHANNEL,
                            {"publishing": False, "unpublished_changes": True},
                            channel_id=channel.id,
                        ),
                    ],
                    applied=True,
                    unpublishable=True,
                )
                raise

    def publish_next_from_changes(self, changes):

        errors = []
        for publish in changes:
            try:
                self.publish_next(
                    publish["key"],
                    use_staging_tree=publish.get("use_staging_tree", False),
                )
            except Exception as e:
                log_sync_exception(e, user=self.request.user, change=publish)
                publish["errors"] = [str(e)]
                errors.append(publish)
        return errors

    def publish_next(self, pk, use_staging_tree=False):
        logging.debug("Entering the publish staging channel endpoint")

        channel = self.get_edit_queryset().get(pk=pk)

        if channel.deleted:
            raise ValidationError("Cannot publish a deleted channel")

        with create_change_tracker(
            pk, CHANNEL, channel.id, self.request.user, "export-channel-staging-tree"
        ) as progress_tracker:
            try:
                channel = publish_channel(
                    self.request.user.pk,
                    channel.id,
                    progress_tracker=progress_tracker,
                    is_draft_version=True,
                    use_staging_tree=use_staging_tree,
                )
                Change.create_changes(
                    [
                        generate_update_event(
                            channel.id,
                            CHANNEL,
                            {
                                "primary_token": channel.get_human_token().token,
                            },
                            channel_id=channel.id,
                        ),
                    ],
                    applied=True,
                )
            except ChannelIncompleteError:
                raise ValidationError("Channel is not ready to be published")
            except Exception:
                raise

    def sync_from_changes(self, changes):
        errors = []
        for sync in changes:
            # Publish change will have key, titles_and_descriptions, resource_details, files, and assessment_items.
            try:
                self.sync(
                    sync["key"],
                    titles_and_descriptions=sync.get("titles_and_descriptions"),
                    resource_details=sync.get("resource_details"),
                    files=sync.get("files"),
                    assessment_items=sync.get("assessment_items"),
                )
            except Exception as e:
                log_sync_exception(e, user=self.request.user, change=sync)
                sync["errors"] = [str(e)]
                errors.append(sync)
        return errors

    def sync(
        self,
        pk,
        titles_and_descriptions=False,
        resource_details=False,
        files=False,
        assessment_items=False,
    ):
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

        with create_change_tracker(
            pk, CHANNEL, channel.id, self.request.user, "sync-channel"
        ) as progress_tracker:
            sync_channel(
                channel,
                titles_and_descriptions,
                resource_details,
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
                channel.previous_tree.title = "Previous tree for channel {}".format(
                    channel.pk
                )
                channel.previous_tree.save()

        channel.previous_tree = channel.main_tree
        channel.main_tree = channel.staging_tree
        channel.staging_tree = None
        channel.save()

        user.staged_files.all().delete()
        user.set_space_used()

        models.Change.create_change(
            generate_update_event(
                channel.id,
                CHANNEL,
                {"root_id": channel.main_tree.id, "staging_root_id": None},
                channel_id=channel.id,
            ),
            applied=True,
            created_by_id=user.id,
        )

    def add_to_community_library_from_changes(self, changes):
        errors = []
        for change in changes:
            try:
                self.add_to_community_library(
                    channel_id=change["key"],
                    channel_version=change["channel_version"],
                    categories=change["categories"],
                    country_codes=change["country_codes"],
                )
            except Exception as e:
                log_sync_exception(e, user=self.request.user, change=change)
                change["errors"] = [str(e)]
                errors.append(change)
        return errors

    def add_to_community_library(
        self, channel_id, channel_version, categories, country_codes
    ):
        # Note: The `categories` field should contain a _dict_, with the category IDs as keys
        # and `True` as a value. This is to match the representation
        # of sets in the changes architecture.

        # The change to add a channel to the community library can only
        # be created server-side, so in theory we should not be getting
        # malformed requests here. However, just to be safe, we still
        # do basic checks.

        channel = self.get_edit_queryset().get(pk=channel_id)
        countries = Country.objects.filter(code__in=country_codes)

        if channel.public:
            raise ValidationError(
                "Public channels cannot be added to the community library"
            )
        if channel_version <= 0 or channel_version > channel.version:
            raise ValidationError("Invalid channel version")

        # Because of changes architecture, the categories are passed as a dict
        # with the category IDs as keys and `True` as a value. At this point,
        # we are no longer working with changes, so we switch to the more
        # convenient representation as a list.
        categories_list = [key for key, val in categories.items() if val]

        export_channel_to_kolibri_public(
            channel_id=channel_id,
            channel_version=channel_version,
            public=False,  # Community library
            categories=categories_list,
            countries=countries,
        )

        new_live_submission = CommunityLibrarySubmission.objects.get(
            channel_id=channel_id,
            channel_version=channel_version,
            status=community_library_submission_constants.STATUS_APPROVED,
        )
        new_live_submission.mark_live()

    @action(
        detail=True,
        methods=["get"],
        url_path="language_exists",
        url_name="language-exists",
    )
    def channel_language_exists(
        self, request, pk=None
    ) -> Union[JsonResponse, HttpResponse]:
        """
        Verify that the language set for a channel is present in at least one of its resources.

        :param request: The request object
        :param pk: The ID of the channel
        :return: JsonResponse with exists=True if the language exists, False otherwise
        :rtype: JsonResponse
        """
        if not self._channel_exists(pk):
            return HttpResponseNotFound("No channel matching: {}".format(pk))

        channel_lang, main_tree_id = self._get_channel_details(pk).values()
        langs_in_channel = self._get_channel_content_languages(pk, main_tree_id)
        lang_exists = channel_lang in langs_in_channel

        return JsonResponse({"exists": lang_exists})

    @action(detail=True, methods=["get"], url_path="languages", url_name="languages")
    def get_languages_in_channel(
        self, request, pk=None
    ) -> Union[JsonResponse, HttpResponse]:
        """
        Get all the languages present in a channel's resources.

        :param request: The request object
        :param pk: The ID of the channel
        :return: JsonResponse with a list of languages present in the channel
        :rtype: JsonResponse
        """
        if not self._channel_exists(pk):
            return HttpResponseNotFound("No channel matching: {}".format(pk))

        channel_details = self._get_channel_details(pk)
        main_tree_id = channel_details.get("main_tree_id")
        langs_in_content = self._get_channel_content_languages(pk, main_tree_id)
        return JsonResponse({"languages": langs_in_content})

    @action(
        detail=True,
        methods=["get"],
        url_path="published_data",
        url_name="published-data",
    )
    def get_published_data(self, request, pk=None) -> Response:
        """
        Get the published data for a channel.

        :param request: The request object
        :param pk: The ID of the channel
        :return: Response with the published data of the channel
        :rtype: Response
        """
        # Allow exactly users with permission to edit the channel to
        # access the published data.
        channel = self.get_edit_object()

        return Response(channel.published_data)

    @action(
        detail=True,
        methods=["get"],
        url_path="has_community_library_submission",
        url_name="has-community-library-submission",
    )
    def has_community_library_submission(self, request, pk=None) -> Response:
        channel = self.get_object()
        has_submission = CommunityLibrarySubmission.objects.filter(
            channel_id=channel.id
        ).exists()
        return Response({"has_community_library_submission": has_submission})

    def _channel_exists(self, channel_id) -> bool:
        """
        Check if a channel exists.

        :param channel_id: The ID of the channel
        :return: True if the channel exists, False otherwise
        :rtype: bool
        """
        try:
            return Channel.objects.filter(pk=channel_id).exists()
        except Exception as e:
            logging.error(f"Error checking if channel exists: {e}")
            return False

    def _get_channel_details(self, channel_id) -> Dict[str, any]:
        """
        Get the language set for a channel.

        :param channel_id: The ID of the channel
        :return: The language code set for the channel
        :rtype: str
        """
        try:
            channel_details = (
                Channel.objects.filter(pk=channel_id)
                .values("language_id", "main_tree_id")
                .first()
            )
        except Channel.DoesNotExist as e:
            logging.error(str(e))
            channel_details = None

        if not channel_details:
            channel_details = dict(language_id=None, main_tree_id=None)

        return channel_details

    def _get_channel_content_languages(
        self, channel_id, main_tree_id=None
    ) -> List[str]:
        """
        Get all the languages used in a channel's resources.

        :param channel_id: The ID of the channel
        :return: A list of language codes used in the channel
        :rtype: List[str]
        """
        if not channel_id:
            return []

        # determine the tree_id for the channel or from the root node (main_tree_id)
        tree_id = None
        if main_tree_id:
            tree_id = (
                ContentNode.objects.filter(id=main_tree_id)
                .values_list("tree_id", flat=True)
                .first()
            )
        elif not main_tree_id:
            try:
                tree_id = (
                    Channel.objects.filter(pk=channel_id)
                    .values_list("main_tree__tree_id", flat=True)
                    .first()
                )
            except Exception as e:
                logging.error(str(e))
                return []

        try:
            # performance: use a CTE to select just the tree's nodes, without default MPTT ordering,
            # then filter against the CTE to get the distinct language IDs
            cte = With(
                ContentNode.objects.filter(tree_id=tree_id)
                .values("id", "language_id")
                .order_by()
            )
            qs = cte.queryset().with_cte(cte).filter(language_id__isnull=False)
            if main_tree_id:
                qs = qs.exclude(id=main_tree_id)
            lang_ids = qs.values_list("language_id", flat=True).distinct()
            unique_lang_ids = list(set(lang_ids))
        except Exception as e:
            logging.error(str(e))
            unique_lang_ids = []
        return unique_lang_ids


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
    latest_community_library_submission_status = CharFilter(
        method="filter_latest_community_library_submission_status"
    )
    community_library_live = BooleanFilter(
        method="filter_community_library_live",
    )
    has_community_library_submission = BooleanFilter(
        method="filter_has_community_library_submission",
    )

    def filter_keywords(self, queryset, name, value):
        keywords = value.split(" ")
        editors_first_name = reduce(
            or_, (Q(editors__first_name__icontains=k) for k in keywords)
        )
        editors_last_name = reduce(
            or_, (Q(editors__last_name__icontains=k) for k in keywords)
        )
        editors_email = reduce(or_, (Q(editors__email__icontains=k) for k in keywords))
        return queryset.annotate(primary_token=primary_token_subquery,).filter(
            Q(name__icontains=value)
            | Q(pk__istartswith=value)
            | Q(primary_token=value.replace("-", ""))
            | (editors_first_name & editors_last_name)
            | editors_email
        )

    def filter_latest_community_library_submission_status(self, queryset, name, value):
        values = self.request.query_params.getlist(name)
        if values:
            return queryset.filter(
                latest_community_library_submission__status__in=values
            )
        return queryset

    def filter_community_library_live(self, queryset, name, value):
        return queryset.filter(has_any_live_community_library_submission=value)

    def filter_has_community_library_submission(self, queryset, name, value):
        return queryset.filter(latest_community_library_submission__isnull=(not value))


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

    def validate_public(self, value):
        if value and hasattr(self, "instance") and self.instance:
            if self.instance.is_community_channel():
                raise ValidationError(
                    "This channel has been added to the Community Library and cannot be marked public.",
                    code="public_community_conflict",
                )
        return value


class AdminChannelViewSet(ChannelViewSet, RESTUpdateModelMixin, RESTDestroyModelMixin):
    pagination_class = CatalogListPagination
    permission_classes = [IsAdminUser]
    serializer_class = AdminChannelSerializer
    filterset_class = AdminChannelFilter
    field_map = {
        "published": "main_tree__published",
        "created": "main_tree__created",
        "source_url": format_source_url,
        "demo_server_url": format_demo_server_url,
        "latest_community_library_submission_id": "latest_community_library_submission__id",
        "latest_community_library_submission_status": "latest_community_library_submission__status",
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
        "latest_community_library_submission__id",
        "latest_community_library_submission__status",
        "has_any_live_community_library_submission",
    )

    def perform_destroy(self, instance):
        # Note that we deliberately do not create a delete event for the channel
        # as because it will have no channel to refer to in its foreign key, it
        # will never propagated back to the client.
        instance.delete()

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_edit_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        Change.create_change(
            generate_update_event(
                instance.id, CHANNEL, request.data, channel_id=instance.id
            ),
            applied=True,
            created_by_id=request.user.id,
        )

        return Response(self.serialize_object())

    def get_queryset(self):
        channel_main_tree_nodes = ContentNode.objects.filter(
            tree_id=OuterRef("main_tree__tree_id")
        )
        latest_community_library_submission_id = Subquery(
            CommunityLibrarySubmission.objects.filter(channel_id=OuterRef("id"))
            .order_by("-date_created")
            .values("id")[:1]
        )
        queryset = Channel.objects.all().annotate(
            modified=Subquery(
                channel_main_tree_nodes.values("modified").order_by("-modified")[:1]
            ),
            primary_token=primary_token_subquery,
            latest_community_library_submission=FilteredRelation(
                "community_library_submissions",
                condition=Q(
                    community_library_submissions__id=latest_community_library_submission_id,
                ),
            ),
            has_any_live_community_library_submission=Exists(
                CommunityLibrarySubmission.objects.filter(
                    channel_id=OuterRef("id"),
                    status=community_library_submission_constants.STATUS_LIVE,
                )
            ),
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
