import sqlite3
import sys
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand
from le_utils.constants import content_kinds,file_formats, format_presets, licenses, exercises
from contentcuration import models
import logging as logmodule
from django.core.cache import cache
logging = logmodule.getLogger(__name__)

class EarlyExit(BaseException):
    def __init__(self, message, db_path):
        self.message = message
        self.db_path = db_path

class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('channel_id', type=str)

    def handle(self, *args, **options):
        try:
        	channel_id = options['channel_id']
			conn = sqlite3.connect('{}.db'.format(channel_id))

			for row in c.execute('SELECT * FROM content_file'):
			    print row

        except EarlyExit as e:
            logging.warning("Exited early due to {message}.".format(
                message=e.message))
            self.stdout.write("You can find your database in {path}".format(
                path=e.db_path))
