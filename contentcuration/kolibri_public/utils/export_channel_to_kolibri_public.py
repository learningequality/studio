import logging
import os
import shutil
import tempfile

from django.conf import settings
from django.core.files.storage import default_storage as storage
from django.core.management import call_command
from kolibri_content.apps import KolibriContentConfig
from kolibri_content.models import ChannelMetadata as ExportedChannelMetadata
from kolibri_content.router import get_active_content_database
from kolibri_content.router import using_content_database
from kolibri_public.utils.mapper import ChannelMapper


logger = logging.getLogger(__file__)


def export_channel_to_kolibri_public(
    channel_id,
    channel_version=None,
    public=True,
    categories=None,
    countries=None,
):
    # Note: The `categories` argument should be a _list_, NOT a _dict_.
    logger.info("Putting channel {} into kolibri_public".format(channel_id))

    if channel_version is not None:
        db_filename = "{id}-{version}.sqlite3".format(
            id=channel_id, version=channel_version
        )
    else:
        db_filename = "{id}.sqlite3".format(id=channel_id)
    db_location = os.path.join(settings.DB_ROOT, db_filename)

    with storage.open(db_location) as storage_file:
        with tempfile.NamedTemporaryFile(suffix=".sqlite3") as db_file:
            shutil.copyfileobj(storage_file, db_file)
            db_file.seek(0)
            with using_content_database(db_file.name):
                # Run migration to handle old content databases published prior to current fields being added.
                call_command(
                    "migrate",
                    app_label=KolibriContentConfig.label,
                    database=get_active_content_database(),
                )
                channel = ExportedChannelMetadata.objects.get(id=channel_id)
                logger.info(
                    "Found channel {} for id: {} mapping now".format(
                        channel.name, channel_id
                    )
                )
                mapper = ChannelMapper(
                    channel=channel,
                    public=public,
                    categories=categories,
                    countries=countries,
                )
                mapper.run()
