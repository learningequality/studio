import os
import logging as logmodule

from django.core.management.base import BaseCommand

from contentcuration.utils.archive import archive_channel_tree

logmodule.basicConfig()
logging = logmodule.getLogger(__name__)


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("channel_id", type=str)
        parser.add_argument("--tree", default='main')

    def handle(self, *args, **options):
        channel_id = options["channel_id"]
        tree = options["tree"]

        archive_path = archive_channel_tree(channel_id, tree=tree)

        if os.path.exists(archive_path):
            self.stdout.write("Archive saved to {}".format(archive_path))
        else:
            logging.warning("Channel archive failed.")

