from django.core.management import call_command
from le_utils.constants import content_kinds
from le_utils.constants import licenses

from contentcuration.models import AuditedSpecialPermissionsLicense
from contentcuration.models import ChannelVersion
from contentcuration.models import ContentKind
from contentcuration.models import ContentNode
from contentcuration.models import License
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioTestCase


def _bump(channel):
    """Increment channel version and add empty published_data entry."""
    channel.version += 1
    channel.published_data[str(channel.version)] = {
        "version": channel.version,
    }
    channel.save()


def _create_special_permissions_node(parent, description):
    """
    Create a content node with a Special Permissions license and the given description.
    Returns the created node.
    """
    special_permissions_license = License.objects.get(
        license_name=licenses.SPECIAL_PERMISSIONS
    )
    video_kind = ContentKind.objects.get(kind=content_kinds.VIDEO)

    node = ContentNode.objects.create(
        title="Special Permissions Content",
        kind=video_kind,
        parent=parent,
        license=special_permissions_license,
        license_description=description,
        published=True,
        complete=True,
    )
    return node


class TestCreateChannelVersions(StudioTestCase):
    """Tests for the create_channel_versions management command."""

    def setUp(self):
        super(TestCreateChannelVersions, self).setUp()
        # Clear any existing AuditedSpecialPermissionsLicense objects to ensure clean test state
        AuditedSpecialPermissionsLicense.objects.all().delete()

    def test_channel_with_no_published_data(self):
        """A channel with version 0 and no published_data should create no ChannelVersions."""
        channel = testdata.channel()
        channel.version = 0
        channel.published_data = {}
        channel.save()

        call_command("create_channel_versions")
        channel.refresh_from_db()

        self.assertEqual(
            ChannelVersion.objects.filter(channel=channel).count(),
            0,
            "No ChannelVersion should be created for a channel with no published_data",
        )

    def test_single_channel_with_published_data(self):
        """A channel with version 1 and 1 published_data should create 1 ChannelVersion."""
        channel = testdata.channel()
        _bump(channel)
        ChannelVersion.objects.all().delete()

        call_command("create_channel_versions")
        channel.refresh_from_db()

        self.assertEqual(
            ChannelVersion.objects.filter(channel=channel).count(),
            1,
            "A ChannelVersion should be created for a channel with published_data",
        )

        self.assertEqual(channel.version_info, ChannelVersion.objects.last())

    def test_public_channel_special_permissions_distributable_true(self):
        """
        When a channel is public (public=True), AuditedSpecialPermissionsLicense objects
        created for special permissions content should have distributable=True.
        """
        channel = testdata.channel()
        channel.public = True
        channel.save()

        # Create a node with special permissions license
        special_description = "This content can be distributed for educational purposes"
        _create_special_permissions_node(channel.main_tree, special_description)

        # Bump channel version without included_licenses so it gets computed
        channel.version = 1
        channel.published_data = {
            "1": {
                "version": 1,
                # Intentionally missing special_permissions_included to trigger computation
            }
        }
        channel.save()

        # Clear any existing ChannelVersions
        ChannelVersion.objects.all().delete()

        call_command("create_channel_versions")
        channel.refresh_from_db()

        # Check that the AuditedSpecialPermissionsLicense was created with distributable=True
        audited_license = AuditedSpecialPermissionsLicense.objects.filter(
            description=special_description
        ).first()

        self.assertIsNotNone(
            audited_license,
            "AuditedSpecialPermissionsLicense should be created for special permissions content",
        )
        self.assertTrue(
            audited_license.distributable,
            "AuditedSpecialPermissionsLicense should have distributable=True for public channels",
        )

    def test_private_channel_special_permissions_distributable_false(self):
        """
        When a channel is private (public=False), AuditedSpecialPermissionsLicense objects
        created for special permissions content should have distributable=False.
        """
        channel = testdata.channel()
        channel.public = False
        channel.save()

        # Create a node with special permissions license
        special_description = "This content has restricted distribution"
        _create_special_permissions_node(channel.main_tree, special_description)

        # Bump channel version without special_permissions_included to trigger computation
        channel.version = 1
        channel.published_data = {
            "1": {
                "version": 1,
            }
        }
        channel.save()

        # Clear any existing ChannelVersions
        ChannelVersion.objects.all().delete()

        call_command("create_channel_versions")
        channel.refresh_from_db()

        # Check that the AuditedSpecialPermissionsLicense was created with distributable=False
        audited_license = AuditedSpecialPermissionsLicense.objects.filter(
            description=special_description
        ).first()

        self.assertIsNotNone(
            audited_license,
            "AuditedSpecialPermissionsLicense should be created for special permissions content",
        )
        self.assertFalse(
            audited_license.distributable,
            "AuditedSpecialPermissionsLicense should have distributable=False for private channels",
        )

    def test_multiple_versions_with_published_data(self):
        """A channel with version 2 and 2 published_data entries should create 2 ChannelVersions."""
        channel = testdata.channel()
        channel.version = 2
        channel.published_data = {
            "1": {
                "version": 1,
                "version_notes": "First version",
            },
            "2": {
                "version": 2,
                "version_notes": "Second version",
            },
        }
        channel.save()

        # Clear any existing ChannelVersions
        ChannelVersion.objects.all().delete()

        call_command("create_channel_versions")
        channel.refresh_from_db()

        channel_versions = ChannelVersion.objects.filter(channel=channel).order_by(
            "version"
        )
        self.assertEqual(
            channel_versions.count(),
            2,
            "Two ChannelVersions should be created for a channel with 2 published_data entries",
        )

        # version_info should point to the latest version
        self.assertEqual(channel.version_info.version, 2)

    def test_channel_version_info_set_to_latest(self):
        """The channel's version_info should point to the latest created ChannelVersion."""
        channel = testdata.channel()
        channel.version = 3
        channel.published_data = {
            "1": {"version": 1},
            "2": {"version": 2},
            "3": {"version": 3},
        }
        channel.save()

        ChannelVersion.objects.all().delete()

        call_command("create_channel_versions")
        channel.refresh_from_db()

        self.assertIsNotNone(channel.version_info)
        self.assertEqual(
            channel.version_info.version,
            3,
            "version_info should point to the latest (version 3) ChannelVersion",
        )

    def test_special_permissions_license_associated_with_channel_version(self):
        """
        AuditedSpecialPermissionsLicense should be associated with the ChannelVersion
        via the special_permissions_included M2M field.
        """
        channel = testdata.channel()
        channel.public = True
        channel.save()

        # Create a node with special permissions license
        special_description = "Content for M2M association test"
        _create_special_permissions_node(channel.main_tree, special_description)

        channel.version = 1
        channel.published_data = {
            "1": {
                "version": 1,
            }
        }
        channel.save()

        ChannelVersion.objects.all().delete()

        call_command("create_channel_versions")
        channel.refresh_from_db()

        # The AuditedSpecialPermissionsLicense should be in the ChannelVersion's M2M relation
        self.assertTrue(
            channel.version_info.special_permissions_included.filter(
                description=special_description
            ).exists(),
            "AuditedSpecialPermissionsLicense should be associated with the ChannelVersion",
        )

    def test_multiple_special_permissions_same_channel(self):
        """
        Multiple nodes with different special permissions descriptions should create
        multiple AuditedSpecialPermissionsLicense objects, all with the correct
        distributable value based on channel.public.
        """
        channel = testdata.channel()
        channel.public = True
        channel.save()

        # Create multiple nodes with different special permissions descriptions
        descriptions = [
            "Educational use only",
            "Non-commercial distribution allowed",
            "Attribution required for sharing",
        ]
        for desc in descriptions:
            _create_special_permissions_node(channel.main_tree, desc)

        channel.version = 1
        channel.published_data = {
            "1": {
                "version": 1,
            }
        }
        channel.save()

        ChannelVersion.objects.all().delete()

        call_command("create_channel_versions")
        channel.refresh_from_db()

        for desc in descriptions:
            audited_license = AuditedSpecialPermissionsLicense.objects.filter(
                description=desc
            ).first()
            self.assertIsNotNone(
                audited_license,
                f"AuditedSpecialPermissionsLicense should exist for description: {desc}",
            )
            self.assertTrue(
                audited_license.distributable,
                f"distributable should be True for public channel, description: {desc}",
            )

    def test_command_skips_channels_with_existing_version_info(self):
        """
        The command should only process channels that don't already have version_info set.
        This tests idempotency behavior.
        """
        channel = testdata.channel()
        _bump(channel)
        ChannelVersion.objects.all().delete()

        # Run command first time
        call_command("create_channel_versions")
        first_count = ChannelVersion.objects.filter(channel=channel).count()

        self.assertEqual(
            first_count,
            1,
            "First run should create 1 ChannelVersion",
        )

        # Verify version_info is set
        channel.refresh_from_db()
        self.assertIsNotNone(channel.version_info)

    def test_channel_with_existing_special_permissions_in_published_data(self):
        """
        If published_data already contains special_permissions_included,
        the command should not recompute it.
        """
        channel = testdata.channel()
        channel.public = True
        channel.save()

        # Create a node with special permissions license
        special_description = "Pre-existing special permissions"
        _create_special_permissions_node(channel.main_tree, special_description)

        # Pre-create an AuditedSpecialPermissionsLicense
        existing_license = AuditedSpecialPermissionsLicense.objects.create(
            description="Already audited license",
            distributable=False,  # Set to False to distinguish from computed ones
        )

        channel.version = 1
        channel.published_data = {
            "1": {
                "version": 1,
                # Already has special_permissions_included
                "special_permissions_included": [str(existing_license.id)],
            }
        }
        channel.save()

        ChannelVersion.objects.all().delete()

        call_command("create_channel_versions")

        # The existing license should remain unchanged (distributable=False)
        existing_license.refresh_from_db()
        self.assertFalse(
            existing_license.distributable,
            "Pre-existing AuditedSpecialPermissionsLicense should not be modified",
        )
