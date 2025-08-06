import os.path
import shutil
import tempfile
import uuid
from unittest import mock

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.core.management import call_command
from django.test import TestCase
from kolibri_content.apps import KolibriContentConfig
from kolibri_content.models import ChannelMetadata as ExportedChannelMetadata
from kolibri_content.router import get_active_content_database
from kolibri_content.router import using_content_database
from kolibri_public.tests.utils.mixer import KolibriPublicMixer
from kolibri_public.utils.export_channel_to_kolibri_public import (
    export_channel_to_kolibri_public,
)

from contentcuration.models import Country


class FileSystemStorageWithoutPath:
    """
    A wrapper around FileSystemStorage that does not expose the `path` method,
    as this will not be available in production where S3Storage is used.
    This cannot be solved by just mocking the `path` method, because
    it is used by the `FileSystemStorage` class internally.
    """

    def __init__(self, *args, **kwargs):
        self._inner = FileSystemStorage(*args, **kwargs)

    def __getattr__(self, name):
        if name == "path":
            raise NotImplementedError(
                "The 'path' method is intentionally not available."
            )
        return getattr(self._inner, name)

    def __dir__(self):
        return [x for x in dir(self._inner) if x != "path"]


class FileSystemStorageWithoutPathTestCase(TestCase):
    # Sanity-checks that the wrapper above works as expected,
    # not actually testing application code

    def setUp(self):
        super().setUp()

        self._temp_directory_ctx = tempfile.TemporaryDirectory()
        self.temp_dir = self._temp_directory_ctx.__enter__()

        self.storage = FileSystemStorageWithoutPath(location=self.temp_dir)

    def tearDown(self):
        self._temp_directory_ctx.__exit__(None, None, None)
        super().tearDown()

    def test_open_works(self):
        test_content = "test content"

        with self.storage.open("filename", "w") as f:
            f.write(test_content)

        with open(os.path.join(self.temp_dir, "filename"), "r") as f:
            content = f.read()
            self.assertEqual(content, test_content)

    def test_path_does_not_work(self):
        with self.assertRaises(NotImplementedError):
            self.storage.path("filename")


class ExportTestCase(TestCase):
    def setUp(self):
        super().setUp()

        self._temp_directory_ctx = tempfile.TemporaryDirectory()
        test_db_root_dir = self._temp_directory_ctx.__enter__()

        self.storage = FileSystemStorageWithoutPath(location=test_db_root_dir)

        self._storage_patch_ctx = mock.patch(
            "kolibri_public.utils.export_channel_to_kolibri_public.storage",
            new=self.storage,
        )
        self._storage_patch_ctx.__enter__()

        os.makedirs(os.path.join(test_db_root_dir, settings.DB_ROOT), exist_ok=True)

        self.channel_id = uuid.UUID(int=42).hex
        self.channel_version = 1

        self.versioned_db_path = os.path.join(
            test_db_root_dir,
            settings.DB_ROOT,
            f"{self.channel_id}-{self.channel_version}.sqlite3",
        )
        open(self.versioned_db_path, "w").close()

        with using_content_database(self.versioned_db_path):
            call_command(
                "migrate",
                app_label=KolibriContentConfig.label,
                database=get_active_content_database(),
            )

            mixer = KolibriPublicMixer()
            self.exported_channel_metadata = mixer.blend(
                ExportedChannelMetadata,
                id=self.channel_id,
                version=self.channel_version,
            )

        self.unversioned_db_path = os.path.join(
            test_db_root_dir, settings.DB_ROOT, f"{self.channel_id}.sqlite3"
        )
        shutil.copyfile(self.versioned_db_path, self.unversioned_db_path)

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

    def test_export_channel_to_kolibri_public__bad_channel(self):
        with self.assertRaises(FileNotFoundError):
            export_channel_to_kolibri_public(
                channel_id="dummy_id",
                channel_version=1,
            )

    def test_export_channel_to_kolibri_public__bad_version(self):
        with self.assertRaises(FileNotFoundError):
            export_channel_to_kolibri_public(
                channel_id=self.channel_id,
                channel_version=2,
            )
