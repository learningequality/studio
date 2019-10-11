import json

from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import IntegerField
from django.db.models import F
from django.db.models import OuterRef
from django.db.models import Prefetch
from django.db.models import Q
from django.db.models import Subquery
from django.db.models import BooleanField
from django.db.models.functions import Cast
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from le_utils.constants import content_kinds
from le_utils.constants import roles
from rest_framework import serializers

from contentcuration.models import ContentNode
from contentcuration.models import File
from contentcuration.models import User
from contentcuration.models import generate_storage_url
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.base import WriteOnlySerializer


class ContentNodeFilter(FilterSet):
    ids = CharFilter(method="filter_ids")

    class Meta:
        model = ContentNode
        fields = ("parent", "ids", "kind")

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


class ContentNodeSerializer(WriteOnlySerializer):
    """
    This is a write only serializer - we leverage it to do create and update
    operations, but read operations are handled by the Viewset.
    """

    class Meta:
        model = ContentNode
        fields = ("id", "title", "kind", "content_id", "language", "role_visibility")
        read_only_fields = ("id",)


def retrieve_thumbail_src(item):
    """ Get either the encoding or the url to use as the <img> src attribute """
    try:
        if item.get("thumbnail_encoding"):
            return json.loads(item.get("thumbnail_encoding")).get("base64")
    except ValueError:
        pass
    if (
        item["thumbnail_checksum"] is not None
        and item["thumbnail_extension"] is not None
    ):
        return generate_storage_url(
            "{}.{}".format(item["thumbnail_checksum"], item["thumbnail_extension"])
        )
    return None


class SummaryContentNodeViewSet(ValuesViewset):
    queryset = ContentNode.objects.all()
    serializer_class = ContentNodeSerializer
    filter_backends = (DjangoFilterBackend,)
    filter_class = ContentNodeFilter
    values = (
        "id",
        "title",
        "kind",
        "content_id",
        "language_id",
        "role_visibility",
        "total_count",
        "resource_count",
        "coach_count",
        "thumbnail_checksum",
        "thumbnail_extension",
        "thumbnail_encoding",
        "published",
        "modified",
        # "valid",
    )

    field_map = {"language": "language_id", "thumbnail_src": retrieve_thumbail_src}

    def get_queryset(self):
        queryset = ContentNode.objects.all()
        return self.prefetch_queryset(queryset)

    def annotate_queryset(self, queryset):
        queryset = queryset.annotate(total_count=(F("rght") - F("lft")) / 2)
        descendant_resources = (
            ContentNode.objects.filter(
                tree_id=OuterRef("tree_id"),
                lft__gt=OuterRef("lft"),
                rght__lt=OuterRef("rght"),
            )
            .exclude(kind_id=content_kinds.TOPIC)
            .order_by("content_id")
            .distinct("content_id")
            .values_list("content_id", flat=True)
        )
        thumbnails = File.objects.filter(
            contentnode=OuterRef("id"), preset__thumbnail=True
        )
        queryset = queryset.annotate(
            resource_count=SQCount(descendant_resources, field="content_id"),
            coach_count=SQCount(
                descendant_resources.filter(role_visibility=roles.COACH),
                field="content_id",
            ),
            thumbnail_checksum=Subquery(thumbnails.values("checksum")[:1]),
            thumbnail_extension=Subquery(
                thumbnails.values("file_format__extension")[:1]
            ),
        )
        return queryset


def clean_content_tags(item):
    tags = item.pop("content_tags")
    return filter(lambda x: x is not None, tags)


class ContentNodeViewSet(ValuesViewset):
    queryset = ContentNode.objects.all()
    serializer_class = ContentNodeSerializer
    filter_backends = (DjangoFilterBackend,)
    filter_class = ContentNodeFilter
    values = (
        "id",
        "title",
        "description",
        "author",
        "provider",
        "aggregator",
        "copyright_holder",
        "content_tags",
        "role_visibility",
        "language_id",
        "license_id",
        "license_description",
        "copyright_holder",
        "extra_fields",
        "node_id",
        "original_source_node_id",
        "original_channel_id",
    )

    field_map = {
        "language": "language_id",
        "license": "license_id",
        "tags": clean_content_tags,
    }

    def get_queryset(self):
        queryset = ContentNode.objects.all()
        return self.prefetch_queryset(queryset)

    def annotate_queryset(self, queryset):
        queryset = queryset.annotate(content_tags=ArrayAgg("tags__tag_name"))
        return queryset
