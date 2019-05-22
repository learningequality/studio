from django.db import connection
from django.core import management
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase

import json
from contentcuration import models

# Modified from https://www.caktusgroup.com/blog/2016/02/02/writing-unit-tests-django-migrations/


class MigrationTestCase(TransactionTestCase):
    migrate_from = None
    migrate_to = None
    app = None

    def setUp(self):
        assert self.migrate_from and self.migrate_to, \
            "TestCase '{}' must define migrate_from and migrate_to properties".format(type(self).__name__)

        migrate_from = [(self.app, self.migrate_from)]
        migrate_to = [(self.app, self.migrate_to)]
        executor = MigrationExecutor(connection)
        old_apps = executor.loader.project_state(migrate_from).apps

        # Reverse to the original migration
        executor.migrate(migrate_from)

        self.setUpBeforeMigration(old_apps)

        # Run the migration to test
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()  # reload.
        executor.migrate(migrate_to)

        self.apps = executor.loader.project_state(migrate_to).apps

    @classmethod
    def tearDownClass(cls):
        """
        Ensures that the DB is reset and fully migrated due to this
        test class's selective migrations
        """
        management.call_command("migrate")


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
        self.assertEqual({}, models.Channel.objects.get(id=self.no_encoding_id).thumbnail_encoding)

    def test_encoding_dict(self):
        self.assertEqual({'base64': 'base64string'}, models.Channel.objects.get(id=self.encoding_id).thumbnail_encoding)

    def test_encoding_bad_json(self):
        self.assertEqual({'base64': 'base64string'}, models.Channel.objects.get(id=self.single_quotes_id).thumbnail_encoding)


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
        self.assertEqual(None, models.Channel.objects.get(id=self.no_encoding_id).thumbnail_encoding)

    def test_encoding_dict(self):
        self.assertEqual(json.dumps({'base64': 'base64string'}), models.Channel.objects.get(id=self.encoding_id).thumbnail_encoding)
