from __future__ import absolute_import

from le_utils.constants import content_kinds

from .base import BaseTestCase
from .testdata import create_temp_file
from contentcuration.models import AssessmentItem
from contentcuration.models import Channel
from contentcuration.utils.publish import mark_all_nodes_as_published
from contentcuration.utils.sync import sync_channel


class SyncTestCase(BaseTestCase):
    """
    Test channel and node sync operations.
    """

    def setUp(self):
        super(SyncTestCase, self).setUp()
        self.derivative_channel = Channel.objects.create(name="testchannel")
        self.channel.main_tree.copy_to(self.derivative_channel.main_tree)
        self.derivative_channel.main_tree.refresh_from_db()
        self.derivative_channel.save()
        assert self.derivative_channel.has_changes()
        assert (
            self.channel.main_tree.get_descendant_count()
            == self.derivative_channel.main_tree.get_descendant_count() - 1
        )

        # Put all nodes into a clean state so we can track when syncing
        # causes changes in the tree.
        mark_all_nodes_as_published(self.channel)
        mark_all_nodes_as_published(self.derivative_channel)

    def _add_temp_file_to_content_node(self, node):
        new_file = create_temp_file("mybytes")
        db_file = new_file["db_file"]
        assert node.files.filter(checksum=db_file.checksum).count() == 0

        db_file.contentnode = node
        db_file.save()
        node.changed = True
        node.save()
        return db_file

    def _add_temp_file_to_assessment_item(self, assessment_item):
        new_file = create_temp_file("mybytes")
        db_file = new_file["db_file"]

        db_file.assessment_item = assessment_item
        db_file.save()
        return db_file

    def test_sync_channel_noop(self):
        """
        Test that calling sync channel with no changed nodes does not change the target channel.
        """

        self.assertFalse(self.channel.has_changes())
        self.assertFalse(self.derivative_channel.has_changes())

        sync_channel(
            self.derivative_channel,
            sync_attributes=True,
            sync_tags=True,
            sync_files=True,
            sync_assessment_items=True,
        )

        self.assertFalse(self.channel.has_changes())
        self.assertFalse(self.derivative_channel.has_changes())

    def test_sync_files_add(self):
        """
        Test that calling sync_files successfully syncs a file added to the original node to
        the copied node.
        """

        self.assertFalse(self.derivative_channel.has_changes())

        contentnode = self.channel.main_tree.children.first()

        target_child = None
        children = self.derivative_channel.main_tree.children.first().get_children()
        self.assertTrue(len(children) > 0)
        for child in children:
            if child.title == contentnode.title:
                target_child = child
                break
        self.assertIsNotNone(target_child)
        self.assertEqual(target_child.files.count(), contentnode.files.count())

        db_file = self._add_temp_file_to_content_node(contentnode)
        self.assertNotEqual(target_child.files.count(), contentnode.files.count())

        self.assertTrue(self.channel.has_changes())

        sync_channel(self.derivative_channel, sync_files=True)
        self.derivative_channel.main_tree.refresh_from_db()

        self.assertEqual(target_child.files.count(), contentnode.files.count())

        self.assertEqual(
            target_child.files.filter(checksum=db_file.checksum).count(), 1
        )
        self.assertTrue(self.derivative_channel.has_changes())

    def test_sync_assessment_item_add(self):
        """
        Test that calling sync_assessment_items successfully syncs a file added to the original node to
        the copied node.
        """

        self.assertFalse(self.derivative_channel.has_changes())

        contentnode = (
            self.channel.main_tree.get_descendants()
            .filter(kind_id=content_kinds.EXERCISE)
            .first()
        )

        target_child = self.derivative_channel.main_tree.get_descendants().get(
            source_node_id=contentnode.node_id
        )

        self.assertIsNotNone(target_child)
        self.assertEqual(
            target_child.assessment_items.count(), contentnode.assessment_items.count()
        )

        ai = AssessmentItem.objects.create(contentnode=contentnode)

        db_file = self._add_temp_file_to_assessment_item(ai)
        self.assertNotEqual(
            target_child.assessment_items.count(), contentnode.assessment_items.count()
        )

        sync_channel(self.derivative_channel, sync_assessment_items=True)
        self.derivative_channel.main_tree.refresh_from_db()

        self.assertEqual(
            target_child.assessment_items.count(), contentnode.assessment_items.count()
        )

        self.assertEqual(
            target_child.assessment_items.filter(
                assessment_id=ai.assessment_id
            ).count(),
            1,
        )

        target_ai = target_child.assessment_items.get(assessment_id=ai.assessment_id)

        self.assertEqual(target_ai.files.count(), ai.files.count())

        self.assertEqual(target_ai.files.filter(checksum=db_file.checksum).count(), 1)

        self.assertTrue(self.derivative_channel.has_changes())
