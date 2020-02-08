import json

from django.conf import settings
from django.core.cache import cache
from django.db.models import Exists
from django.db.models import IntegerField
from django.db.models import F
from django.db.models import OuterRef
from django.db.models import Subquery
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from le_utils.constants import content_kinds
from le_utils.constants import roles
from rest_framework.serializers import PrimaryKeyRelatedField

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import File
from contentcuration.models import generate_storage_url
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.common import NotNullArrayAgg


class ContentNodeFilter(FilterSet):
    ids = CharFilter(method="filter_ids")
    channel_root = CharFilter(method="filter_channel_root")

    class Meta:
        model = ContentNode
        fields = ("parent", "ids", "kind", "channel_root")

    def filter_ids(self, queryset, name, value):
        try:
            # Limit SQL params to 50 - shouldn't be fetching this many
            # ids at once
            return queryset.filter(pk__in=value.split(",")[:50])
        except ValueError:
            # Catch in case of a poorly formed UUID
            return queryset.none()

    def filter_channel_root(self, queryset, name, value):
        return queryset.filter(
            parent=Channel.objects.filter(pk=value).values_list(
                "main_tree__id", flat=True
            )
        )


class SQCount(Subquery):
    # Include ALIAS at the end to support Postgres
    template = "(SELECT COUNT(%(field)s) FROM (%(subquery)s) AS %(field)s__sum)"
    output_field = IntegerField()


class ContentNodeSerializer(BulkModelSerializer):
    """
    This is a write only serializer - we leverage it to do create and update
    operations, but read operations are handled by the Viewset.
    """

    files = PrimaryKeyRelatedField(many=True, queryset=File.objects.all())
    prerequisite = PrimaryKeyRelatedField(many=True, queryset=ContentNode.objects.all())

    class Meta:
        model = ContentNode
        fields = (
            "id",
            "title",
            "description",
            "files",
            "prerequisite",
            "kind",
            "language",
            "license",
            "license_description",
            "copyright_holder",
            "author",
            "role_visibility",
            "aggregator",
            "provider",
            "extra_fields",
        )
        list_serializer_class = BulkListSerializer


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


def clean_content_tags(item):
    tags = item.pop("content_tags")
    return filter(lambda x: x is not None, tags)


ORPHAN_TREE_ID_CACHE_KEY = "orphan_tree_id_cache_key"


class ContentNodeViewSet(ValuesViewset):
    queryset = ContentNode.objects.all()
    serializer_class = ContentNodeSerializer
    filter_backends = (DjangoFilterBackend,)
    filter_class = ContentNodeFilter
    values = (
        "id",
        "content_id",
        "title",
        "description",
        "author",
        "file_ids",
        "assessment_items_ids",
        "prerequisite_ids",
        "provider",
        "aggregator",
        "content_tags",
        "role_visibility",
        "kind__kind",
        "language_id",
        "license_id",
        "license_description",
        "copyright_holder",
        "extra_fields",
        "node_id",
        "original_source_node_id",
        "original_channel_id",
        "total_count",
        "resource_count",
        "coach_count",
        "thumbnail_checksum",
        "thumbnail_extension",
        "thumbnail_encoding",
        "published",
        "modified",
        "has_children",
    )

    field_map = {
        "language": "language_id",
        "license": "license_id",
        "tags": clean_content_tags,
        "files": "file_ids",
        "kind": "kind__kind",
        "prerequisite": "prerequisite_ids",
        "assessment_items": "assessment_items_ids",
        "thumbnail_src": retrieve_thumbail_src,
    }

    def annotate_queryset(self, queryset):
        queryset = queryset.annotate(total_count=(F("rght") - F("lft") - 1) / 2)
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
            has_children=Exists(ContentNode.objects.filter(parent=OuterRef("id"))),
        )
        queryset = queryset.annotate(content_tags=NotNullArrayAgg("tags__tag_name"))
        queryset = queryset.annotate(file_ids=NotNullArrayAgg("files__id"))
        queryset = queryset.annotate(
            prerequisite_ids=NotNullArrayAgg("prerequisite__id")
        )
        queryset = queryset.annotate(
            assessment_items_ids=NotNullArrayAgg("assessment_items__id")
        )
        return queryset

    def perform_bulk_update(self, serializer):
        serializer.save(changed=True)

    def perform_bulk_create(self, serializer):
        if ORPHAN_TREE_ID_CACHE_KEY not in cache:
            tree_id = (
                ContentNode.objects.filter(id=settings.ORPHANAGE_ROOT_ID)
                .values_list("tree_id", flat=True)
                .get()
            )
            # No reason for this to change so can cache for a long time
            cache.set(ORPHAN_TREE_ID_CACHE_KEY, 24 * 60 * 60)
        else:
            tree_id = cache.get(ORPHAN_TREE_ID_CACHE_KEY)
        # Creating a new node, by default put it in the orphanage on initial creation.
        serializer.save(
            changed=True,
            tree_id=tree_id,
            parent_id=settings.ORPHANAGE_ROOT_ID,
            lft=1,
            rght=2,
        )
