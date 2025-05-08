"""
This command inserts in bulk contentnode tsvectors to the ContentNodeFullTextSearch table.
"""
import logging as logmodule
import time

from django.core.management.base import BaseCommand
from django.db.models import Exists
from django.db.models import OuterRef
from search.models import ContentNodeFullTextSearch
from search.utils import get_fts_annotated_contentnode_qs

from contentcuration.models import Channel


logmodule.basicConfig(level=logmodule.INFO)
logging = logmodule.getLogger(__name__)

CHUNKSIZE = 10000


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            "--channel-id",
            type=str,
            dest="channel_id",
            help="The channel_id for which tsvectors need to be generated.\
                            If not specified then tsvectors is generated for all published channels.",
        )
        parser.add_argument(
            "--published",
            dest="published",
            action="store_true",
            help="Filters on whether channel's contentnodes are published or not.",
        )

    def handle(self, *args, **options):
        start = time.time()

        if options["channel_id"]:
            generate_tsv_for_channels = list(
                Channel.objects.filter(id=options["channel_id"]).values(
                    "id", "main_tree__tree_id"
                )
            )
        else:
            generate_tsv_for_channels = list(
                Channel.objects.filter(main_tree__published=True, deleted=False).values(
                    "id", "main_tree__tree_id"
                )
            )

        if options["published"]:
            publish_filter_dict = dict(published=True)
        else:
            publish_filter_dict = dict()

        total_tsvectors_inserted = 0

        for channel in generate_tsv_for_channels:
            tsvector_not_already_inserted_query = ~Exists(
                ContentNodeFullTextSearch.objects.filter(contentnode_id=OuterRef("id"))
            )
            tsvector_nodes_query = (
                get_fts_annotated_contentnode_qs(channel["id"])
                .filter(
                    tsvector_not_already_inserted_query,
                    tree_id=channel["main_tree__tree_id"],
                    complete=True,
                    **publish_filter_dict
                )
                .values("id", "channel_id", "keywords_tsvector", "author_tsvector")
                .order_by()
            )

            insertable_nodes_tsvector = list(tsvector_nodes_query[:CHUNKSIZE])

            logging.info(
                "Inserting contentnode tsvectors of channel {}.".format(channel["id"])
            )

            while insertable_nodes_tsvector:
                insert_objs = list()
                for node in insertable_nodes_tsvector:
                    obj = ContentNodeFullTextSearch(
                        contentnode_id=node["id"],
                        channel_id=node["channel_id"],
                        keywords_tsvector=node["keywords_tsvector"],
                        author_tsvector=node["author_tsvector"],
                    )
                    insert_objs.append(obj)

                inserted_objs_list = ContentNodeFullTextSearch.objects.bulk_create(
                    insert_objs
                )

                current_inserts_count = len(inserted_objs_list)
                total_tsvectors_inserted = (
                    total_tsvectors_inserted + current_inserts_count
                )

                logging.info(
                    "Inserted {} contentnode tsvectors of channel {}.".format(
                        current_inserts_count, channel["id"]
                    )
                )

                insertable_nodes_tsvector = list(tsvector_nodes_query[:CHUNKSIZE])

            logging.info("Insertion complete for channel {}.".format(channel["id"]))

        logging.info(
            "Completed! Successfully inserted total of {} contentnode tsvectors in {} seconds.".format(
                total_tsvectors_inserted, time.time() - start
            )
        )
