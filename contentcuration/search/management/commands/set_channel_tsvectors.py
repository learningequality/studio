"""
This command inserts in bulk channel tsvectors to the ChannelFullTextSearch table.
"""
import logging as logmodule
import time

from django.core.management.base import BaseCommand
from django.db.models import Exists
from django.db.models import OuterRef
from search.models import ChannelFullTextSearch
from search.utils import get_fts_annotated_channel_qs


logmodule.basicConfig(level=logmodule.INFO)
logging = logmodule.getLogger("command")

CHUNKSIZE = 5000


class Command(BaseCommand):
    def handle(self, *args, **options):
        start = time.time()

        channel_not_already_inserted_query = ~Exists(
            ChannelFullTextSearch.objects.filter(channel_id=OuterRef("id"))
        )

        channel_query = (
            get_fts_annotated_channel_qs()
            .filter(
                channel_not_already_inserted_query,
                deleted=False,
                main_tree__published=True,
            )
            .values("id", "keywords_tsvector")
        )

        insertable_channels = list(channel_query[:CHUNKSIZE])
        total_channel_tsvectors_inserted = 0

        while insertable_channels:
            logging.info("Inserting channel tsvectors.")

            insert_objs = list()
            for channel in insertable_channels:
                obj = ChannelFullTextSearch(
                    channel_id=channel["id"],
                    keywords_tsvector=channel["keywords_tsvector"],
                )
                insert_objs.append(obj)

            inserted_objs_list = ChannelFullTextSearch.objects.bulk_create(insert_objs)

            current_inserts_count = len(inserted_objs_list)
            total_channel_tsvectors_inserted = (
                total_channel_tsvectors_inserted + current_inserts_count
            )

            logging.info("Inserted {} channel tsvectors.".format(current_inserts_count))

            insertable_channels = list(channel_query[:CHUNKSIZE])

        logging.info(
            "Completed! successfully inserted total of {} channel tsvectors in {} seconds.".format(
                total_channel_tsvectors_inserted, time.time() - start
            )
        )
