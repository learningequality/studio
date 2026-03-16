import csv
import io
import logging
import time
import uuid
from pathlib import Path
from typing import Optional
from typing import Tuple

from django.core.management.base import BaseCommand
from django.db.models import Exists
from django.db.models import FilteredRelation
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models.expressions import F
from django_cte import With

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import License


logger = logging.getLogger(__name__)


class LicensingFixesLookup(object):
    """Consolidates logic for reading and processing the licensing fixes from the CSV"""

    def __init__(self):
        self._lookup = {}
        self._license_lookup = {}

    def load(self, fp: io.TextIOWrapper):
        """Loads the data from the CSV file, and the necessary license data from the database"""
        reader = csv.DictReader(fp)
        license_names = set()

        # create a lookup index by channel ID from the CSV data
        for row in reader:
            lookup_key = f"{uuid.UUID(row['channel_id']).hex}:{row.get('kind', '')}"
            self._lookup[lookup_key] = row
            if row["license_name"]:
                license_names.add(row["license_name"])

        # load all licenses, regardless of whether they are named in the CSV
        license_lookup_by_name = {}
        for lic in License.objects.all():
            self._license_lookup[lic.id] = lic
            license_lookup_by_name[lic.license_name] = lic
            license_names.discard(lic.license_name)

        # ensure we've found all the licenses
        if len(license_names):
            raise ValueError(f"Could not find all licenses: {license_names}")

        # we now are certain all licenses are found
        for info in self._lookup.values():
            if info["license_name"]:
                info["license_id"] = license_lookup_by_name[info["license_name"]].id

    def get_info(
        self,
        channel_id: str,
        kind: str,
        license_id: Optional[int],
        license_description: Optional[str],
        copyright_holder: Optional[str],
    ) -> Tuple[Optional[int], Optional[str], Optional[str]]:
        """
        Determines the complete licensing metadata, given the current metadata, and comparing it
        with what would make the node complete.

        :param channel_id: The channel the node was sourced from
        :param kind: The content kind of the node
        :param license_id: The current license_id of the node
        :param license_description: The current license_description of the node
        :param copyright_holder: The current copyright_holder of the node
        :return: A tuple of (license_id, license_description, copyright_holder) to use on the node
        """
        # first check kind-specific metadata, fallback to channel-wide (no kind)
        info = self._lookup.get(f"{channel_id}:{kind}", None)
        if info is None:
            info = self._lookup.get(f"{channel_id}:", None)

        if info is None:
            logger.warning(f"Failed to find licensing info for channel: {channel_id}")
            return license_id, license_description, copyright_holder

        if not license_id:
            license_id = info["license_id"]

        if not license_id:
            return None, license_description, copyright_holder

        license_obj = self._license_lookup.get(license_id)

        if license_obj.is_custom and not license_description:
            license_description = info["license_description"]

        if license_obj.copyright_holder_required and not copyright_holder:
            copyright_holder = info["copyright_holder"]

        return license_id, license_description, copyright_holder


class Command(BaseCommand):
    """
    Audits nodes that have imported content from public channels and whether the imported content
    has a missing source node. We've determined that pretty much all of these have incomplete
    licensing data
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
        total_fixed = 0
        lookup = LicensingFixesLookup()

        command_dir = Path(__file__).parent
        csv_path = command_dir / "licensing_fixes_lookup.csv"

        with csv_path.open("r", encoding="utf-8", newline="") as csv_file:
            lookup.load(csv_file)

        # skip using an iterator here, to limit transaction duration to `handle_channel`
        for channel in destination_channels:
            node_count = self.handle_channel(lookup, channel)

            if node_count > 0:
                total_fixed += node_count
                channel_count += 1

        logger.info("=== Done iterating over private destination channels. ===")
        logger.info(
            f"Fixed incomplete licensing data on {total_fixed} nodes across {channel_count} channels."
        )
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

    def handle_channel(self, lookup: LicensingFixesLookup, channel: dict) -> int:
        """
        Goes through the nodes of the channel, that were imported from public channels, but no
        longer have a valid source node. For each node, it applies license metadata as necessary

        :param lookup: The lookup utility to pull licensing data from
        :param channel: The channel to fix
        :return: The total node count that are now marked complete as a result of the fixes
        """
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
        )

        # Count and log results
        node_count = missing_source_nodes.count()
        processed = 0
        was_complete = 0
        unfixed = 0
        now_complete = 0

        def _log():
            logger.info(
                f"Fixing {channel_id}:{channel_name}\ttotal: {node_count}; before: {was_complete} unfixed: {unfixed}; after: {now_complete};"
            )

        if node_count > 0:
            for node in missing_source_nodes.iterator():
                # determine the new license metadata
                license_id, license_description, copyright_holder = lookup.get_info(
                    node.original_channel_id,
                    node.kind_id,
                    node.license_id,
                    node.license_description,
                    node.copyright_holder,
                )

                # if there isn't a license, there's nothing to do
                if not license_id:
                    unfixed += 1
                    # cannot fix
                    continue

                if node.complete:
                    was_complete += 1

                # apply updates
                node.license_id = license_id
                node.license_description = license_description
                node.copyright_holder = copyright_holder
                if not node.mark_complete():
                    now_complete += 1
                node.save()
                processed += 1
                if processed % 100 == 0:
                    _log()

            _log()

        return now_complete - was_complete
