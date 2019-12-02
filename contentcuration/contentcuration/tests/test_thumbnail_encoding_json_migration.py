import json

from .base import MigrationTestCase


class TestForwardJSONMigration(MigrationTestCase):

    migrate_from = '0001_squashed_0094_auto_20180910_2342'
    migrate_to = '0004_remove_rename_json_field'
    app = 'contentcuration'

    def setUpBeforeMigration(self, apps):
        Channel = apps.get_model(self.app, 'Channel')
        channel_no_endcoding = Channel.objects.create()
        self.no_encoding_id = channel_no_endcoding.id
        channel_encoding = Channel.objects.create(thumbnail_encoding=json.dumps({'base64': 'base64string'}))
        self.encoding_id = channel_encoding.id
        channel_encoding_single_quotes = Channel.objects.create(thumbnail_encoding="{'base64': 'base64string'}")
        self.single_quotes_id = channel_encoding_single_quotes.id

    def test_no_encoding_empty_dict(self):
        Channel = self.apps.get_model(self.app, 'Channel')
        self.assertEqual({}, Channel.objects.get(id=self.no_encoding_id).thumbnail_encoding)

    def test_encoding_dict(self):
        Channel = self.apps.get_model(self.app, 'Channel')
        self.assertEqual({'base64': 'base64string'}, Channel.objects.get(id=self.encoding_id).thumbnail_encoding)

    def test_encoding_bad_json(self):
        Channel = self.apps.get_model(self.app, 'Channel')
        self.assertEqual({'base64': 'base64string'}, Channel.objects.get(id=self.single_quotes_id).thumbnail_encoding)


class TestBackwardJSONMigration(MigrationTestCase):

    migrate_from = '0004_remove_rename_json_field'
    migrate_to = '0001_squashed_0094_auto_20180910_2342'
    app = 'contentcuration'

    def setUpBeforeMigration(self, apps):
        Channel = apps.get_model(self.app, 'Channel')
        channel_no_endcoding = Channel.objects.create()
        self.no_encoding_id = channel_no_endcoding.id
        channel_encoding = Channel.objects.create(thumbnail_encoding={'base64': 'base64string'})
        self.encoding_id = channel_encoding.id

    def test_no_encoding_empty_dict(self):
        Channel = self.apps.get_model(self.app, 'Channel')
        self.assertEqual(None, Channel.objects.get(id=self.no_encoding_id).thumbnail_encoding)

    def test_encoding_dict(self):
        Channel = self.apps.get_model(self.app, 'Channel')
        self.assertEqual(json.dumps({'base64': 'base64string'}), Channel.objects.get(id=self.encoding_id).thumbnail_encoding)
