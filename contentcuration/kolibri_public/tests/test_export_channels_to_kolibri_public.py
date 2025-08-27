import os.path
import shutil
import tempfile
import uuid
from unittest import mock

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.core.management import call_command
from django.db import models as django_models
from django.test import TestCase
from kolibri_content.apps import KolibriContentConfig
from kolibri_content.fields import UUIDField
from kolibri_content.models import ChannelMetadata as ExportedChannelMetadata
from kolibri_content.router import get_active_content_database
from kolibri_content.router import using_content_database
from kolibri_public.utils.export_channel_to_kolibri_public import (
    export_channel_to_kolibri_public,
)
from mixer.backend.django import GenFactory
from mixer.backend.django import Mixer

from contentcuration.models import Country


class CustomizedMixer(Mixer):
    """Slightly modified Mixer that works correctly with the active
    content database and with UUIDField.
    """

    def __init__(self, *args, **kwargs):
        mixer_factory = GenFactory()
        mixer_factory.generators[UUIDField] = mixer_factory.generators[
            django_models.UUIDField
        ]

        return super().__init__(*args, factory=mixer_factory, **kwargs)

    def postprocess(self, target):
        if self.params.get("commit"):
            # Not sure why the `force_insert` is needed, but using the
            # mixer causes "Save with update_fields did not affect any rows" error
            # if this is not specified
            target.save(using=get_active_content_database(), force_insert=True)

        return target


class ExportTestCase(TestCase):
    def setUp(self):
        super().setUp()

        self._temp_directory_ctx = tempfile.TemporaryDirectory()
        test_db_root_dir = self._temp_directory_ctx.__enter__()

        storage = FileSystemStorage(location=test_db_root_dir)

        self._storage_patch_ctx = mock.patch(
            "kolibri_public.utils.export_channel_to_kolibri_public.storage",
            new=storage,
        )
        self._storage_patch_ctx.__enter__()

        os.makedirs(os.path.join(test_db_root_dir, settings.DB_ROOT), exist_ok=True)

        self.channel_id = uuid.UUID(int=42).hex
        self.channel_version = 1

        db_path = os.path.join(
            test_db_root_dir,
            settings.DB_ROOT,
            f"{self.channel_id}-{self.channel_version}.sqlite3",
        )
        open(db_path, "w").close()

        with using_content_database(db_path):
            call_command(
                "migrate",
                app_label=KolibriContentConfig.label,
                database=get_active_content_database(),
            )

            mixer = CustomizedMixer()
            self.exported_channel_metadata = mixer.blend(
                ExportedChannelMetadata,
                id=self.channel_id,
                version=self.channel_version,
            )

        self.db_path_without_version = os.path.join(
            test_db_root_dir, settings.DB_ROOT, f"{self.channel_id}.sqlite3"
        )
        shutil.copyfile(db_path, self.db_path_without_version)

    def tearDown(self):
        self._temp_directory_ctx.__exit__(None, None, None)
        self._storage_patch_ctx.__exit__(None, None, None)

        super().tearDown()

    @mock.patch("kolibri_public.utils.export_channel_to_kolibri_public.ChannelMapper")
    def test_export_channel_to_kolibri_public__existing_version(
        self, mock_channel_mapper
    ):
        categories = ["Category1", "Category2"]
        country1 = Country.objects.create(code="C1", name="Country 1")
        country2 = Country.objects.create(code="C2", name="Country 2")
        countries = [country1, country2]

        export_channel_to_kolibri_public(
            channel_id=self.channel_id,
            channel_version=1,
            public=True,
            categories=categories,
            countries=countries,
        )

        mock_channel_mapper.assert_called_once_with(
            channel=self.exported_channel_metadata,
            public=True,
            categories=categories,
            countries=countries,
        )
        mock_channel_mapper.return_value.run.assert_called_once_with()

    @mock.patch("kolibri_public.utils.export_channel_to_kolibri_public.ChannelMapper")
    def test_export_channel_to_kolibri_public__without_version(
        self, mock_channel_mapper
    ):
        export_channel_to_kolibri_public(
            channel_id=self.channel_id,
        )

        mock_channel_mapper.assert_called_once_with(
            channel=self.exported_channel_metadata,
            public=True,
            categories=None,
            countries=None,
        )
        mock_channel_mapper.return_value.run.assert_called_once_with()

    def test_export_channel_to_kolibri_public__bad_version(self):
        with self.assertRaises(FileNotFoundError):
            export_channel_to_kolibri_public(
                channel_id=self.channel_id,
                channel_version=2,
            )
