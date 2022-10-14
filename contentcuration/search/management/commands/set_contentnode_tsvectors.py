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


logmodule.basicConfig(level=logmodule.INFO)
logging = logmodule.getLogger("command")

CHUNKSIZE = 10000


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("--channel-id", type=str, dest="channel_id",
                            help="The channel_id to annotate to the nodes. If not specified then each node's channel_id is queried and then annotated.")
        parser.add_argument("--tree-id", type=int, dest="tree_id",
                            help="Set tsvectors for a specific tree_id nodes only. If not specified then tsvectors for all nodes of ContentNode table are set.")
        parser.add_argument("--published", dest="published", action="store_true", help="Filters on whether node is published or not.")
        parser.add_argument("--complete", dest="complete", action="store_true", help="Filters on whether node is complete or not.")

    def get_tsvector_nodes_queryset(self, *args, **options):
        tsvector_nodes_queryset = get_fts_annotated_contentnode_qs(channel_id=options["channel_id"])

        if options["tree_id"]:
            tsvector_nodes_queryset = tsvector_nodes_queryset.filter(tree_id=options["tree_id"])

        if options["complete"]:
            tsvector_nodes_queryset = tsvector_nodes_queryset.filter(complete=True)

        if options["published"]:
            tsvector_nodes_queryset = tsvector_nodes_queryset.filter(published=True)

        tsvector_not_already_inserted_query = ~Exists(ContentNodeFullTextSearch.objects.filter(contentnode_id=OuterRef("id")))
        tsvector_nodes_queryset = (tsvector_nodes_queryset
                                   .filter(tsvector_not_already_inserted_query, channel_id__isnull=False)
                                   .values("id", "channel_id", "keywords_tsvector", "author_tsvector").order_by())

        return tsvector_nodes_queryset

    def handle(self, *args, **options):
        start = time.time()

        tsvector_nodes_queryset = self.get_tsvector_nodes_queryset(*args, **options)

        insertable_nodes_tsvector = list(tsvector_nodes_queryset[:CHUNKSIZE])
        total_tsvectors_inserted = 0

        while insertable_nodes_tsvector:
            logging.info("Inserting contentnode tsvectors.")

            insert_objs = list()
            for node in insertable_nodes_tsvector:
                obj = ContentNodeFullTextSearch(contentnode_id=node["id"], channel_id=node["channel_id"],
                                                keywords_tsvector=node["keywords_tsvector"], author_tsvector=node["author_tsvector"])
                insert_objs.append(obj)

            inserted_objs_list = ContentNodeFullTextSearch.objects.bulk_create(insert_objs)

            current_inserts_count = len(inserted_objs_list)
            total_tsvectors_inserted = total_tsvectors_inserted + current_inserts_count

            logging.info("Inserted {} contentnode tsvectors.".format(current_inserts_count))

            insertable_nodes_tsvector = list(tsvector_nodes_queryset[:CHUNKSIZE])

        logging.info("Completed! Successfully inserted total of {} contentnode tsvectors in {} seconds.".format(total_tsvectors_inserted, time.time() - start))
