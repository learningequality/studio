import json
import os
import pprint
from django.conf import settings
from django.core.management.base import BaseCommand
from contentcuration.views.internal import get_full_node_diff
from contentcuration.models import Channel

import logging as logmodule
logmodule.basicConfig()
logging = logmodule.getLogger(__name__)

if not os.path.exists(settings.JSON_ROOT):
    os.makedirs(settings.JSON_ROOT)

class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('channel_id', type=str)

    def handle(self, *args, **options):
        channel = Channel.objects.get(pk=options['channel_id'])
        if not channel.staging_tree:
            logging.error("Cannot get staging diff for channel {}: No staging tree found".format(channel.pk))
            return

        diff = get_full_node_diff(channel)

        filepath = os.path.join(settings.JSON_ROOT, "{}.json".format(channel.pk))
        with open(filepath, 'wb') as jsonfile:
            json.dump(diff, jsonfile, ensure_ascii=False, indent=4, sort_keys=True)

        pp = pprint.PrettyPrinter(indent=2)
        pp.pprint(diff)

        logging.info("\n\n\nCreated file at {}".format(filepath))
