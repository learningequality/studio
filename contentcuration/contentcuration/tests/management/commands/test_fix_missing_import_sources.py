from unittest.mock import mock_open
from unittest.mock import patch

from django.core.management import call_command

from contentcuration.tests import testdata
from contentcuration.tests.base import StudioTestCase


class CommandTestCase(StudioTestCase):
    """Test suite for the fix_missing_import_sources management command"""

    def setUp(self):
        open_patcher = patch(
            "contentcuration.management.commands.fix_missing_import_sources.open",
            mock_open(),
        )
        self.mock_open = open_patcher.start()
        self.mock_file = self.mock_open.return_value
        self.mock_file.__enter__.return_value = self.mock_file
        self.addCleanup(open_patcher.stop)

        csv_writer_patcher = patch(
            "contentcuration.management.commands.fix_missing_import_sources.csv.DictWriter"
        )
        self.mock_csv_writer = csv_writer_patcher.start()
        self.mock_csv_writer_instance = self.mock_csv_writer.return_value
        self.addCleanup(csv_writer_patcher.stop)

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

    def test_handle__opens_csv_file(self):
        call_command("fix_missing_import_sources")

        self.mock_open.assert_called_once_with(
            "fix_missing_import_sources.csv", "w", newline=""
        )

        self.mock_csv_writer.assert_called_once_with(
            self.mock_file,
            fieldnames=[
                "channel_id",
                "channel_name",
                "contentnode_id",
                "contentnode_title",
                "public_channel_id",
                "public_channel_name",
                "public_channel_deleted",
            ],
        )

        self.mock_csv_writer_instance.writeheader.assert_called_once()
        self.mock_csv_writer_instance.writerow.assert_not_called()

    def test_handle__finds_missing(self):
        self.original_node.delete()
        call_command("fix_missing_import_sources")

        self.mock_csv_writer_instance.writerow.assert_called_once_with(
            {
                "channel_id": self.private_channel.id,
                "channel_name": self.private_channel.name,
                "contentnode_id": self.copied_node.id,
                "contentnode_title": self.copied_node.title,
                "public_channel_id": self.public_channel.id,
                "public_channel_name": self.public_channel.name,
                "public_channel_deleted": False,
            }
        )

    def test_handle__finds_for_deleted_channel(self):
        self.public_channel.deleted = True
        self.public_channel.save(actor_id=testdata.user().id)
        call_command("fix_missing_import_sources")

        self.mock_csv_writer_instance.writerow.assert_called_once_with(
            {
                "channel_id": self.private_channel.id,
                "channel_name": self.private_channel.name,
                "contentnode_id": self.copied_node.id,
                "contentnode_title": self.copied_node.title,
                "public_channel_id": self.public_channel.id,
                "public_channel_name": self.public_channel.name,
                "public_channel_deleted": True,
            }
        )
