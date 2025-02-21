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
from contentcuration.models import User
from contentcuration.utils.publish import publish_channel

logger = logging.getLogger(__file__)


class Command(BaseCommand):

    def add_arguments(self, parser):

        parser.add_argument(
            '--is_test',
            action='store_true',
            help="Indicate if the command is running in a test environment.",
        )

        parser.add_argument(
            '--user_id',
            type=int,
            help="User ID for the operation",
        )

    def handle(self, *args, **options):

        is_test = options['is_test']
        user_id = options['user_id']

        if not is_test:
            user_id = User.objects.get(email='channeladmin@learningequality.org').pk

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

        channel_ids_to_republish = set()

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
                # original source node exists and its license_description doesn't match
                # update the base node
                if base_node.license_description != original_source_node[0].license_description:
                    base_node.license_description = original_source_node[0].license_description
                base_node.save()

                if to_be_republished and base_channel.last_published is not None:
                    channel_ids_to_republish.add(base_channel.id)

        # we would republish the channel
        for channel_id in channel_ids_to_republish:
            publish_channel(user_id, channel_id)
