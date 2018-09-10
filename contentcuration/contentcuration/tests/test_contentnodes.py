import json

from django.core.urlresolvers import reverse_lazy

from base import BaseAPITestCase, BaseTestCase
import testdata

from contentcuration.models import ContentKind, ContentNode
from contentcuration.views import nodes


def _create_nodes(num_nodes, title, parent=None, levels=2):
    topic, _created = ContentKind.objects.get_or_create(kind="Topic")

    for i in range(num_nodes):
        new_node = ContentNode.objects.create(title=title, parent=parent, kind=topic)
        # create a couple levels for testing purposes
        if i > 0 and levels > 1 and i % (num_nodes / levels) == 0:
            parent = new_node


def _check_nodes(parent, title=None, original_channel_id=None, source_channel_id=None, channel=None):
    for node in parent.get_children():
        if title:
            assert node.title == title
        assert node.parent == parent
        if original_channel_id:
            assert node.original_channel_id == original_channel_id, "Node {} with title {} has an incorrect original_channel_id.".format(node.pk, node.title)
        if channel:
            assert node.get_channel() == channel
        if source_channel_id:
            assert node.source_channel_id == source_channel_id
        _check_nodes(node, title, original_channel_id, source_channel_id, channel)


class NodeOperationsTestCase(BaseTestCase):
    def setUp(self):
        super(NodeOperationsTestCase, self).setUp()

        self.channel = testdata.channel()

    def test_duplicate_nodes(self):
        """
        Ensures that when we copy nodes, the new channel gets marked as changed but the old channel doesn't,
        and that the nodes point to the new channel.
        """
        num_nodes = 10
        title = "Dolly"
        topic, _created = ContentKind.objects.get_or_create(kind="Topic")
        self.channel.main_tree = ContentNode.objects.create(title="Heyo!", kind=topic)
        self.channel.save()
        # assert self.channel.main_tree.get_root() == self.channel.main_tree
        # assert self.channel.main_tree.get_channel() == self.channel
        _create_nodes(num_nodes, title, parent=self.channel.main_tree)

        assert self.channel.main_tree.changed == True
        assert self.channel.main_tree.get_channel() == self.channel

        assert self.channel.main_tree.parent is None
        _check_nodes(self.channel.main_tree, title, original_channel_id=self.channel.id, source_channel_id=self.channel.id, channel=self.channel)

        new_channel = testdata.channel()

        # simulate a clean, right-after-publish state to ensure only new channel is marked as change
        self.channel.main_tree.changed = False
        self.channel.main_tree.save()
        self.channel.main_tree.refresh_from_db()
        assert self.channel.main_tree.changed == False

        new_channel.main_tree.changed = False
        new_channel.main_tree.save()
        new_channel.main_tree.refresh_from_db()
        assert new_channel.main_tree.changed == False

        new_tree = nodes.duplicate_node_bulk(self.channel.main_tree, parent=new_channel.main_tree)

        _check_nodes(new_tree, title, original_channel_id=self.channel.id, source_channel_id=self.channel.id, channel=new_channel)
        new_channel.main_tree.refresh_from_db()
        assert new_channel.main_tree.changed == True

        self.channel.main_tree.refresh_from_db()
        assert self.channel.main_tree.changed == False

    def test_multiple_copy_channel_ids(self):
        """
        This test ensures that as we copy nodes across various channels, that their original_channel_id and
        source_channel_id values are properly updated.
        """
        title = "Dolly"
        num_nodes = 10
        topic, _created = ContentKind.objects.get_or_create(kind="Topic")
        new_node = ContentNode.objects.create(title="Heyo!", parent=self.channel.main_tree, kind=topic)
        self.channel.save()
        # assert self.channel.main_tree.get_root() == self.channel.main_tree
        # assert self.channel.main_tree.get_channel() == self.channel
        _create_nodes(num_nodes, title, parent=new_node)

        assert self.channel.main_tree.changed == True
        assert self.channel.main_tree.get_channel() == self.channel

        assert self.channel.main_tree.parent is None
        _check_nodes(new_node, title, original_channel_id=self.channel.id, source_channel_id=self.channel.id, channel=self.channel)

        channels = [
            self.channel,
            testdata.channel(),
            testdata.channel(),
            testdata.channel(),
            testdata.channel()
        ]

        copy_node_root = new_node
        for i in range(1, len(channels)):
            print("Copying channel {} nodes to channel {}".format(i-1, i))
            channel = channels[i]
            prev_channel = channels[i-1]

            prev_channel.main_tree._mark_unchanged()
            prev_channel.main_tree.changed = False
            assert prev_channel.main_tree.get_changed_fields() == {}
            prev_channel.main_tree.save()
            prev_channel.main_tree.refresh_from_db()
            assert prev_channel.main_tree.changed == False

            # simulate a clean, right-after-publish state to ensure only new channel is marked as change
            channel.main_tree.changed = False
            channel.main_tree.save()
            channel.main_tree.refresh_from_db()
            assert channel.main_tree.changed == False

            # make sure we always copy the copy we made in the previous go around :)
            copy_node_root = nodes.duplicate_node_bulk(copy_node_root, parent=channel.main_tree)

            _check_nodes(copy_node_root, original_channel_id=self.channel.id, source_channel_id=prev_channel.id, channel=channel)
            channel.main_tree.refresh_from_db()
            assert channel.main_tree.changed == True
            assert channel.main_tree.get_descendants().filter(changed=True).exists()

            prev_channel.main_tree.refresh_from_db()
            assert prev_channel.main_tree.changed == False


