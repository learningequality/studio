import datetime
import logging

from django.core.management.base import BaseCommand
from django.db.models import Exists
from django.db.models import F
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Value
from django.db.models.functions import Coalesce
from django.utils import timezone
from django_cte import With

from contentcuration.models import Channel
from contentcuration.models import ContentNode

logger = logging.getLogger(__file__)


class Command(BaseCommand):
    def handle(self, *args, **options):
        # Filter Date : July 9, 2023
        # Link https://github.com/learningequality/studio/pull/4189
        # The PR date for the frontend change is July 10, 2023
        # we would set the filter day one day back just to be sure
        filter_date = datetime.datetime(2023, 7, 9, tzinfo=timezone.utc)
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
        ).annotate(channel_id=main_trees_cte.col.channel_id, deletd=main_trees_cte.col.deleted)

        original_source_nodes = (
            nodes.with_cte(main_trees_cte)
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
        # We filter out according to last_modified date before this PR
        # https://github.com/learningequality/studio/pull/4189
        # As we want to lossen up the public=True Filter and open the
        # migration for all the nodes even if they are not published
        diff = (
            nodes.with_cte(main_trees_cte).filter(
                deleted=False,  # we dont want the channel to be deleted or else we are fixing ghost nodes
                source_node_id__isnull=False,
                original_source_node_id__isnull=False,
                modified__lt=filter_date
                # published=True,
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

            base_channel = Channel.objects.get(pk=item['channel_id'])

            to_be_republished = not (base_channel.main_tree.get_family().filter(changed=True).exists())

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

                if to_be_republished and base_channel.public:
                    # we would repbulsih the channel
                    pass
            else:
                continue
