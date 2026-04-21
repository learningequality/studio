from pathlib import Path
from unittest.mock import patch

from django.core.management import call_command

from contentcuration.management.commands.fix_missing_import_sources import (
    LicensingFixesLookup,
)
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioTestCase


class CommandTestCase(StudioTestCase):
    """Test suite for the fix_missing_import_sources management command"""

    def setUp(self):
        super().setUp()
        self.public_channel = testdata.channel("Public Channel")
        self.public_channel.public = True
        self.public_channel.save()

        self.private_channel = testdata.channel("Private Channel")

        # see tree.json for this file
        self.original_node = (
            self.public_channel.main_tree.get_descendants()
            .filter(node_id="00000000000000000000000000000003")
            .first()
        )
        self.copied_node = self.original_node.copy_to(
            target=self.private_channel.main_tree
        )

    def test_handle__uses_lookup_and_applies_fix_for_missing_source(self):
        self.original_node.delete()
        special_permissions_id = 9
        self.copied_node.refresh_from_db()
        self.copied_node.license = None
        self.copied_node.license_description = ""
        self.copied_node.copyright_holder = ""
        self.copied_node.save()

        with patch(
            "contentcuration.management.commands.fix_missing_import_sources.LicensingFixesLookup"
        ) as lookup_cls:
            lookup = lookup_cls.return_value
            lookup.get_info.return_value = (
                special_permissions_id,
                "Permission granted to distribute through Kolibri for non-commercial use",
                "Khan Academy",
            )

            call_command("fix_missing_import_sources")

        lookup_cls.assert_called_once()
        lookup.load.assert_called_once()
        lookup.get_info.assert_called_once()

        self.copied_node.refresh_from_db()
        self.assertEqual(self.copied_node.license_id, special_permissions_id)
        self.assertEqual(
            self.copied_node.license_description,
            "Permission granted to distribute through Kolibri for non-commercial use",
        )
        self.assertEqual(self.copied_node.copyright_holder, "Khan Academy")

    def test_handle__applies_fix_for_deleted_public_channel(self):
        cc_by_nc_sa_id = 5
        self.public_channel.deleted = True
        self.public_channel.save(actor_id=testdata.user().id)
        self.copied_node.license = None
        self.copied_node.license_description = ""
        self.copied_node.copyright_holder = ""
        self.copied_node.save()

        with patch(
            "contentcuration.management.commands.fix_missing_import_sources.LicensingFixesLookup"
        ) as lookup_cls:
            lookup = lookup_cls.return_value
            lookup.get_info.return_value = (
                cc_by_nc_sa_id,
                "",
                "Khan Academy",
            )

            call_command("fix_missing_import_sources")

        lookup.get_info.assert_called_once_with(
            self.public_channel.id, "video", None, "", ""
        )

        self.copied_node.refresh_from_db()
        self.assertEqual(self.copied_node.license_id, cc_by_nc_sa_id)
        self.assertEqual(self.copied_node.license_description, "")
        self.assertEqual(self.copied_node.copyright_holder, "Khan Academy")

    def test_handle__skips_node_when_lookup_returns_no_license(self):
        self.original_node.delete()
        self.copied_node.refresh_from_db()
        original_license_id = self.copied_node.license_id
        self.copied_node.license_description = "Nothing"
        self.copied_node.copyright_holder = "Nothing"
        self.copied_node.save()

        with patch(
            "contentcuration.management.commands.fix_missing_import_sources.LicensingFixesLookup"
        ) as lookup_cls:
            lookup = lookup_cls.return_value
            lookup.get_info.return_value = (None, "Nothing", "Nothing")

            call_command("fix_missing_import_sources")

        lookup.get_info.assert_called_once()

        self.copied_node.refresh_from_db()
        self.assertEqual(self.copied_node.license_id, original_license_id)
        self.assertEqual(self.copied_node.license_description, "Nothing")
        self.assertEqual(self.copied_node.copyright_holder, "Nothing")


class LicensingFixesLookupTestCase(StudioTestCase):
    @classmethod
    def setUpTestData(cls):
        cls.csv_path = (
            Path(__file__).resolve().parents[3]
            / "management"
            / "commands"
            / "licensing_fixes_lookup.csv"
        )

    def setUp(self):
        self.lookup = LicensingFixesLookup()

    def test_load__reads_csv_and_resolves_all_licenses(self):
        with self.csv_path.open("r", encoding="utf-8", newline="") as csv_file:
            self.lookup.load(csv_file)

        for info in self.lookup._lookup.values():
            if info["license_name"]:
                self.assertIsNotNone(info["license_id"])
                self.assertIsNotNone(
                    self.lookup._license_lookup.get(info["license_id"])
                )

    def test_get_info__special_permissions(self):
        with self.csv_path.open("r", encoding="utf-8", newline="") as csv_file:
            self.lookup.load(csv_file)

        license_id, license_description, copyright_holder = self.lookup.get_info(
            "a53592c972a8594e9b695aa127493ff6",
            "exercise",
            9,
            "",
            "",  # Special Permissions
        )
        self.assertEqual(license_id, 9)
        self.assertEqual(
            license_description,
            "Permission granted to distribute through Kolibri for non-commercial use",
        )
        self.assertEqual(copyright_holder, "Khan Academy")

    def test_get_info__requires_copyright_holder(self):
        with self.csv_path.open("r", encoding="utf-8", newline="") as csv_file:
            self.lookup.load(csv_file)

        license_id, license_description, copyright_holder = self.lookup.get_info(
            "c1f2b7e6ac9f56a2bb44fa7a48b66dce", "video", 5, "", ""  # CC BY-NC-SA
        )
        self.assertEqual(license_id, 5)
        self.assertEqual(license_description, "")
        self.assertEqual(copyright_holder, "Khan Academy")

    def test_get_info__defaults(self):
        with self.csv_path.open("r", encoding="utf-8", newline="") as csv_file:
            self.lookup.load(csv_file)

        license_id, license_description, copyright_holder = self.lookup.get_info(
            "c51a0f842fed427c95acff9bb4a21e3c", "", None, "", ""
        )
        self.assertEqual(license_id, 5)
        self.assertEqual(license_description, "")
        self.assertEqual(copyright_holder, "Enabling Education Network (EENET)")

    def test_get_info__broken(self):
        with self.csv_path.open("r", encoding="utf-8", newline="") as csv_file:
            self.lookup.load(csv_file)

        license_id, license_description, copyright_holder = self.lookup.get_info(
            "237e5975bce25bf6aff398f4c17516f3", "", None, "Nothing", "Nothing"
        )
        self.assertIsNone(license_id)
        self.assertEqual(license_description, "Nothing")
        self.assertEqual(copyright_holder, "Nothing")
