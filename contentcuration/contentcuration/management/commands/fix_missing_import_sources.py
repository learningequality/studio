import csv
import logging
import time

from django.core.management.base import BaseCommand
from django.db.models import Exists
from django.db.models import FilteredRelation
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models.expressions import F
from django_cte import With

from contentcuration.models import Channel
from contentcuration.models import ContentNode


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """
    Audits nodes that have imported content from public channels and whether the imported content
    has a missing source node.

    TODO: this does not yet FIX them
    """

    def handle(self, *args, **options):
        start = time.time()

        public_cte = self.get_public_cte()

        # preliminary filter on channels to those private and non-deleted, which have content
        # lft=1 is always true for root nodes, so rght>2 means it actually has children
        private_channels_cte = With(
            Channel.objects.filter(
                public=False,
                deleted=False,
            )
            .annotate(
                non_empty_main_tree=FilteredRelation(
                    "main_tree", condition=Q(main_tree__rght__gt=2)
                ),
            )
            .annotate(
                tree_id=F("non_empty_main_tree__tree_id"),
            )
            .values("id", "name", "tree_id"),
            name="dest_channel_cte",
        )

        # reduce the list of private channels to those that have an imported node
        # from a public channel
        destination_channels = (
            private_channels_cte.queryset()
            .with_cte(public_cte)
            .with_cte(private_channels_cte)
            .filter(
                Exists(
                    public_cte.join(
                        ContentNode.objects.filter(
                            tree_id=OuterRef("tree_id"),
                        ),
                        original_channel_id=public_cte.col.id,
                    )
                )
            )
            .values("id", "name", "tree_id")
            .order_by("id")
        )

        logger.info("=== Iterating over private destination channels. ===")
        channel_count = 0
        total_node_count = 0

        with open("fix_missing_import_sources.csv", "w", newline="") as csv_file:
            csv_writer = csv.DictWriter(
                csv_file,
                fieldnames=[
                    "channel_id",
                    "channel_name",
                    "contentnode_id",
                    "contentnode_title",
                    "public_channel_id",
                    "public_channel_name",
                    "public_channel_deleted",
                ],
            )
            csv_writer.writeheader()

            for channel in destination_channels.iterator():
                node_count = self.handle_channel(csv_writer, channel)

                if node_count > 0:
                    total_node_count += node_count
                    channel_count += 1

        logger.info("=== Done iterating over private destination channels. ===")
        logger.info(f"Found {total_node_count} nodes across {channel_count} channels.")
        logger.info(f"Finished in {time.time() - start}")

    def get_public_cte(self) -> With:
        # This CTE gets all public channels with their main tree info
        return With(
            Channel.objects.filter(public=True)
            .annotate(
                tree_id=F("main_tree__tree_id"),
            )
            .values("id", "name", "deleted", "tree_id"),
            name="public_cte",
        )

    def handle_channel(self, csv_writer: csv.DictWriter, channel: dict) -> int:
        public_cte = self.get_public_cte()
        channel_id = channel["id"]
        channel_name = channel["name"]
        tree_id = channel["tree_id"]

        missing_source_nodes = (
            public_cte.join(
                ContentNode.objects.filter(tree_id=tree_id),
                original_channel_id=public_cte.col.id,
            )
            .with_cte(public_cte)
            .annotate(
                public_channel_id=public_cte.col.id,
                public_channel_name=public_cte.col.name,
                public_channel_deleted=public_cte.col.deleted,
            )
            .filter(
                Q(public_channel_deleted=True)
                | ~Exists(
                    ContentNode.objects.filter(
                        tree_id=public_cte.col.tree_id,
                        node_id=OuterRef("original_source_node_id"),
                    )
                )
            )
            .values(
                "public_channel_id",
                "public_channel_name",
                "public_channel_deleted",
                contentnode_id=F("id"),
                contentnode_title=F("title"),
            )
        )

        # Count and log results
        node_count = missing_source_nodes.count()

        # TODO: this will be replaced with logic to correct the missing source nodes
        if node_count > 0:
            logger.info(
                f"{channel_id}:{channel_name}\t{node_count} node(s) with missing source nodes."
            )
            row_dict = {
                "channel_id": channel_id,
                "channel_name": channel_name,
            }
            for node_dict in missing_source_nodes.iterator():
                row_dict.update(node_dict)
                csv_writer.writerow(row_dict)

        return node_count
