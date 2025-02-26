import logging

from django.core.management.base import BaseCommand
from django.db.models import Exists
from django.db.models import F
from django.db.models import OuterRef
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
                     main_tree__isnull=False
                )
                .annotate(channel_id=F("id"))
                .values("channel_id", "deleted", tree_id=F("main_tree__tree_id"))
            ),
            name="main_trees",
        )

        nodes = main_trees_cte.join(
            ContentNode.objects.all(),
            tree_id=main_trees_cte.col.tree_id,
        ).annotate(channel_id=main_trees_cte.col.channel_id, deleted=main_trees_cte.col.deleted)

        original_source_nodes = (
            nodes.with_cte(main_trees_cte)
            .filter(
                node_id=OuterRef("original_source_node_id"),
            )
            .exclude(
                tree_id=OuterRef("tree_id"),
            )
            .annotate(
                coalesced_license_description=Coalesce("license_description", Value("")),
            )
        )
        diff = (
            nodes.with_cte(main_trees_cte).filter(
                deleted=False,  # we dont want the channel to be deleted or else we are fixing ghost nodes
                source_node_id__isnull=False,
                original_source_node_id__isnull=False,
            )
        ).annotate(
            coalesced_license_description=Coalesce("license_description", Value("")),
        )
        diff_combined = diff.annotate(
            original_source_node_f_changed=Exists(
                original_source_nodes.exclude(
                    coalesced_license_description=OuterRef("coalesced_license_description")
                )
            )
        ).filter(original_source_node_f_changed=True)

        final_nodes = diff_combined.values(
            "id",
            "channel_id",
            "original_channel_id",
            "original_source_node_id",
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
                # original source node exists and its license_description doesn't match
                # update the base node
                if base_node.license_description != original_source_node[0].license_description:
                    base_node.license_description = original_source_node[0].license_description
                base_node.save()
