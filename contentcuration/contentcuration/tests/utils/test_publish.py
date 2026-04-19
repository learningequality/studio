import os
import tempfile
import uuid
from unittest import mock

from django.conf import settings
from kolibri_content import models as kolibrimodels
from kolibri_content.router import using_content_database
from le_utils.constants import licenses

import contentcuration.models as ccmodels
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioTestCase
from contentcuration.tests.utils.restricted_filesystemstorage import (
    RestrictedFileSystemStorage,
)
from contentcuration.utils.publish import create_content_database
from contentcuration.utils.publish import create_draft_channel_version
from contentcuration.utils.publish import ensure_versioned_database_exists
from contentcuration.utils.publish import increment_channel_version
from contentcuration.utils.publish import publish_channel


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


class IncrementChannelVersionTestCase(StudioTestCase):
    """Test increment_channel_version function with ChannelVersion integration."""

    def setUp(self):
        super().setUp()
        self.channel = testdata.channel()
        self.channel.version = 0
        self.channel.save()

    def test_increment_published_version(self):
        """Test incrementing version for published channel."""
        initial_version = self.channel.version

        increment_channel_version(self.channel)

        self.channel.refresh_from_db()

        self.assertEqual(self.channel.version, initial_version + 1)

        self.assertIsNotNone(self.channel.version_info)
        self.assertEqual(self.channel.version_info.version, self.channel.version)
        self.assertEqual(self.channel.version_info.channel, self.channel)

        self.assertIsNone(self.channel.version_info.secret_token)

    def test_increment_draft_version(self):
        """Test incrementing version for draft channel."""
        initial_version = self.channel.version

        channel_version = create_draft_channel_version(self.channel)

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
        increment_channel_version(self.channel)
        increment_channel_version(self.channel)
        increment_channel_version(self.channel)

        self.channel.refresh_from_db()

        self.assertEqual(self.channel.version, 3)

        self.assertEqual(self.channel.channel_versions.count(), 3)

        self.assertIsNotNone(self.channel.version_info)
        self.assertEqual(self.channel.version_info.version, 3)

    def test_mixed_draft_and_published_versions(self):
        """Test creating mix of draft and published versions."""
        increment_channel_version(self.channel)
        draft1 = create_draft_channel_version(self.channel)
        draft2 = create_draft_channel_version(self.channel)

        self.channel.refresh_from_db()

        self.assertEqual(self.channel.version, 1)

        self.assertEqual(self.channel.channel_versions.count(), 2)
        self.assertEqual(uuid.UUID(str(draft1.id)), uuid.UUID(str(draft2.id)))

        self.assertIsNotNone(draft1.secret_token)
        self.assertIsNotNone(draft2.secret_token)

        self.assertIsNotNone(self.channel.version_info)
        self.assertEqual(self.channel.version_info.version, 1)
        self.assertIsNone(self.channel.version_info.secret_token)


