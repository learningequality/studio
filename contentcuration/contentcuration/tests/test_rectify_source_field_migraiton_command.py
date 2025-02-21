# DELETE THIS FILE AFTER RUNNING THE MIGRATIONSSS
import datetime
import uuid

from django.core.management import call_command
from django.utils import timezone
from le_utils.constants import content_kinds

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import License
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.utils.publish import publish_channel


class TestRectifyMigrationCommand(StudioAPITestCase):

    @classmethod
    def setUpClass(cls):
        super(TestRectifyMigrationCommand, cls).setUpClass()

    def tearDown(self):
        super(TestRectifyMigrationCommand, self).tearDown()

    def setUp(self):
        super(TestRectifyMigrationCommand, self).setUp()
        self.original_channel = testdata.channel()
        self.license_original = License.objects.get(license_name="Special Permissions")
        self.license_description_original = "License to chill"
        self.original_contentnode = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            title="Original Node",
            parent=self.original_channel.main_tree,
            license=self.license_original,
            license_description=self.license_description_original,
            original_channel_id=None,
            source_channel_id=None,
            author="old author"
        )
        self.user = testdata.user()
        self.original_channel.editors.add(self.user)
        self.client.force_authenticate(user=self.user)

    def create_base_channel_and_contentnode(self, source_contentnode, source_channel):
        base_channel = testdata.channel()
        base_channel.public = True
        base_channel.save()
        base_node = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            title="base contentnode",
            parent=base_channel.main_tree,
            kind_id=content_kinds.VIDEO,
            original_channel_id=self.original_channel.id,
            original_source_node_id=self.original_contentnode.node_id,
            source_channel_id=source_channel.id,
            source_node_id=source_contentnode.node_id,
            author="source author",
            license=self.license_original,
            license_description=None,
        )
        return base_node, base_channel

    def create_source_channel_and_contentnode(self):
        source_channel = testdata.channel()
        source_channel.public = True
        source_channel.save()
        source_node = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            title="base contentnode",
            parent=source_channel.main_tree,
            kind_id=content_kinds.VIDEO,
            license=self.license_original,
            license_description="No chill",
            original_channel_id=self.original_channel.id,
            source_channel_id=self.original_channel.id,
            source_node_id=self.original_contentnode.node_id,
            original_source_node_id=self.original_contentnode.node_id,
            author="source author",
        )

        return source_node, source_channel

    def run_migrations(self):
        call_command('rectify_incorrect_contentnode_source_fields', user_id=self.user.id, is_test=True)

    def test_two_node_case(self):
        base_node, base_channel = self.create_base_channel_and_contentnode(self.original_contentnode, self.original_channel)

        publish_channel(self.user.id, Channel.objects.get(pk=base_channel.pk).id)

        # main_tree node still has changed=true even after the publish
        for node in Channel.objects.get(pk=base_channel.pk).main_tree.get_family().filter(changed=True):
            node.changed = False
            # This should probably again change the changed=true but suprisingly it doesnot
            # Meaning the changed boolean doesnot change for the main_tree no matter what we do
            # through ContentNode model methods like save.
            node.save()

        ContentNode.objects.filter(pk=base_node.pk).update(
        modified=datetime.datetime(2023, 7, 5, tzinfo=timezone.utc)
        )

        self.run_migrations()
        updated_base_node = ContentNode.objects.get(pk=base_node.pk)
        self.assertEqual(updated_base_node.license_description, self.original_contentnode.license_description)
        self.assertEqual(Channel.objects.get(pk=base_channel.id).main_tree.get_family().filter(changed=True).exists(), False)

    def test_three_node_case_implicit(self):
        source_node, source_channel = self.create_source_channel_and_contentnode()
        base_node, base_channel = self.create_base_channel_and_contentnode(source_node, source_channel)
        source_node.aggregator = "Nami"
        source_node.save()
        # Implicit case
        base_node.author = source_node.author
        base_node.license = source_node.license
        base_node.aggregator = source_node.aggregator
        base_node.save()

        publish_channel(self.user.id, Channel.objects.get(pk=base_channel.pk).id)

        for node in Channel.objects.get(pk=base_channel.pk).main_tree.get_family().filter(changed=True):
            node.changed = False
            node.save()

        ContentNode.objects.filter(pk=base_node.pk).update(
        modified=datetime.datetime(2023, 7, 5, tzinfo=timezone.utc)
        )

        ContentNode.objects.filter(pk=source_node.pk).update(
            modified=datetime.datetime(2023, 3, 5, tzinfo=timezone.utc)
        )

        self.run_migrations()
        updated_base_node = ContentNode.objects.get(pk=base_node.pk)
        updated_source_node = ContentNode.objects.get(pk=source_node.pk)
        self.assertEqual(updated_base_node.license_description, self.original_contentnode.license_description)
        self.assertEqual(updated_source_node.license_description, self.original_contentnode.license_description)
        self.assertEqual(Channel.objects.get(pk=base_channel.id).main_tree.get_family().filter(changed=True).exists(), False)

    def test_three_node_case_explicit(self):
        source_node, source_channel = self.create_source_channel_and_contentnode()
        base_node, base_channel = self.create_base_channel_and_contentnode(source_node, source_channel)
        source_node.license_description = "luffy"
        base_node.license_description = "zoro"
        base_node.save()
        source_node.save()
        publish_channel(self.user.id, Channel.objects.get(pk=base_channel.pk).id)

        for node in Channel.objects.get(pk=base_channel.pk).main_tree.get_family().filter(changed=True):
            node.changed = False
            node.save()

        ContentNode.objects.filter(pk=base_node.pk).update(
        modified=datetime.datetime(2023, 7, 5, tzinfo=timezone.utc)
        )

        ContentNode.objects.filter(pk=source_node.pk).update(
            modified=datetime.datetime(2023, 3, 5, tzinfo=timezone.utc)
        )

        self.run_migrations()
        updated_base_node = ContentNode.objects.get(pk=base_node.pk)
        updated_source_node = ContentNode.objects.get(pk=source_node.pk)
        self.assertEqual(updated_base_node.license_description, self.original_contentnode.license_description)
        self.assertEqual(updated_source_node.license_description, self.original_contentnode.license_description)
        self.assertEqual(Channel.objects.get(pk=base_channel.id).main_tree.get_family().filter(changed=True).exists(), False)
