import logging

from django.core.management.base import BaseCommand

from contentcuration.utils.import_tools import ImportManager

logger = logging.getLogger("command")


class Command(BaseCommand):
    """
    This command is used to restore a channel from another Studio instance. This is for
    development purposes only and should not be used in production.
    """

    def add_arguments(self, parser):
        # ID of channel to read data from
        parser.add_argument("source_id", type=str)

        # ID of channel to write data to (can be same as source channel)
        parser.add_argument(
            "--target",
            help="A different channel ID for which to restore the channel. If not provided, the source channel ID will be used.",
        )
        parser.add_argument(
            "--source-url",
            default="http://localhost:8080",
            help="Studio instance from which to download the channel DB or content files",
        )
        parser.add_argument("--token", help="API token for the Studio instance")
        parser.add_argument(
            "--editor",
            default="a@a.com",
            help="Add user as editor to channel with provided email address",
        )
        parser.add_argument(
            "--download-content",
            action="store_true",
            default=False,
            help="Whether to download content files",
        )
        parser.add_argument(
            "--public",
            action="store_true",
            default=False,
            help="Whether to make the channel public",
        )
        parser.add_argument(
            "--publish",
            action="store_true",
            default=False,
            help="Whether to publish the channel after restoration",
        )

    def handle(self, *args, **options):
        manager = ImportManager(
            options["source_url"],
            options["source_id"],
            target_id=options.get("target"),
            editor=options.get("editor"),
            public=options.get("public"),
            publish=options.get("publish"),
            token=options.get("token"),
            download_content=options.get("download_content"),
        )
        manager.run()
