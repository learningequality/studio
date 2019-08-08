from django.db.models import Count
from django.db.models import IntegerField
from django.db.models import Max
from django.db.models import OuterRef
from django.db.models import Prefetch
from django.db.models import Q
from django.db.models import Subquery
from django.db.models import BooleanField
from django.db.models.functions import Cast
from django_filters.rest_framework import BooleanFilter
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from le_utils.constants import content_kinds
from rest_framework import serializers
from rest_framework import viewsets
from rest_framework.status import HTTP_201_CREATED
from rest_framework.response import Response

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import get_channel_thumbnail
from contentcuration.models import SecretToken
from contentcuration.models import User


class ChannelFilter(FilterSet):
    edit = BooleanFilter(method="filter_edit")
    view = BooleanFilter(method="filter_view")
    bookmark = BooleanFilter(method="filter_bookmark")
    ids = CharFilter(method="filter_ids")

    class Meta:
        model = Channel
        fields = ("edit", "view", "public", "bookmark", "ids")

    def filter_edit(self, queryset, name, value):
        return queryset.filter(editors=self.request.user)

    def filter_view(self, queryset, name, value):
        return queryset.filter(viewers=self.request.user)

    def filter_bookmark(self, queryset, name, value):
        return queryset.filter(bookmarked_by=self.request.user)

    def filter_ids(self, queryset, name, value):
        try:
            # Limit SQL params to 50 - shouldn't be fetching this many
            # ids at once
            return queryset.filter(pk__in=value.split(",")[:50])
        except ValueError:
            # Catch in case of a poorly formed UUID
            return queryset.none()


class SQCount(Subquery):
    # Include ALIAS at the end to support Postgres
    template = "(SELECT COUNT(%(field)s) FROM (%(subquery)s) AS %(field)s__sum)"
    output_field = IntegerField()


class ChannelSerializer(serializers.ModelSerializer):
    """
    This is a write only serializer - we leverage it to do create and update
    operations, but read operations are handled by the Viewset.
    """

    bookmark = serializers.BooleanField()

    class Meta:
        model = Channel
        fields = (
            "id",
            "name",
            "description",
            "thumbnail",
            "thumbnail_encoding",
            "language",
            "bookmark",
        )
        read_only_fields = ("id",)

    def to_representation(self, instance):
        """
        Just return an empty object here, to confirm that any write operations succeeded.
        """
        return {}

    def save(self, **kwargs):
        bookmark = self.validated_data.pop("bookmark", None)
        created = self.instance is None
        instance = super(ChannelSerializer, self).save(**kwargs)
        if "request" in self.context:
            if created:
                # If this has been newly created add the current user as an editor
                instance.editors.add(self.context["request"].user)
            if bookmark:
                instance.bookmarked_by.add(self.context["request"].user)
            else:
                instance.bookmarked_by.remove(self.context["request"].user)
        return instance


class ChannelViewSet(viewsets.ModelViewSet):
    queryset = Channel.objects.all()
    serializer_class = ChannelSerializer
    filter_backends = (DjangoFilterBackend,)
    filter_class = ChannelFilter

    def _map_fields(self, channel):
        channel["thumbnail_url"] = get_channel_thumbnail(channel)
        channel["published"] = channel["main_tree__published"]
        channel.pop("main_tree__published")
        channel["created"] = channel["main_tree__created"]
        channel.pop("main_tree__created")
        return channel

    def prefetch_queryset(self, queryset):
        prefetch_secret_token = Prefetch(
            "secret_tokens", queryset=SecretToken.objects.filter(is_primary=True)
        )
        prefetch_editors = Prefetch(
            "editors", queryset=User.objects.filter(id=self.request.user.id)
        )
        prefetch_viewers = Prefetch(
            "viewers", queryset=User.objects.filter(id=self.request.user.id)
        )
        prefetch_bookmarked = Prefetch(
            "bookmarked_by", queryset=User.objects.filter(id=self.request.user.id)
        )

        queryset = queryset.select_related("language", "main_tree").prefetch_related(
            prefetch_secret_token,
            prefetch_editors,
            prefetch_viewers,
            prefetch_bookmarked,
        )
        return queryset

    def _annotate_queryset(self, queryset):
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
        # Annotate edit, view, and bookmark onto the channels
        # Have to cast to integer first as it initially gets set
        # as a Big Integer, which cannot be cast directly to a Boolean
        queryset = queryset.annotate(
            edit=Cast(Cast(Count("editors"), IntegerField()), BooleanField()),
            view=Cast(Cast(Count("viewers"), IntegerField()), BooleanField()),
            bookmark=Cast(Cast(Count("bookmarked_by"), IntegerField()), BooleanField()),
        )
        return queryset

    def _serialize_queryset(self, queryset):
        queryset = self._annotate_queryset(queryset)
        return queryset.values(
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
            "view",
            "edit",
            "bookmark",
            "public",
            "version",
            "main_tree__created",
            "last_published",
            "ricecooker_version",
        )

    def get_queryset(self):
        queryset = Channel.objects.filter(
            Q(editors=self.request.user) | Q(viewers=self.request.user) | Q(public=True)
        ).distinct()
        return self.prefetch_queryset(queryset)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            data = map(self._map_fields, self._serialize_queryset(page) or [])
            return self.get_paginated_response(data)

        data = map(self._map_fields, self._serialize_queryset(queryset) or [])
        return Response(data)

    def serialize_object(self, pk):
        queryset = self.filter_queryset(self.get_queryset())
        return self._map_fields(self._serialize_queryset(queryset).filter(pk=pk).get())

    def retrieve(self, request, pk, *args, **kwargs):
        return Response(self.serialize_object(pk))

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            self.serialize_object(serializer.instance.id), status=HTTP_201_CREATED
        )
