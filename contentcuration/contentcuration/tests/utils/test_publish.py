import os
import tempfile
from unittest import mock

from django.conf import settings

from contentcuration.models import ChannelVersion
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioTestCase
from contentcuration.tests.utils.restricted_filesystemstorage import (
    RestrictedFileSystemStorage,
)
from contentcuration.utils.publish import ensure_versioned_database_exists
from contentcuration.utils.publish import increment_channel_version


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


class IncrementChannelVersionTestCase(StudioTestCase):
    """Test increment_channel_version function with ChannelVersion integration."""

    def setUp(self):
        super().setUp()
        self.channel = testdata.channel()
        self.channel.version = 1
        self.channel.save()

        ChannelVersion.objects.filter(channel=self.channel).delete()
        self.channel.version_info = None
        self.channel.save()

    def test_increment_published_version(self):
        """Test incrementing version for published channel."""
        initial_version = self.channel.version

        channel_version = increment_channel_version(
            self.channel, is_draft_version=False
        )

        self.channel.refresh_from_db()

        self.assertEqual(self.channel.version, initial_version + 1)

        self.assertIsNotNone(channel_version)
        self.assertEqual(channel_version.version, self.channel.version)
        self.assertEqual(channel_version.channel, self.channel)

        self.assertEqual(self.channel.version_info, channel_version)

        self.assertIsNone(channel_version.secret_token)

    def test_increment_draft_version(self):
        """Test incrementing version for draft channel."""
        initial_version = self.channel.version

        channel_version = increment_channel_version(self.channel, is_draft_version=True)

        self.channel.refresh_from_db()

        self.assertEqual(self.channel.version, initial_version)

        self.assertIsNotNone(channel_version)
        self.assertIsNone(channel_version.version)
        self.assertEqual(channel_version.channel, self.channel)

        if self.channel.version_info:
            self.assertNotEqual(self.channel.version_info, channel_version)

        self.assertIsNotNone(channel_version.secret_token)
        self.assertFalse(channel_version.secret_token.is_primary)

    def test_multiple_published_versions(self):
        """Test creating multiple published versions."""
        v1 = increment_channel_version(self.channel, is_draft_version=False)
        v2 = increment_channel_version(self.channel, is_draft_version=False)
        v3 = increment_channel_version(self.channel, is_draft_version=False)

        self.channel.refresh_from_db()

        self.assertEqual(self.channel.version, 4)

        self.assertEqual(self.channel.channel_versions.count(), 4)

        # Verify all versions were created
        self.assertIsNotNone(v1)
        self.assertIsNotNone(v2)
        self.assertEqual(self.channel.version_info, v3)
        self.assertEqual(self.channel.version_info.version, 4)

    def test_mixed_draft_and_published_versions(self):
        """Test creating mix of draft and published versions."""
        published = increment_channel_version(self.channel, is_draft_version=False)
        draft1 = increment_channel_version(self.channel, is_draft_version=True)
        draft2 = increment_channel_version(self.channel, is_draft_version=True)

        self.channel.refresh_from_db()

        self.assertEqual(self.channel.version, 2)

        self.assertEqual(self.channel.channel_versions.count(), 4)

        self.assertIsNotNone(draft1.secret_token)
        self.assertIsNotNone(draft2.secret_token)

        self.assertIsNone(published.secret_token)

        self.assertEqual(self.channel.version_info, published)
