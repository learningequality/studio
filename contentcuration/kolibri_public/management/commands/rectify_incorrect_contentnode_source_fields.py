import logging

from django.core.management.base import BaseCommand
from django.db.models import Exists
from django.db.models import F
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Value
from django.db.models.functions import Coalesce
from django_cte import With

from contentcuration.models import Channel
from contentcuration.models import ContentNode

logger = logging.getLogger(__file__)


class Command(BaseCommand):
    def handle(self, *args, **options):
        main_trees_cte = With(
            (
                Channel.objects.filter(
                    deleted=False, last_published__isnull=False, main_tree__isnull=False
                )
                .annotate(channel_id=F("id"))
                .values("channel_id", tree_id=F("main_tree__tree_id"))
            ),
            name="main_trees",
        )

        source_original_node_cte = With(
            (
                Channel.objects.filter(main_tree__isnull=False)
                .annotate(channel_id=F("id"))
                .values("channel_id", tree_id=F("main_tree__tree_id"))
            ),
            name="source_original_nodes",
        )

        nodes = main_trees_cte.join(
            ContentNode.objects.filter(published=True),
            tree_id=main_trees_cte.col.tree_id,
        ).annotate(channel_id=main_trees_cte.col.channel_id)

        parent_nodes = source_original_node_cte.join(
            ContentNode.objects.all(), tree_id=source_original_node_cte.col.tree_id
        ).annotate(channel_id=source_original_node_cte.col.channel_id)

        original_source_nodes = (
            parent_nodes.with_cte(source_original_node_cte)
            .filter(
                node_id=OuterRef("original_source_node_id"),
            )
            .exclude(
                tree_id=OuterRef("tree_id"),
            )
            .annotate(
                coalesced_provider=Coalesce("provider", Value("")),
                coalesced_author=Coalesce("author", Value("")),
                coalesced_aggregator=Coalesce("aggregator", Value("")),
                coalesced_license_id=Coalesce("license_id", -1),
            )
        )

        diff = (
            nodes.with_cte(main_trees_cte).filter(
                source_node_id__isnull=False,
                original_source_node_id__isnull=False,
                published=True,
            )
        ).annotate(
            coalesced_provider=Coalesce("provider", Value("")),
            coalesced_author=Coalesce("author", Value("")),
            coalesced_aggregator=Coalesce("aggregator", Value("")),
            coalesced_license_id=Coalesce("license_id", -1),
        )

        diff_combined = diff.annotate(
            original_source_node_f_changed=Exists(
                original_source_nodes.filter(
                    ~Q(coalesced_provider=OuterRef("coalesced_provider"))
                    | ~Q(coalesced_author=OuterRef("coalesced_author"))
                    | ~Q(coalesced_aggregator=OuterRef("coalesced_aggregator"))
                    | ~Q(coalesced_license_id=OuterRef("coalesced_license_id"))
                )
            )
        ).filter(original_source_node_f_changed=True)

        final_nodes = diff_combined.values(
            "id",
            "original_channel_id",
            "original_source_node_id",
            "coalesced_provider",
            "coalesced_author",
            "coalesced_aggregator",
            "coalesced_license_id",
            "original_source_node_f_changed",
        ).order_by()

        for item in final_nodes:
            base_node = ContentNode.objects.get(pk=item["id"])

            original_source_channel_id = item["original_channel_id"]
            original_source_node_id = item["original_source_node_id"]
            tree_id = (
                Channel.objects.filter(pk=original_source_channel_id)
                .values_list("main_tree__tree_id", flat=True)
                .get()
            )
            original_source_node = ContentNode.objects.filter(
                tree_id=tree_id, node_id=original_source_node_id
            )

            if original_source_channel_id is not None and original_source_node.exists():
                # original source node exists and its source fields dont match
                # update the base node
                if base_node[0].author != original_source_node[0].author:
                    base_node[0].author = original_source_node[0].author
                if base_node[0].provider != original_source_node[0].provider:
                    base_node[0].provider = original_source_node[0].provider
                if base_node[0].aggregator != original_source_node[0].aggregator:
                    base_node[0].aggregator = original_source_node[0].aggregator
                if base_node[0].license != original_source_node[0].license:
                    base_node[0].license = original_source_node[0].license

                base_node[0].save()

            else:
                continue
