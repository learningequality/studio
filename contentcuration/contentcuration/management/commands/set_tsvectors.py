"""
This command sets tsvector in title_description_search_vector field in batches.
The batches are created on the basis of channel_id. This enables resumption. Also helps
in cases of failure or memory overflow.
"""
import logging as logmodule

from django.core.cache import cache
from django.core.management.base import BaseCommand

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import POSTGRES_SEARCH_VECTOR


logmodule.basicConfig(level=logmodule.INFO)
logging = logmodule.getLogger(__name__)


UPDATED_TS_VECTORS_CACHE_KEY = "tsvectors_updated_for_channel_ids"
UPDATED_TS_VECTORS_FOR_NULL_CHANNEL_CACHE_KEY = "tsvectors_updated_for_null_channels"


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument(
            "--public",
            action="store_true",
            help="Set tsvector for only the public channel nodes instead of all nodes.",
        )
        parser.add_argument(
            "--no-cache",
            action="store_true",
            help="Disables the cache. This updates all previously updated nodes.",
        )

    def handle(self, *args, **options):
        if options["no_cache"]:
            updated_channel_ids = []
            do_update_nodes_with_null_channel_id = True
        else:
            updated_channel_ids = [] if cache.get(UPDATED_TS_VECTORS_CACHE_KEY) is None else cache.get(UPDATED_TS_VECTORS_CACHE_KEY)
            do_update_nodes_with_null_channel_id = not cache.get(UPDATED_TS_VECTORS_FOR_NULL_CHANNEL_CACHE_KEY)

        if options["public"]:
            to_update_channel_ids = list(Channel.get_public_channels().exclude(id__in=updated_channel_ids).values_list("id", flat=True))
            do_update_nodes_with_null_channel_id = False
            logging.info("Started setting tsvector for public channel nodes.")
        else:
            to_update_channel_ids = list(Channel.objects.exclude(id__in=updated_channel_ids).values_list("id", flat=True))
            logging.info("Started setting tsvector for all nodes.")

        annotated_contentnode_qs = ContentNode._annotate_channel_id(ContentNode.objects)

        for channel_id in to_update_channel_ids:
            logging.info("Setting tsvector for nodes of channel {}.".format(channel_id))
            annotated_contentnode_qs.filter(channel_id=channel_id).update(title_description_search_vector=POSTGRES_SEARCH_VECTOR)
            updated_channel_ids.append(channel_id)
            cache.set(UPDATED_TS_VECTORS_CACHE_KEY, updated_channel_ids, None)
            logging.info("Finished setting tsvector for nodes of channel {}.".format(channel_id))

        if do_update_nodes_with_null_channel_id:
            logging.info("Setting tsvector for nodes with NULL channel_id.")
            annotated_contentnode_qs.filter(channel_id__isnull=True).update(title_description_search_vector=POSTGRES_SEARCH_VECTOR)
            cache.set(UPDATED_TS_VECTORS_FOR_NULL_CHANNEL_CACHE_KEY, True, None)
            logging.info("Finished setting tsvector for nodes with NULL channel_id.")

        if options["public"]:
            logging.info("Finished setting tsvector for public channel nodes.")
        else:
            logging.info("Finished setting tsvector for all nodes.")
