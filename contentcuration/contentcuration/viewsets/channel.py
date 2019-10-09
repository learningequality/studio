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

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import get_channel_thumbnail
from contentcuration.models import SecretToken
from contentcuration.models import User
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.base import WriteOnlySerializer


class ChannelFilter(FilterSet):
    edit = BooleanFilter(method="filter_edit")
    view = BooleanFilter(method="filter_view")
    bookmark = BooleanFilter(method="filter_bookmark")
    ids = CharFilter(method="filter_ids")

    class Meta:
        model = Channel
        fields = ("edit", "view", "public", "bookmark", "ids")

    def filter_edit(self, queryset, name, value):
        return queryset.filter(edit=True)

    def filter_view(self, queryset, name, value):
        return queryset.filter(view=True)

    def filter_bookmark(self, queryset, name, value):
        return queryset.filter(bookmark=True)

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


class ChannelSerializer(WriteOnlySerializer):
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
            "deleted",
        )
        read_only_fields = ("id",)

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


class ChannelViewSet(ValuesViewset):
    queryset = Channel.objects.all()
    serializer_class = ChannelSerializer
    filter_backends = (DjangoFilterBackend,)
    filter_class = ChannelFilter
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
        "view",
        "edit",
        "bookmark",
        "public",
        "version",
        "main_tree__created",
        "last_published",
        "ricecooker_version",
    )

    field_map = {
        "thumbnail_url": get_channel_thumbnail,
        "published": "main_tree__published",
        "created": "main_tree__created",
    }

    def get_queryset(self):
        queryset = Channel.objects.filter(deleted=False).filter(
            id__in=Channel.objects.filter(
                Q(editors=self.request.user)
                | Q(viewers=self.request.user)
                | Q(public=True)
            )
            .distinct()
            .values_list("id", flat=True)
        )
        user_queryset = User.objects.filter(id=self.request.user.id)
        # Annotate edit, view, and bookmark onto the channels
        # Have to cast to integer first as it initially gets set
        # as a Big Integer, which cannot be cast directly to a Boolean
        queryset = queryset.annotate(
            edit=Cast(
                Cast(
                    SQCount(
                        user_queryset.filter(editable_channels=OuterRef("id")),
                        field="id",
                    ),
                    IntegerField(),
                ),
                BooleanField(),
            ),
            view=Cast(
                Cast(
                    SQCount(
                        user_queryset.filter(view_only_channels=OuterRef("id")),
                        field="id",
                    ),
                    IntegerField(),
                ),
                BooleanField(),
            ),
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
        return self.prefetch_queryset(queryset)

    def prefetch_queryset(self, queryset):
        prefetch_secret_token = Prefetch(
            "secret_tokens", queryset=SecretToken.objects.filter(is_primary=True)
        )
        queryset = queryset.select_related("language", "main_tree").prefetch_related(
            prefetch_secret_token
        )
        return queryset

    def annotate_queryset(self, queryset):
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
        return queryset
