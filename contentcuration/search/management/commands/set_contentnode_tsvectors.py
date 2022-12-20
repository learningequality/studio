"""
This command inserts in bulk contentnode tsvectors to the ContentNodeFullTextSearch table.
"""
import logging as logmodule
import time

from django.contrib.postgres.aggregates import StringAgg
from django.core.management.base import BaseCommand
from django.db.models import Exists
from django.db.models import OuterRef
from django.db.models import Value
from search.constants import CONTENTNODE_AUTHOR_TSVECTOR
from search.constants import CONTENTNODE_KEYWORDS_TSVECTOR
from search.models import ContentNodeFullTextSearch

from contentcuration.models import Channel
from contentcuration.models import ContentNode


logmodule.basicConfig(level=logmodule.INFO)
logging = logmodule.getLogger(__name__)

CHUNKSIZE = 10000


class Command(BaseCommand):

    def handle(self, *args, **options):
        start = time.time()

        all_published_channels = list(Channel.objects.filter(main_tree__published=True, deleted=False).values("id", "main_tree__tree_id"))

        total_tsvectors_inserted = 0

        for published_channel in all_published_channels:
            tsvector_not_already_inserted_query = ~Exists(ContentNodeFullTextSearch.objects.filter(contentnode_id=OuterRef("id")))
            tsvector_nodes_query = (ContentNode.objects
                                    .annotate(channel_id=Value(published_channel["id"]),
                                              contentnode_tags=StringAgg("tags__tag_name", delimiter=" "),
                                              keywords_tsvector=CONTENTNODE_KEYWORDS_TSVECTOR,
                                              author_tsvector=CONTENTNODE_AUTHOR_TSVECTOR)
                                    .filter(tsvector_not_already_inserted_query, tree_id=published_channel["main_tree__tree_id"])
                                    .values("id", "channel_id", "keywords_tsvector", "author_tsvector")
                                    .order_by())

            insertable_nodes_tsvector = list(tsvector_nodes_query[:CHUNKSIZE])
            logging.info("Inserting contentnode tsvectors of channel {}.".format(published_channel["id"]))

            while insertable_nodes_tsvector:
                insert_objs = list()
                for node in insertable_nodes_tsvector:
                    obj = ContentNodeFullTextSearch(contentnode_id=node["id"], channel_id=node["channel_id"],
                                                    keywords_tsvector=node["keywords_tsvector"], author_tsvector=node["author_tsvector"])
                    insert_objs.append(obj)

                inserted_objs_list = ContentNodeFullTextSearch.objects.bulk_create(insert_objs)

                current_inserts_count = len(inserted_objs_list)
                total_tsvectors_inserted = total_tsvectors_inserted + current_inserts_count

                logging.info("Inserted {} contentnode tsvectors of channel {}.".format(current_inserts_count, published_channel["id"]))

                insertable_nodes_tsvector = list(tsvector_nodes_query[:CHUNKSIZE])

            logging.info("Insertion complete for channel {}.".format(published_channel["id"]))

        logging.info("Completed! Successfully inserted total of {} contentnode tsvectors in {} seconds.".format(total_tsvectors_inserted, time.time() - start))
