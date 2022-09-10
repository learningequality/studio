"""
This command inserts in bulk contentnode tsvectors to the ContentNodeFullTextSearch table.
"""
import logging as logmodule
import time

from django.contrib.postgres.aggregates import StringAgg
from django.core.management.base import BaseCommand
from django.db.models import Exists
from django.db.models import OuterRef
from search.constants import CONTENTNODE_AUTHOR_TSVECTOR
from search.constants import CONTENTNODE_KEYWORDS_TSVECTOR
from search.models import ContentNodeFullTextSearch

from contentcuration.models import ContentNode


logmodule.basicConfig(level=logmodule.INFO)
logging = logmodule.getLogger("command")

CHUNKSIZE = 10000


class Command(BaseCommand):

    def handle(self, *args, **options):
        start = time.time()

        tsvector_not_already_inserted_query = ~Exists(ContentNodeFullTextSearch.objects.filter(contentnode_id=OuterRef("id")))

        tsvector_node_query = (ContentNode._annotate_channel_id(ContentNode.objects)
                               .annotate(contentnode_tags=StringAgg("tags__tag_name", delimiter=" "),
                                         keywords_tsvector=CONTENTNODE_KEYWORDS_TSVECTOR,
                                         author_tsvector=CONTENTNODE_AUTHOR_TSVECTOR)
                               .filter(tsvector_not_already_inserted_query, published=True)
                               .values("id", "channel_id", "keywords_tsvector", "author_tsvector").order_by())

        insertable_nodes_tsvector = list(tsvector_node_query[:CHUNKSIZE])
        total_tsvectors_inserted = 0

        while insertable_nodes_tsvector:
            logging.info("Inserting contentnode tsvectors.")

            insert_objs = list()
            for node in insertable_nodes_tsvector:
                if node["channel_id"]:
                    obj = ContentNodeFullTextSearch(contentnode_id=node["id"], channel_id=node["channel_id"],
                                                    keywords_tsvector=node["keywords_tsvector"], author_tsvector=node["author_tsvector"])
                    insert_objs.append(obj)

            inserted_objs_list = ContentNodeFullTextSearch.objects.bulk_create(insert_objs)

            current_inserts_count = len(inserted_objs_list)
            total_tsvectors_inserted = total_tsvectors_inserted + current_inserts_count

            logging.info("Inserted {} contentnode tsvectors.".format(current_inserts_count))

            insertable_nodes_tsvector = list(tsvector_node_query[:CHUNKSIZE])

        logging.info("Completed! Successfully inserted total of {} contentnode tsvectors in {} seconds.".format(total_tsvectors_inserted, time.time() - start))
