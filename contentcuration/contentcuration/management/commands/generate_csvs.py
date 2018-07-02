import csv
import os
import re

from django.conf import settings
from django.core.management.base import BaseCommand
from contentcuration.models import Channel
from contentcuration.utils.csv_writer import write_channel_csv_file

import logging as logmodule
logmodule.basicConfig()
logging = logmodule.getLogger(__name__)


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('channel_id', type=str)
        parser.add_argument('--force', action='store_true', dest='force', default=False)

    def handle(self, *args, **options):
        channel = Channel.objects.get(pk=options['channel_id'])

        logging.info("Writing CSV for {}".format(channel.name))

        csv_path = write_channel_csv_file(channel, force=options['force'], show_progress=True)

        logging.info("\n\nFinished writing to CSV at {}\n\n".format(csv_path))
