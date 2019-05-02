from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase
from contentcuration.models import ContentKind

import json
from contentcuration import settings

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


class TestForwardJSONMigration(MigrationTestCase):

    migrate_from = '0097_task'
    migrate_to = '0098_extra_fields_json_field'
    app = 'contentcuration'

    def setUpBeforeMigration(self, apps):
        self.ContentNode = apps.get_model(self.app, 'ContentNode')
        ContentKind = apps.get_model(self.app, 'ContentKind')
        topic, _created = ContentKind.objects.get_or_create(kind="Topic")
        misc = {
            'kind': topic,
            'lft': 0,
            'rght': 1,
            'tree_id': 0,
            'level': 0
        }

        make_content_node = self.ContentNode.objects.create

        self.test_json = {'a': 1, 'b': 'c'}

        make_content_node(id='empty', **misc)
        make_content_node(id='None', extra_fields=None, **misc)
        make_content_node(id='null', extra_fields='null', **misc)
        make_content_node(id='json', extra_fields=json.dumps(self.test_json), **misc)

        self.assertEqual(self.ContentNode._meta.get_field('extra_fields').get_internal_type(), 'TextField')

    def test_json(self):
        self.assertEqual(self.test_json, self.ContentNode.objects.get(id='json').extra_fields)
        self.assertEqual(None, self.ContentNode.objects.get(id='None').extra_fields)

    def test_null_string(self):
        self.assertEqual(None, self.ContentNode.objects.get(id='null').extra_fields)


class TestBackwardJSONMigration(MigrationTestCase):

    migrate_from = '0098_extra_fields_json_field'
    migrate_to = '0097_task'
    app = 'contentcuration'

    def setUpBeforeMigration(self, apps):
        self.ContentNode = apps.get_model(self.app, 'ContentNode')
        ContentKind = apps.get_model(self.app, 'ContentKind')
        topic, _created = ContentKind.objects.get_or_create(kind="Topic")
        misc = {
            'kind': topic,
            'lft': 0,
            'rght': 1,
            'tree_id': 0,
            'level': 0
        }

        make_content_node = self.ContentNode.objects.create

        self.test_json = {'a': 1, 'b': 'c'}

        make_content_node(id='json', extra_fields=self.test_json, **misc)

    def test_json(self):
        self.assertEqual(json.dumps(self.test_json), self.ContentNode.objects.get(id='json').extra_fields)