class DraftPublishChannelTestCase(StudioTestCase):
    """
    Tests for the draft publish flow using the full publish_channel function.

    Verifies that draft publishes correctly populate the draft ChannelVersion
    metadata while leaving channel-level fields untouched, and that
    special_permissions_included is fully replaced (not accumulated) on each
    draft publish.

    save_export_database is mocked to avoid file-system operations; all other
    publish_channel logic runs as normal.
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._patch_save_export = mock.patch(
            "contentcuration.utils.publish.save_export_database"
        )
        cls._patch_save_export.start()

    @classmethod
    def tearDownClass(cls):
        cls._patch_save_export.stop()
        super().tearDownClass()

    def setUp(self):
        super().setUp()
        self.channel = testdata.channel()

        # Fetch the Special Permissions license loaded by loadconstants.
        # Do NOT call create() — loadconstants inserts licenses with explicit PKs
        # so the PK sequence is still at 1, and create() would collide with id=1.
        self.special_perms_license = ccmodels.License.objects.get(
            license_name=licenses.SPECIAL_PERMISSIONS
        )

        # Give the channel an existing published version so version_info is set.
        # increment_channel_version calls channel.save(), which triggers
        # Channel.on_update() (models.py ~line 1392). on_update() runs
        # ChannelVersion.objects.get_or_create(channel=self, version=self.version)
        # and assigns the result to self.version_info — so after this call,
        # channel.version_info is a real ChannelVersion, not None.
        increment_channel_version(self.channel)
        self.channel.refresh_from_db()

        # Snapshot channel state before any draft publish.
        self.original_total_resource_count = self.channel.total_resource_count
        self.original_published_size = self.channel.published_size
        self.original_published_data = dict(self.channel.published_data)
        self.original_version_info_id = (
            self.channel.version_info.id if self.channel.version_info else None
        )

    def _run_draft_publish(self, version_notes=""):
        publish_channel(
            self.admin_user.id,
            self.channel.id,
            version_notes=version_notes,
            force=False,
            force_exercises=False,
            send_email=False,
            progress_tracker=None,
            is_draft_version=True,
            use_staging_tree=False,
        )

    def _get_draft_version(self):
        return ccmodels.ChannelVersion.objects.get(channel=self.channel, version=None)

    # ------------------------------------------------------------------
    # Test 1: draft ChannelVersion metadata fields are populated
    # ------------------------------------------------------------------

    def test_draft_channel_version_fields_are_populated(self):
        """
        After a draft publish, the draft ChannelVersion has its metadata fields set.

        testdata.channel() has no *published* nodes, so counts are 0 and lists are [].
        We assert specific values rather than assertIsNotNone to avoid vacuous passes
        (e.g. assertIsNotNone(0) always passes even if the field was never written).
        date_published is the only field we can only check for non-None, since its
        exact value is non-deterministic.
        """
        self._run_draft_publish(version_notes="draft notes")
        draft_version = self._get_draft_version()

        self.assertEqual(draft_version.resource_count, 0)
        self.assertEqual(draft_version.size, 0)
        self.assertEqual(draft_version.kind_count, [])
        self.assertIsNotNone(draft_version.date_published)
        self.assertEqual(draft_version.version_notes, "draft notes")
        self.assertEqual(draft_version.included_languages, [])
        self.assertEqual(draft_version.included_licenses, [])
        self.assertEqual(draft_version.included_categories, [])
        self.assertEqual(draft_version.non_distributable_licenses_included, [])

    # ------------------------------------------------------------------
    # Test 2: channel-level fields are NOT touched
    # ------------------------------------------------------------------

    def test_channel_fields_not_modified_during_draft_publish(self):
        """
        A draft publish must not change channel.total_resource_count,
        channel.published_size, channel.published_data, or channel.version_info.
        """
        self._run_draft_publish()
        self.channel.refresh_from_db()

        self.assertEqual(
            self.channel.total_resource_count, self.original_total_resource_count
        )
        self.assertEqual(self.channel.published_size, self.original_published_size)
        self.assertEqual(self.channel.published_data, self.original_published_data)

        current_version_info_id = (
            self.channel.version_info.id if self.channel.version_info else None
        )
        self.assertEqual(current_version_info_id, self.original_version_info_id)

    # ------------------------------------------------------------------
    # Test 3: second draft publish replaces special_permissions_included
    # ------------------------------------------------------------------

    def test_second_draft_publish_replaces_special_permissions_included(self):
        """
        On a second consecutive draft publish, special_permissions_included on the
        draft ChannelVersion reflects only the current publish — licenses from the
        previous draft publish that are no longer present are removed.

        Two publish_channel calls are made with a different license_description on
        the special-permissions node between them. After the second call the M2M
        must contain only the description used in that second call.
        """
        # Get a video node from the channel's main tree to use as the content node.
        sp_node = (
            self.channel.main_tree.get_descendants().filter(kind_id="video").first()
        )

        # First draft publish: node has Special Permissions with "License A".
        sp_node.license = self.special_perms_license
        sp_node.license_description = "License A"
        sp_node.published = True
        sp_node.save()

        self._run_draft_publish()
        draft_version = self._get_draft_version()
        self.assertEqual(draft_version.special_permissions_included.count(), 1)
        self.assertEqual(
            draft_version.special_permissions_included.first().description, "License A"
        )

        # Second draft publish: node's description changes to "License B".
        sp_node.license_description = "License B"
        sp_node.save()

        self._run_draft_publish()
        draft_version.refresh_from_db()
        self.assertEqual(
            draft_version.special_permissions_included.count(),
            1,
            "special_permissions_included should be fully replaced on each draft publish",
        )
        self.assertEqual(
            draft_version.special_permissions_included.first().description, "License B"
        )

    # ------------------------------------------------------------------
    # Test 4: distributable stays False for draft publishes of public channels
    # ------------------------------------------------------------------

    def test_special_permissions_distributable_false_for_draft_publish(self):
        """
        Even when channel.public is True, a draft publish must not mark
        AuditedSpecialPermissionsLicense records as distributable — the
        distributable field must remain False for all licenses linked to the
        draft ChannelVersion.
        """
        sp_node = (
            self.channel.main_tree.get_descendants().filter(kind_id="video").first()
        )
        sp_node.license = self.special_perms_license
        sp_node.license_description = "Custom License"
        sp_node.published = True
        sp_node.save()

        self.channel.public = True
        self.channel.save()

        self._run_draft_publish()
        draft_version = self._get_draft_version()

        self.assertGreater(draft_version.special_permissions_included.count(), 0)
        for license_obj in draft_version.special_permissions_included.all():
            self.assertFalse(
                license_obj.distributable,
                "distributable must stay False for draft publishes",
            )

    def test_draft_publish_populates_channel_snapshot_fields(self):
        """
        After the first draft publish, channel_name, channel_description,
        channel_thumbnail_encoding, and channel_language on the draft
        ChannelVersion reflect the channel's state at publish time.
        """
        self.channel.name = "Snapshot Channel"
        self.channel.description = "Snapshot description"
        self.channel.thumbnail_encoding = {"base64": "abc123"}
        self.channel.save()

        self._run_draft_publish()
        draft_version = self._get_draft_version()

        self.assertEqual(draft_version.channel_name, "Snapshot Channel")
        self.assertEqual(draft_version.channel_description, "Snapshot description")
        self.assertEqual(draft_version.channel_thumbnail_encoding, {"base64": "abc123"})
        self.assertEqual(draft_version.channel_language_id, self.channel.language_id)

    def test_second_draft_publish_refreshes_channel_snapshot_fields(self):
        """
        A second draft publish after mutating channel metadata must overwrite
        the stale snapshot values on the existing draft ChannelVersion row —
        for all four snapshot fields.

        channel.language is changed from "en" to "fr" to confirm the refresh
        is not vacuous (the language snapshot must change to the new value).
        """
        self.channel.name = "Old Name"
        self.channel.description = "Old description"
        self.channel.thumbnail_encoding = {"base64": "old_thumb"}
        # language is already "en" from testdata.channel(); no need to set it
        self.channel.save()

        self._run_draft_publish()
        draft_version = self._get_draft_version()

        self.assertEqual(draft_version.channel_name, "Old Name")
        self.assertEqual(
            draft_version.channel_thumbnail_encoding, {"base64": "old_thumb"}
        )
        self.assertEqual(draft_version.channel_language_id, "en")

        # Mutate all four fields; language changes from "en" to "fr"
        self.channel.name = "New Name"
        self.channel.description = "New description"
        self.channel.thumbnail_encoding = {"base64": "new_thumb"}
        self.channel.language_id = "fr"
        self.channel.save()

        self._run_draft_publish()
        draft_version.refresh_from_db()

        self.assertEqual(draft_version.channel_name, "New Name")
        self.assertEqual(draft_version.channel_description, "New description")
        self.assertEqual(
            draft_version.channel_thumbnail_encoding, {"base64": "new_thumb"}
        )
        self.assertEqual(draft_version.channel_language_id, "fr")


class MapChannelToKolibriChannelTestCase(StudioTestCase):
    def setUp(self):
        super().setUp()
        self.channel = testdata.channel()
        # icon_encoding must not be None — the kolibri content DB thumbnail column is NOT NULL.
        # publish_channel calls set_channel_icon_encoding before create_content_database;
        # since we call create_content_database directly we set it here instead.
        self.channel.icon_encoding = ""
        self.channel.save()
        # increment_channel_version + refresh_from_db gives channel.version > 0,
        # so channel.version + 1 is distinguishable from the draft value of 0.
        increment_channel_version(self.channel)
        self.channel.refresh_from_db()

    def _get_channel_metadata_version(self, is_draft_version):
        with mock.patch("contentcuration.utils.publish.save_export_database"):
            tempdb = create_content_database(
                self.channel,
                force=True,
                user_id=self.admin_user.id,
                force_exercises=False,
                is_draft_version=is_draft_version,
            )
        try:
            with using_content_database(tempdb):
                return kolibrimodels.ChannelMetadata.objects.get(
                    id=self.channel.id
                ).version
        finally:
            if os.path.exists(tempdb):
                os.remove(tempdb)

    def test_draft_publish_sets_version_zero(self):
        self.assertEqual(self._get_channel_metadata_version(is_draft_version=True), 0)

    def test_non_draft_publish_sets_version_plus_one(self):
        self.assertEqual(
            self._get_channel_metadata_version(is_draft_version=False),
            self.channel.version + 1,
        )