class NodeOperationsAPITestCase(BaseAPITestCase):
    def test_move_nodes(self):
        """
        Ensures that moving nodes properly removes them from the original parent and adds them to the new one,
        and marks the new and old parents as changed, and that the node channel info gets updated as well.
        """
        title = "A Node on the Move"
        topic, _created = ContentKind.objects.get_or_create(kind="Topic")
        self.channel.main_tree = ContentNode.objects.create(title="Heyo!", kind=topic)
        self.channel.save()
        _create_nodes(10, title, parent=self.channel.main_tree)

        assert self.channel.main_tree.get_descendant_count() == 10
        assert self.channel.main_tree.changed == True
        assert self.channel.main_tree.parent is None

        _check_nodes(self.channel.main_tree, title, original_channel_id=self.channel.id, source_channel_id=self.channel.id, channel=self.channel)

        new_channel = testdata.channel()
        new_channel.editors.add(self.user)
        new_channel.main_tree.get_children().delete()
        new_channel_node_count = new_channel.main_tree.get_descendants().count()

        move_data = {
            'target_parent': new_channel.main_tree.id,
            'channel_id': new_channel.id,
            'nodes': []
        }

        for node in self.channel.main_tree.get_children():
            move_data['nodes'].append({'id': node.pk})

        assert self.channel.main_tree.pk not in [node['id'] for node in move_data['nodes']]

        # simulate a clean, right-after-publish state for both trees to ensure they are marked changed after this
        self.channel.main_tree.changed = False
        self.channel.main_tree.save()
        new_channel.main_tree.changed = False
        new_channel.main_tree.save()

        request = self.create_post_request(reverse_lazy('move_nodes'), data=json.dumps(move_data), content_type='application/json')
        nodes.move_nodes(request)

        ContentNode.objects.partial_rebuild(self.channel.main_tree.tree_id)
        self.channel.main_tree.refresh_from_db()
        new_channel.main_tree.refresh_from_db()

        # these can get out of sync if we don't do a rebuild
        assert self.channel.main_tree.get_descendants().count() == self.channel.main_tree.get_descendant_count()

        assert self.channel.main_tree != new_channel.main_tree
        assert self.channel.main_tree.changed == True
        assert new_channel.main_tree.changed == True

        assert self.channel.main_tree.get_descendant_count() == 0
        if new_channel.main_tree.get_descendants().count() > 10:
            def recursive_print(node, indent=0):
                for child in node.get_children():
                    print("{}Node: {}".format(" " * indent, child.title))
                    recursive_print(child, indent+4)
            recursive_print(new_channel.main_tree)

        assert new_channel.main_tree.get_descendants().count() == new_channel_node_count + 10

        assert not self.channel.main_tree.get_descendants().filter(changed=True).exists()
        assert new_channel.main_tree.get_descendants().filter(changed=True).exists()

        # TODO: Should a newly created node that was moved still have the channel it was moved from as its origin/source
        _check_nodes(new_channel.main_tree, title=title, original_channel_id=self.channel.id, source_channel_id=self.channel.id, channel=new_channel)

    def test_delete_nodes(self):
        """
        Ensuring
        """
        title = "A Node Not Long For This World"
        topic, _created = ContentKind.objects.get_or_create(kind="Topic")
        self.channel.main_tree = ContentNode.objects.create(title="Heyo!", kind=topic)
        self.channel.save()
        _create_nodes(10, title, parent=self.channel.main_tree)

        assert self.channel.main_tree.get_descendant_count() == 10
        assert self.channel.main_tree.changed == True
        assert self.channel.main_tree.parent is None

        _check_nodes(self.channel.main_tree, title, original_channel_id=self.channel.id, source_channel_id=self.channel.id, channel=self.channel)

        # simulate a clean, right-after-publish state to ensure it is marked as change
        self.channel.main_tree.changed = False

        changed_fields = self.channel.main_tree.get_changed_fields()
        assert changed_fields == {}

        self.channel.editors.add(self.user)
        self.channel.main_tree.save()
        assert self.channel.main_tree.changed == False

        delete_data = {
            'channel_id': self.channel.id,
            'nodes': []
        }

        for node in self.channel.main_tree.get_children():
            delete_data['nodes'].append(node.pk)

        request = self.create_post_request(reverse_lazy('delete_nodes'), data=json.dumps(delete_data), content_type='application/json')
        nodes.delete_nodes(request)

        self.channel.main_tree.refresh_from_db()
        assert self.channel.main_tree.get_descendants().count() == 0
        assert not self.channel.main_tree.get_descendants().filter(changed=True).exists()
        assert self.channel.main_tree.changed == True
