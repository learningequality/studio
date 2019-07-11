from base import BaseTestCase
from testdata import create_temp_file

from contentcuration.models import Channel
from contentcuration.utils.nodes import duplicate_node_bulk
from contentcuration.utils.publish import mark_all_nodes_as_published
from contentcuration.utils.sync import sync_channel


class SyncTestCase(BaseTestCase):
    """
    Test channel and node sync operations.
    """

    def setUp(self):
        super(SyncTestCase, self).setUp()
        self.derivative_channel = Channel.objects.create(name="testchannel")
        duplicate_node_bulk(self.channel.main_tree,
                            parent=self.derivative_channel.main_tree)
        self.derivative_channel.main_tree.refresh_from_db()
        self.derivative_channel.save()
        assert self.derivative_channel.has_changes()
        assert self.channel.main_tree.get_descendant_count() == \
            self.derivative_channel.main_tree.get_descendant_count() - 1

        # Put all nodes into a clean state so we can track when syncing
        # causes changes in the tree.
        mark_all_nodes_as_published(self.channel)
        mark_all_nodes_as_published(self.derivative_channel)

    def _add_temp_file_to_content_node(self, node):
        new_file = create_temp_file('mybytes')
        db_file = new_file['db_file']
        assert node.files.filter(checksum=db_file.checksum).count() == 0

        db_file.contentnode = node
        db_file.save()
        node.changed = True
        node.save()
        return db_file

    def test_sync_channel_noop(self):
        """
        Test that calling sync channel with no changed nodes does not change the target channel.
        """

        assert not self.channel.has_changes()
        assert not self.derivative_channel.has_changes()

        # Syncing attributes, assessment items, and sort order can lead to changes
        # even directly after a copy, so we avoid syncing them for the no-op test.
        sync_channel(self.derivative_channel, sync_attributes=False, sync_tags=True,
                     sync_files=True, sync_assessment_items=False, sync_sort_order=False)

        assert not self.channel.has_changes()
        assert not self.derivative_channel.has_changes()

    def test_sync_files_add(self):
        """
        Test that calling sync_files successfully syncs a file added to the original node to
        the copied node.
        """

        assert not self.derivative_channel.has_changes()

        contentnode = self.channel.main_tree.children.first()

        target_child = None
        children = self.derivative_channel.main_tree.children.first().get_children()
        assert len(children) > 0
        for child in children:
            if child.title == contentnode.title:
                target_child = child
                break
        assert target_child is not None
        assert target_child.files.count() == contentnode.files.count()

        db_file = self._add_temp_file_to_content_node(contentnode)
        assert target_child.files.count() != contentnode.files.count()

        assert self.channel.has_changes()

        sync_channel(self.derivative_channel, sync_files=True)
        self.derivative_channel.main_tree.refresh_from_db()

        assert target_child.files.count() == contentnode.files.count()

        assert target_child.files.filter(checksum=db_file.checksum).count() == 1
        assert self.derivative_channel.has_changes()
