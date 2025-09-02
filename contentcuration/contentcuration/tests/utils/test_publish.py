import os
import tempfile
from unittest import mock

from django.conf import settings

from contentcuration.tests import testdata
from contentcuration.tests.base import StudioTestCase
from contentcuration.tests.utils.restricted_filesystemstorage import (
    RestrictedFileSystemStorage,
)
from contentcuration.utils.publish import ensure_versioned_database_exists


class EnsureVersionedDatabaseTestCase(StudioTestCase):
    def setUp(self):
        super().setUp()

        self._temp_directory_ctx = tempfile.TemporaryDirectory()
        self.test_db_root_dir = self._temp_directory_ctx.__enter__()

        storage = RestrictedFileSystemStorage(location=self.test_db_root_dir)

        self._storage_patch_ctx = mock.patch(
            "contentcuration.utils.publish.storage",
            new=storage,
        )
        self._storage_patch_ctx.__enter__()

        os.makedirs(
            os.path.join(self.test_db_root_dir, settings.DB_ROOT), exist_ok=True
        )

        self.channel = testdata.channel()
        self.channel.version = 2
        self.channel.save()

        self.versioned_db_path = os.path.join(
            self.test_db_root_dir,
            settings.DB_ROOT,
            f"{self.channel.id}-{self.channel.version}.sqlite3",
        )
        self.unversioned_db_path = os.path.join(
            self.test_db_root_dir, settings.DB_ROOT, f"{self.channel.id}.sqlite3"
        )

    def tearDown(self):
        self._temp_directory_ctx.__exit__(None, None, None)
        self._storage_patch_ctx.__exit__(None, None, None)

        super().tearDown()

    def test_versioned_database_exists(self):
        # In reality, the versioned database for the current version
        # and the unversioned database would have the same content,
        # but here we provide different content so that we can test
        # that the versioned database is not overwritten.
        versioned_db_content = "Versioned content"
        unversioned_db_content = "Unversioned content"

        with open(self.versioned_db_path, "w") as f:
            f.write(versioned_db_content)
        with open(self.unversioned_db_path, "w") as f:
            f.write(unversioned_db_content)

        ensure_versioned_database_exists(self.channel.id, self.channel.version)

        with open(self.versioned_db_path) as f:
            read_versioned_content = f.read()
        self.assertEqual(read_versioned_content, versioned_db_content)

    def test_versioned_database_does_not_exist(self):
        unversioned_db_content = "Unversioned content"

        with open(self.unversioned_db_path, "w") as f:
            f.write(unversioned_db_content)

        ensure_versioned_database_exists(self.channel.id, self.channel.version)

        with open(self.versioned_db_path) as f:
            read_versioned_content = f.read()
        self.assertEqual(read_versioned_content, unversioned_db_content)

    def test_not_published(self):
        self.channel.version = 0
        self.channel.save()
        self.versioned_db_path = os.path.join(
            self.test_db_root_dir,
            settings.DB_ROOT,
            f"{self.channel.id}-{self.channel.version}.sqlite3",
        )

        with self.assertRaises(ValueError):
            ensure_versioned_database_exists(self.channel.id, self.channel.version)
