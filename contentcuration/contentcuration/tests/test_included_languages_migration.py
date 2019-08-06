import datetime

from le_utils.constants import content_kinds

from .base import MigrationTestCase
from contentcuration import models

included_languages_deploy_date = datetime.datetime(2017, 11, 30)
included_languages_should_up_date = datetime.datetime(2016, 11, 30)


class TestForwardIncludedLanguagesMigrationPublishedChannel(MigrationTestCase):

    migrate_from = '0099_auto_20190715_2201'
    migrate_to = '0100_calculate_included_languages'
    app = 'contentcuration'

    def setUpBeforeMigration(self, apps):
        Channel = apps.get_model(self.app, 'Channel')
        self.channel = Channel.objects.create(last_published=included_languages_should_up_date)
        self.unpublished_channel = Channel.objects.create()
        ContentKind = apps.get_model(self.app, 'ContentKind')
        topic, _created = ContentKind.objects.get_or_create(kind=content_kinds.TOPIC)
        ContentNode = apps.get_model(self.app, 'ContentNode')
        self.channel.main_tree = ContentNode.objects.create(lft=1, rght=4, tree_id=3, level=0, kind=topic)
        self.channel.save()
        Language = apps.get_model(self.app, 'Language')
        self.language = Language.objects.create(id="tes_t", lang_code="tes", lang_subcode="t")
        ContentNode.objects.create(tree_id=self.channel.main_tree.tree_id, language=self.language, lft=2, rght=3, level=1, kind=topic, published=True)
        unpublished_language = Language.objects.create(id="nes_t", lang_code="nes", lang_subcode="t")
        ContentNode.objects.create(tree_id=self.channel.main_tree.tree_id, language=unpublished_language, lft=2, rght=3, level=1, kind=topic, published=False)

    def test_include_language(self):
        included_languages = models.Channel.objects.filter(last_published__isnull=False).first().included_languages
        self.assertEqual(included_languages.count(), 1)
        self.assertEqual(included_languages.first().id, self.language.id)
        self.assertEqual(included_languages.first().lang_code, self.language.lang_code)
        self.assertEqual(included_languages.first().lang_subcode, self.language.lang_subcode)


class TestForwardIncludedLanguagesMigrationNewlyPublishedChannel(MigrationTestCase):

    migrate_from = '0099_auto_20190715_2201'
    migrate_to = '0100_calculate_included_languages'
    app = 'contentcuration'

    def setUpBeforeMigration(self, apps):
        Channel = apps.get_model(self.app, 'Channel')
        self.channel = Channel.objects.create(last_published=included_languages_deploy_date)
        self.unpublished_channel = Channel.objects.create()
        ContentKind = apps.get_model(self.app, 'ContentKind')
        topic, _created = ContentKind.objects.get_or_create(kind=content_kinds.TOPIC)
        ContentNode = apps.get_model(self.app, 'ContentNode')
        self.channel.main_tree = ContentNode.objects.create(lft=1, rght=4, tree_id=3, level=0, kind=topic)
        self.channel.save()
        Language = apps.get_model(self.app, 'Language')
        self.language = Language.objects.create(id="tes_t", lang_code="tes", lang_subcode="t")
        ContentNode.objects.create(tree_id=self.channel.main_tree.tree_id, language=self.language, lft=2, rght=3, level=1, kind=topic, published=True)
        unpublished_language = Language.objects.create(id="nes_t", lang_code="nes", lang_subcode="t")
        ContentNode.objects.create(tree_id=self.channel.main_tree.tree_id, language=unpublished_language, lft=2, rght=3, level=1, kind=topic, published=False)

    def test_include_language_no_changes(self):
        included_languages = models.Channel.objects.filter(last_published__isnull=True).first().included_languages
        self.assertEqual(included_languages.count(), 0)


class TestForwardIncludedLanguagesMigrationUnpublishedChannel(MigrationTestCase):

    migrate_from = '0099_auto_20190715_2201'
    migrate_to = '0100_calculate_included_languages'
    app = 'contentcuration'

    def setUpBeforeMigration(self, apps):
        Channel = apps.get_model(self.app, 'Channel')
        self.unpublished_channel = Channel.objects.create()
        ContentKind = apps.get_model(self.app, 'ContentKind')
        topic, _created = ContentKind.objects.get_or_create(kind=content_kinds.TOPIC)
        ContentNode = apps.get_model(self.app, 'ContentNode')
        self.unpublished_channel.main_tree = ContentNode.objects.create(lft=1, rght=4, tree_id=3, level=0, kind=topic)
        self.unpublished_channel.save()
        Language = apps.get_model(self.app, 'Language')
        self.language = Language.objects.create(id="tes_t", lang_code="tes", lang_subcode="t")
        ContentNode.objects.create(
            tree_id=self.unpublished_channel.main_tree.tree_id,
            language=self.language, lft=2, rght=3, level=1, kind=topic, published=True)

    def test_unpublished_no_include_language(self):
        included_languages = models.Channel.objects.filter(last_published__isnull=True).first().included_languages
        self.assertEqual(included_languages.count(), 0)


class TestForwardIncludedLanguagesMigrationFile(MigrationTestCase):

    migrate_from = '0099_auto_20190715_2201'
    migrate_to = '0100_calculate_included_languages'
    app = 'contentcuration'

    def setUpBeforeMigration(self, apps):
        Channel = apps.get_model(self.app, 'Channel')
        self.channel = Channel.objects.create(last_published=included_languages_should_up_date)
        self.unpublished_channel = Channel.objects.create()
        ContentKind = apps.get_model(self.app, 'ContentKind')
        topic, _created = ContentKind.objects.get_or_create(kind=content_kinds.TOPIC)
        ContentNode = apps.get_model(self.app, 'ContentNode')
        self.channel.main_tree = ContentNode.objects.create(lft=1, rght=4, tree_id=3, level=0, kind=topic)
        self.channel.save()
        Language = apps.get_model(self.app, 'Language')
        self.language = Language.objects.create(id="tes_t", lang_code="tes", lang_subcode="t")
        published_node = ContentNode.objects.create(tree_id=self.channel.main_tree.tree_id, lft=2, rght=3, level=1, kind=topic, published=True)
        File = apps.get_model(self.app, 'File')
        File.objects.create(contentnode=published_node, language=self.language)

    def test_include_language(self):
        included_languages = models.Channel.objects.filter(last_published__isnull=False).first().included_languages
        self.assertEqual(included_languages.count(), 1)
        self.assertEqual(included_languages.first().id, self.language.id)
        self.assertEqual(included_languages.first().lang_code, self.language.lang_code)
        self.assertEqual(included_languages.first().lang_subcode, self.language.lang_subcode)
