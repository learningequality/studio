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


class using_temp_migrated_database:
    """
    A wrapper context manager for read-only access to a content database
    that might not have all current migrations applied. Works by copying
    the database to a temporary file, applying migrations to this temporary
    database and then using this temporary database.
    """

    def __init__(self, database_storage_path):
        self.database_path = database_storage_path
        self._inner_mgr = None

    def __enter__(self):
        self._named_temporary_file_mgr = tempfile.NamedTemporaryFile(suffix=".sqlite3")
        self.temp_database_file = self._named_temporary_file_mgr.__enter__()

        with storage.open(self.database_path, "rb") as db_file:
            shutil.copyfileobj(db_file, self.temp_database_file)
        self.temp_database_file.seek(0)

        with using_content_database(self.temp_database_file.name):
            # Run migration to handle old content databases published prior to current fields being added.
            call_command(
                "migrate",
                app_label=KolibriContentConfig.label,
                database=get_active_content_database(),
            )

        self._inner_mgr = using_content_database(self.temp_database_file.name)
        self._inner_mgr.__enter__()

    def __exit__(self, exc_type, exc_val, exc_tb):
        self._inner_mgr.__exit__(exc_type, exc_val, exc_tb)
        self._named_temporary_file_mgr.__exit__(exc_type, exc_val, exc_tb)


def export_channel_to_kolibri_public(
    channel_id,
    channel_version=None,
    public=True,
    categories=None,
    countries=None,
):
    # Note: The `categories` argument should be a _list_, NOT a _dict_.
    logger.info("Putting channel {} into kolibri_public".format(channel_id))

    versioned_db_filename = "{id}-{version}.sqlite3".format(
        id=channel_id, version=channel_version
    )
    unversioned_db_filename = "{id}.sqlite3".format(id=channel_id)

    versioned_db_storage_path = os.path.join(settings.DB_ROOT, versioned_db_filename)
    unversioned_db_storage_path = os.path.join(
        settings.DB_ROOT, unversioned_db_filename
    )

    if channel_version is None:
        db_storage_path = unversioned_db_storage_path
    else:
        db_storage_path = versioned_db_storage_path
        _possibly_migrate_unversioned_database(
            channel_id=channel_id,
            channel_version=channel_version,
            unversioned_db_storage_path=unversioned_db_storage_path,
            versioned_db_storage_path=versioned_db_storage_path,
        )

    with using_temp_migrated_database(db_storage_path):
        channel = ExportedChannelMetadata.objects.get(id=channel_id)
        logger.info(
            "Found channel {} for id: {} mapping now".format(channel.name, channel_id)
        )
        mapper = ChannelMapper(
            channel=channel,
            channel_version=channel_version,
            public=public,
            categories=categories,
            countries=countries,
        )
        mapper.run()


def _possibly_migrate_unversioned_database(
    channel_id,
    channel_version,
    unversioned_db_storage_path,
    versioned_db_storage_path,
):
    """
    Older channels may only have a single database file and not
    versioned databases. If this is the case and the requested channel version
    is present in the single database file, this function copies the database to a file
    containing the version in the filename.
    """
    if storage.exists(versioned_db_storage_path) or not storage.exists(
        unversioned_db_storage_path
    ):
        return

    with using_temp_migrated_database(unversioned_db_storage_path):
        contains_requested_version = ExportedChannelMetadata.objects.filter(
            id=channel_id, version=channel_version
        ).exists()

    if contains_requested_version:
        logger.info(
            f"Migrating unversioned database {unversioned_db_storage_path} to versioned database {versioned_db_storage_path}"
        )

        with storage.open(unversioned_db_storage_path, "rb") as unversioned_db_file:
            with storage.open(versioned_db_storage_path, "wb") as versioned_db_file:
                shutil.copyfileobj(unversioned_db_file, versioned_db_file)
