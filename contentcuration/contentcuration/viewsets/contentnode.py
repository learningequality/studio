import json

from django.conf import settings
from django.core.cache import cache
from django.db.models import Exists
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
from contentcuration.models import PrerequisiteContentRelationship
from contentcuration.viewsets.base import BulkListSerializer
from contentcuration.viewsets.base import BulkModelSerializer
from contentcuration.viewsets.base import ValuesViewset
from contentcuration.viewsets.common import NotNullArrayAgg
from contentcuration.viewsets.common import SQCount
from contentcuration.viewsets.common import UUIDInFilter


class ContentNodeFilter(FilterSet):
    id__in = UUIDInFilter(name="id")
    channel_root = CharFilter(method="filter_channel_root")

    class Meta:
        model = ContentNode
        fields = ("parent", "id__in", "kind", "channel_root")

    def filter_channel_root(self, queryset, name, value):
        return queryset.filter(
            parent=Channel.objects.filter(pk=value).values_list(
                "main_tree__id", flat=True
            )
        )


class ContentNodeListSerializer(BulkListSerializer):
    def gather_prerequisites(self, validated_data, add_empty=True):
        prerequisite_ids_by_id = {}

        for obj in validated_data:
            try:
                prerequisites = obj.pop("prerequisite")
                prerequisite_ids = [prereq.id for prereq in prerequisites]
            except KeyError:
                pass
            else:
                if add_empty or prerequisite_ids:
                    prerequisite_ids_by_id[obj["id"]] = prerequisite_ids
        return prerequisite_ids_by_id

    def set_prerequisites(self, prerequisite_ids_by_id):
        prereqs_to_create = []
        prereqs_to_delete = []
        current_prereqs = PrerequisiteContentRelationship.objects.filter(
            target_node__in=prerequisite_ids_by_id.keys()
        )
        current_prereqs_by_id = {}
        for prereq in current_prereqs:
            if prereq.target_node.id not in current_prereqs_by_id:
                current_prereqs_by_id[prereq.target_node.id] = []
            current_prereqs_by_id[prereq.target_node.id].append(prereq)
        for target_node_id, prereq_ids in prerequisite_ids_by_id.items():
            current = current_prereqs_by_id.get(target_node_id, [])
            ids_set = set(prereq_ids)
            current_set = set()
            for prereq in current:
                if prereq.prerequisite.id not in ids_set:
                    prereqs_to_delete.append(prereq)
                else:
                    current_set.add(prereq.prerequisite)
            prereqs_to_create.extend(
                [
                    PrerequisiteContentRelationship(
                        target_node_id=target_node_id,
                        prerequisite_id=prereq_id
                    )
                    for prereq_id in ids_set - current_set
                ]
            )
        PrerequisiteContentRelationship.objects.filter(
            id__in=[p.id for p in prereqs_to_delete]
        ).delete()
        # Can simplify this in Django 2.2 by using bulk_create with ignore_conflicts
        # and just setting all required objects.
        PrerequisiteContentRelationship.objects.bulk_create(prereqs_to_create)

    def create(self, validated_data):
        prereqs = self.gather_prerequisites(validated_data, add_empty=False)
        all_objects = super(ContentNodeListSerializer, self).create(validated_data)
        if prereqs:
            self.set_prerequisites(prereqs)
        return all_objects

    def update(self, queryset, all_validated_data):
        # TODO: delete files that are no longer referenced
        prereqs = self.gather_prerequisites(all_validated_data)
        all_objects = super(ContentNodeListSerializer, self).update(
            queryset, all_validated_data
        )
        self.set_prerequisites(prereqs)
        return all_objects


class ContentNodeSerializer(BulkModelSerializer):
    """
    This is a write only serializer - we leverage it to do create and update
    operations, but read operations are handled by the Viewset.
    """

    prerequisite = PrimaryKeyRelatedField(many=True, queryset=ContentNode.objects.all())

    class Meta:
        model = ContentNode
        fields = (
            "id",
            "title",
            "description",
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
            "thumbnail_encoding",
        )
        list_serializer_class = ContentNodeListSerializer


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
        "original_channel_name",
        "original_node_id",
        "original_parent_id",
        "total_count",
        "resource_count",
        "coach_count",
        "thumbnail_checksum",
        "thumbnail_extension",
        "thumbnail_encoding",
        "published",
        "modified",
        "has_children",
        "parent_id",
    )

    field_map = {
        "language": "language_id",
        "license": "license_id",
        "tags": clean_content_tags,
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
        original_channel = Channel.objects.filter(pk=OuterRef("original_channel_id"))
        original_node = ContentNode.objects.filter(
            node_id=OuterRef("original_source_node_id")
        ).filter(node_id=F("original_source_node_id"))
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
            original_channel_name=Subquery(original_channel.values("name")[:1]),
            original_parent_id=Subquery(original_node.values("parent_id")[:1]),
            original_node_id=Subquery(original_node.values("pk")[:1]),
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
        serializer.save()

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
            tree_id=tree_id,
            parent_id=settings.ORPHANAGE_ROOT_ID,
            lft=1,
            rght=2,
            level=1,
        )
