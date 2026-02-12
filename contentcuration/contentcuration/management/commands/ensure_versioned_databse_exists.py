"""
Management command to ensure all published channels have versioned content databases.

This command iterates through all published channels and ensures they have a versioned
content database for their most recent version. For old channels that were published
before versioned databases were introduced, this copies the unversioned database
to create the versioned one.
"""
import logging

from django.core.management.base import BaseCommand

from contentcuration.models import Channel
from contentcuration.utils.publish import ensure_versioned_database_exists

logging.basicConfig()
logger = logging.getLogger("command")


class Command(BaseCommand):
    help = "Ensure all published channels have versioned content databases."

    def handle(self, *args, **options):
        published_channels = Channel.objects.filter(main_tree__published=True)

        processed_count = 0
        error_count = 0

        for channel in published_channels.iterator():
            try:
                if channel.version > 0:
                    ensure_versioned_database_exists(channel.id, channel.version)
                    processed_count += 1
                    if processed_count % 100 == 0:
                        logger.info(f"Processed {processed_count} channels...")
                else:
                    logger.warning(
                        f"Channel {channel.id} has main_tree.published=Truebut version=0, skipping."
                    )
            except Exception as e:
                error_count += 1
                logger.error(
                    f"Error ensuring versioned database for channel {channel.id}: {e}"
                )

        logger.info(
            f"Completed: processed {processed_count} channels, {error_count} errors"
        )
