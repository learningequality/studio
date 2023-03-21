import logging
import os
import shutil
import tempfile

from django.conf import settings
from django.core.files.storage import default_storage as storage
from django.core.management import call_command
from django.core.management.base import BaseCommand
from kolibri_content.apps import KolibriContentConfig
from kolibri_content.models import ChannelMetadata as ExportedChannelMetadata
from kolibri_content.router import get_active_content_database
from kolibri_content.router import using_content_database
from kolibri_public.models import ChannelMetadata
from kolibri_public.utils.mapper import ChannelMapper

from contentcuration.models import Channel

logger = logging.getLogger(__file__)


class Command(BaseCommand):

    def _export_channel(self, channel_id):
        logger.info("Putting channel {} into kolibri_public".format(channel_id))
        db_location = os.path.join(settings.DB_ROOT, "{id}.sqlite3".format(id=channel_id))
        with storage.open(db_location) as storage_file:
            with tempfile.NamedTemporaryFile(suffix=".sqlite3") as db_file:
                shutil.copyfileobj(storage_file, db_file)
                db_file.seek(0)
                with using_content_database(db_file.name):
                    # Run migration to handle old content databases published prior to current fields being added.
                    call_command("migrate", app_label=KolibriContentConfig.label, database=get_active_content_database())
                    channel = ExportedChannelMetadata.objects.get(id=channel_id)
                    logger.info("Found channel {} for id: {} mapping now".format(channel.name, channel_id))
                    mapper = ChannelMapper(channel)
                    mapper.run()

    def handle(self, *args, **options):
        public_channel_ids = set(Channel.objects.filter(public=True, deleted=False, main_tree__published=True).values_list("id", flat=True))
        kolibri_public_channel_ids = set(ChannelMetadata.objects.all().values_list("id", flat=True))
        ids_to_export = public_channel_ids.difference(kolibri_public_channel_ids)
        count = 0
        for channel_id in ids_to_export:
            try:
                self._export_channel(channel_id)
                count += 1
            except FileNotFoundError:
                logger.warning("Tried to export channel {} to kolibri_public but its published channel database could not be found".format(channel_id))
        logger.info("Successfully put {} channels into kolibri_public".format(count))
