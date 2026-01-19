import logging as logmodule

from contentcuration.models import Channel, ChannelVersion
from django.core.management.base import BaseCommand

logging = logmodule.getLogger("command")

class Command(BaseCommand):
    def handle(self, *args, **options):
        logging.info("Creating channel versions")

        channels = Channel.objects.filter(version__gt=0)

        # Create ChannelVersions for each published version and set version_info
        # to the most recent ChannelVersion instance
        for channel in channels.iterator():
            last_created_ch_ver = None
            for pub_data in channel.published_data.values():

                # Create a new channel version
                last_created_ch_ver = ChannelVersion.objects.create(
                    channel=channel,
                    version=channel.version + 1,
                    published_data=pub_data,
                )
            channel.version_info = last_created_ch_ver
