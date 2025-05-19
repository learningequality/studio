import logging

from django.core.management.base import BaseCommand

from contentcuration.utils.import_tools import import_channel

logger = logging.getLogger("command")


class Command(BaseCommand):
    def add_arguments(self, parser):
        # ID of channel to read data from
        parser.add_argument("source_id", type=str)

        # ID of channel to write data to (can be same as source channel)
        parser.add_argument("--target", help="restore channel db to TARGET CHANNEL ID")
        parser.add_argument("--download-url", help="where to download db from")
        parser.add_argument("--editor", help="add user as editor to channel")

    def handle(self, *args, **options):
        # Set up variables for restoration process
        logger.info("\n\n********** STARTING CHANNEL RESTORATION **********")
        source_id = options["source_id"]
        target_id = options.get("target") or source_id
        download_url = options.get("download_url")
        editor = options.get("editor")

        import_channel(source_id, target_id, download_url, editor, logger=logger)
