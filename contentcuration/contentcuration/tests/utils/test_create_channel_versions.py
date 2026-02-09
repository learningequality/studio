from django.core.management import call_command
from le_utils.constants import content_kinds
from le_utils.constants import licenses

from contentcuration.management.commands.create_channel_versions import (
    validate_published_data,
)
from contentcuration.models import AuditedSpecialPermissionsLicense
from contentcuration.models import ChannelVersion
from contentcuration.models import ContentKind
from contentcuration.models import ContentNode
from contentcuration.models import File
from contentcuration.models import Language
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


class TestValidatePublishedData(StudioTestCase):
    """Unit tests for the validate_published_data function."""

    def setUp(self):
        super(TestValidatePublishedData, self).setUp()
        self.channel = testdata.channel()
        AuditedSpecialPermissionsLicense.objects.all().delete()

    def test_returns_tuple_of_data_and_special_permissions(self):
        """validate_published_data should return (data_dict, special_permissions_list)."""
        result = validate_published_data({}, self.channel)

        self.assertIsInstance(result, tuple)
        self.assertEqual(len(result), 2)
        self.assertIsInstance(result[0], dict)
        self.assertIsInstance(result[1], list)

    def test_computes_included_licenses_when_missing(self):
        """Should compute included_licenses from published nodes when not in data."""
        cc_license = License.objects.first()
        video_kind = ContentKind.objects.get(kind=content_kinds.VIDEO)

        ContentNode.objects.create(
            title="Licensed Content",
            kind=video_kind,
            parent=self.channel.main_tree,
            license=cc_license,
            published=True,
            complete=True,
        )

        data, _ = validate_published_data({}, self.channel)

        self.assertIn("included_licenses", data)
        self.assertIn(cc_license.id, data["included_licenses"])

    def test_does_not_overwrite_existing_included_licenses(self):
        """Should preserve existing included_licenses in data."""
        existing_licenses = [99, 100]
        input_data = {"included_licenses": existing_licenses}

        data, _ = validate_published_data(input_data, self.channel)

        self.assertEqual(data["included_licenses"], existing_licenses)

    def test_computes_included_languages_from_nodes(self):
        """Should compute included_languages from node languages."""
        lang = Language.objects.first()
        video_kind = ContentKind.objects.get(kind=content_kinds.VIDEO)

        ContentNode.objects.create(
            title="Content with language",
            kind=video_kind,
            parent=self.channel.main_tree,
            language=lang,
            published=True,
            complete=True,
        )

        data, _ = validate_published_data({}, self.channel)

        self.assertIn("included_languages", data)
        self.assertIn(lang.id, data["included_languages"])

    def test_computes_included_languages_from_files(self):
        """Should compute included_languages from file languages."""
        lang = Language.objects.first()
        video_kind = ContentKind.objects.get(kind=content_kinds.VIDEO)

        node = ContentNode.objects.create(
            title="Content with file language",
            kind=video_kind,
            parent=self.channel.main_tree,
            published=True,
            complete=True,
        )

        # Create a file with a language
        File.objects.create(
            contentnode=node,
            language=lang,
        )

        data, _ = validate_published_data({}, self.channel)

        self.assertIn("included_languages", data)
        self.assertIn(lang.id, data["included_languages"])

    def test_does_not_overwrite_existing_included_languages(self):
        """Should preserve existing included_languages in data."""
        existing_languages = ["en", "es"]
        input_data = {"included_languages": existing_languages}

        data, _ = validate_published_data(input_data, self.channel)

        self.assertEqual(data["included_languages"], existing_languages)

    def test_computes_included_categories_when_missing(self):
        """Should compute included_categories from published nodes."""
        video_kind = ContentKind.objects.get(kind=content_kinds.VIDEO)

        ContentNode.objects.create(
            title="Categorized Content",
            kind=video_kind,
            parent=self.channel.main_tree,
            categories={"math": True, "science": True},
            published=True,
            complete=True,
        )

        data, _ = validate_published_data({}, self.channel)

        self.assertIn("included_categories", data)
        self.assertIn("math", data["included_categories"])
        self.assertIn("science", data["included_categories"])

    def test_does_not_overwrite_existing_included_categories(self):
        """Should preserve existing included_categories in data."""
        existing_categories = ["history", "art"]
        input_data = {"included_categories": existing_categories}

        data, _ = validate_published_data(input_data, self.channel)

        self.assertEqual(data["included_categories"], existing_categories)

    def test_computes_kind_count(self):
        """Should compute kind_count from published nodes."""
        video_kind = ContentKind.objects.get(kind=content_kinds.VIDEO)

        # Create two video nodes
        for i in range(2):
            ContentNode.objects.create(
                title=f"Video {i}",
                kind=video_kind,
                parent=self.channel.main_tree,
                published=True,
                complete=True,
            )

        data, _ = validate_published_data({}, self.channel)

        self.assertIn("kind_count", data)
        # Find the video kind count
        video_count = next(
            (kc for kc in data["kind_count"] if kc["kind_id"] == content_kinds.VIDEO),
            None,
        )
        self.assertIsNotNone(video_count)
        self.assertEqual(video_count["count"], 2)

    def test_does_not_overwrite_existing_kind_count(self):
        """Should preserve existing kind_count in data."""
        existing_counts = [{"kind_id": "video", "count": 99}]
        input_data = {"kind_count": existing_counts}

        data, _ = validate_published_data(input_data, self.channel)

        self.assertEqual(data["kind_count"], existing_counts)

    def test_computes_non_distributable_licenses_when_arr_present(self):
        """Should set non_distributable_licenses when All Rights Reserved is included."""
        arr_license = License.objects.get(license_name=licenses.ALL_RIGHTS_RESERVED)
        video_kind = ContentKind.objects.get(kind=content_kinds.VIDEO)

        ContentNode.objects.create(
            title="All Rights Reserved Content",
            kind=video_kind,
            parent=self.channel.main_tree,
            license=arr_license,
            published=True,
            complete=True,
        )

        data, _ = validate_published_data({}, self.channel)

        self.assertIn("non_distributable_licenses", data)
        self.assertIn(arr_license.id, data["non_distributable_licenses"])

    def test_handles_none_data_input(self):
        """Should handle None as input data by creating empty dict."""
        data, special_permissions = validate_published_data(None, self.channel)

        self.assertIsInstance(data, dict)
        self.assertIsInstance(special_permissions, list)

    def test_computes_special_permissions_for_special_license(self):
        """Should create AuditedSpecialPermissionsLicense for special permissions content."""
        special_description = "Test special permissions"
        _create_special_permissions_node(self.channel.main_tree, special_description)

        _, special_permissions = validate_published_data({}, self.channel)

        self.assertEqual(len(special_permissions), 1)
        self.assertEqual(special_permissions[0].description, special_description)

    def test_skips_special_permissions_when_already_in_data(self):
        """Should return empty list when special_permissions_included already exists."""
        _create_special_permissions_node(self.channel.main_tree, "Some description")
        input_data = {"special_permissions_included": ["existing"]}

        _, special_permissions = validate_published_data(input_data, self.channel)

        self.assertEqual(special_permissions, [])


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
