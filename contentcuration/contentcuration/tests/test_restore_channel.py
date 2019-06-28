import datetime
import uuid

from base import StudioTestCase
from mock import MagicMock
from mock import patch

from contentcuration.utils.import_tools import create_channel


thumbnail_path = "/content/thumbnail.png"


class ChannelRestoreUtilityFunctionTestCase(StudioTestCase):
    @patch("contentcuration.utils.import_tools.write_to_thumbnail_file", return_value=thumbnail_path)
    def setUp(self, thumb_mock):
        self.id = uuid.uuid4().hex
        self.name = "test name"
        self.description = "test description"
        self.thumbnail_encoding = "base64 string"
        self.root_pk = uuid.uuid4()
        self.version = 7
        self.last_updated = datetime.datetime.now()
        self.cursor_mock = MagicMock()
        self.cursor_mock.execute.return_value.fetchone.return_value = (
            self.id,
            self.name,
            self.description,
            self.thumbnail_encoding,
            self.root_pk,
            self.version,
            self.last_updated,
        )
        self.channel, _ = create_channel(self.cursor_mock, self.id)

    def test_restore_channel_id(self):
        self.assertEqual(self.channel.id, self.id)

    def test_restore_channel_name(self):
        self.assertEqual(self.channel.name, self.name)

    def test_restore_channel_description(self):
        self.assertEqual(self.channel.description, self.description)

    def test_restore_channel_thumbnail(self):
        self.assertEqual(self.channel.thumbnail, thumbnail_path)

    def test_restore_channel_thumbnail_encoding(self):
        self.assertEqual(self.channel.thumbnail_encoding["base64"], self.thumbnail_encoding)

    def test_restore_channel_version(self):
        self.assertEqual(self.channel.version, self.version)
