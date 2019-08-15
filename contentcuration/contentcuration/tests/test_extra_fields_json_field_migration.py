import json

from .base import MigrationTestCase


class TestForwardJSONMigration(MigrationTestCase):
    migrate_from = '0100_calculate_included_languages'
    migrate_to = '0101_extra_fields_json_field'
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

    migrate_from = '0101_extra_fields_json_field'
    migrate_to = '0100_calculate_included_languages'
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
