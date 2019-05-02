import json

import testdata
from base import BaseAPITestCase
from base import BaseTestCase
from django.conf import settings
from django.core.urlresolvers import reverse_lazy

from .testdata import create_temp_file
from contentcuration.models import Channel
from contentcuration.models import ContentKind
from contentcuration.models import ContentNode
from contentcuration.models import FormatPreset
from contentcuration.models import generate_storage_url
from contentcuration.models import Language
from contentcuration.utils.files import create_thumbnail_from_base64
from contentcuration.utils.nodes import move_nodes
from contentcuration.utils.sync import sync_node
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


class NodeGettersTestCase(BaseTestCase):
    def setUp(self):
        super(NodeGettersTestCase, self).setUp()

        self.channel = testdata.channel()
        self.topic, _created = ContentKind.objects.get_or_create(kind="Topic")
        self.thumbnail_data = "allyourbase64arebelongtous"

    def test_get_node_thumbnail_default(self):
        new_node = ContentNode.objects.create(title="Heyo!", parent=self.channel.main_tree, kind=self.topic)

        default_thumbnail = "/".join([settings.STATIC_URL.rstrip("/"), "img", "{}_placeholder.png".format(new_node.kind_id)])
        thumbnail = new_node.get_thumbnail()
        assert thumbnail == default_thumbnail

    def test_get_node_thumbnail_base64(self):
        new_node = ContentNode.objects.create(title="Heyo!", parent=self.channel.main_tree, kind=self.topic)

        new_node.thumbnail_encoding = '{"base64": "%s"}' % self.thumbnail_data

        assert new_node.get_thumbnail() == self.thumbnail_data

    def test_get_node_thumbnail_file(self):
        new_node = ContentNode.objects.create(title="Heyo!", parent=self.channel.main_tree, kind=self.topic)
        thumbnail_file = create_thumbnail_from_base64(testdata.base64encoding())
        thumbnail_file.contentnode = new_node

        # we need to make sure the file is marked as a thumbnail
        preset, _created = FormatPreset.objects.get_or_create(id="video_thumbnail")
        preset.thumbnail = True
        thumbnail_file.preset = preset
        thumbnail_file.save()

        assert new_node.get_thumbnail() == generate_storage_url(str(thumbnail_file))

    def test_get_node_details(self):
        details = self.channel.main_tree.get_details()
        assert details['resource_count'] > 0
        assert details['resource_size'] > 0
        assert details['kind_count'] > 0



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

        assert self.channel.main_tree.changed is True
        assert self.channel.main_tree.get_channel() == self.channel

        assert self.channel.main_tree.parent is None
        _check_nodes(self.channel.main_tree, title, original_channel_id=self.channel.id, source_channel_id=self.channel.id, channel=self.channel)

        new_channel = testdata.channel()

        # simulate a clean, right-after-publish state to ensure only new channel is marked as change
        self.channel.main_tree.changed = False
        self.channel.main_tree.save()
        self.channel.main_tree.refresh_from_db()
        assert self.channel.main_tree.changed is False

        new_channel.main_tree.changed = False
        new_channel.main_tree.save()
        new_channel.main_tree.refresh_from_db()
        assert new_channel.main_tree.changed is False

        new_tree = nodes.duplicate_node_bulk(self.channel.main_tree, parent=new_channel.main_tree)

        _check_nodes(new_tree, title, original_channel_id=self.channel.id, source_channel_id=self.channel.id, channel=new_channel)
        new_channel.main_tree.refresh_from_db()
        assert new_channel.main_tree.changed is True

        self.channel.main_tree.refresh_from_db()
        assert self.channel.main_tree.changed is False

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

        assert self.channel.main_tree.changed is True
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
            print("Copying channel {} nodes to channel {}".format(i - 1, i))
            channel = channels[i]
            prev_channel = channels[i - 1]

            prev_channel.main_tree._mark_unchanged()
            prev_channel.main_tree.changed = False
            assert prev_channel.main_tree.get_changed_fields() == {}
            prev_channel.main_tree.save()
            prev_channel.main_tree.refresh_from_db()
            assert prev_channel.main_tree.changed is False

            # simulate a clean, right-after-publish state to ensure only new channel is marked as change
            channel.main_tree.changed = False
            channel.main_tree.save()
            channel.main_tree.refresh_from_db()
            assert channel.main_tree.changed is False

            # make sure we always copy the copy we made in the previous go around :)
            copy_node_root = nodes.duplicate_node_bulk(copy_node_root, parent=channel.main_tree)

            _check_nodes(copy_node_root, original_channel_id=self.channel.id, source_channel_id=prev_channel.id, channel=channel)
            channel.main_tree.refresh_from_db()
            assert channel.main_tree.changed is True
            assert channel.main_tree.get_descendants().filter(changed=True).exists()

            prev_channel.main_tree.refresh_from_db()
            assert prev_channel.main_tree.changed is False

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
        assert self.channel.main_tree.changed is True
        assert self.channel.main_tree.parent is None

        _check_nodes(self.channel.main_tree, title, original_channel_id=self.channel.id, source_channel_id=self.channel.id, channel=self.channel)

        new_channel = testdata.channel()
        new_channel.editors.add(self.user)
        new_channel.main_tree.get_children().delete()
        new_channel_node_count = new_channel.main_tree.get_descendants().count()

        nodes = []

        for node in self.channel.main_tree.get_children():
            nodes.append({'id': node.pk})

        assert self.channel.main_tree.pk not in [node['id'] for node in nodes]

        # simulate a clean, right-after-publish state for both trees to ensure they are marked changed after this
        self.channel.main_tree.changed = False
        self.channel.main_tree.save()
        new_channel.main_tree.changed = False
        new_channel.main_tree.save()

        move_nodes(new_channel.id, new_channel.main_tree.id, nodes,
                   min_order=0, max_order=len(nodes))

        ContentNode.objects.partial_rebuild(self.channel.main_tree.tree_id)
        self.channel.main_tree.refresh_from_db()
        new_channel.main_tree.refresh_from_db()

        # these can get out of sync if we don't do a rebuild
        assert self.channel.main_tree.get_descendants().count() == self.channel.main_tree.get_descendant_count()

        assert self.channel.main_tree != new_channel.main_tree
        assert self.channel.main_tree.changed is True
        assert new_channel.main_tree.changed is True

        assert self.channel.main_tree.get_descendant_count() == 0
        if new_channel.main_tree.get_descendants().count() > 10:
            def recursive_print(node, indent=0):
                for child in node.get_children():
                    print("{}Node: {}".format(" " * indent, child.title))
                    recursive_print(child, indent + 4)
            recursive_print(new_channel.main_tree)

        assert new_channel.main_tree.get_descendants().count() == new_channel_node_count + 10

        assert not self.channel.main_tree.get_descendants().filter(changed=True).exists()
        assert new_channel.main_tree.get_descendants().filter(changed=True).exists()

        # TODO: Should a newly created node that was moved still have the channel it was moved from as its origin/source
        _check_nodes(new_channel.main_tree, title=title, original_channel_id=self.channel.id, source_channel_id=self.channel.id, channel=new_channel)


class NodeOperationsAPITestCase(BaseAPITestCase):

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
        assert self.channel.main_tree.changed is True
        assert self.channel.main_tree.parent is None

        _check_nodes(self.channel.main_tree, title, original_channel_id=self.channel.id, source_channel_id=self.channel.id, channel=self.channel)

        # simulate a clean, right-after-publish state to ensure it is marked as change
        self.channel.main_tree.changed = False

        changed_fields = self.channel.main_tree.get_changed_fields()
        assert changed_fields == {}

        self.channel.editors.add(self.user)
        self.channel.main_tree.save()
        assert self.channel.main_tree.changed is False

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
        assert self.channel.main_tree.changed is True




class SyncNodesOperationTestCase(BaseTestCase):
    """
    Checks that sync nodes updates properies.
    """

    def setUp(self):
        super(SyncNodesOperationTestCase, self).setUp()

    def test_sync_after_no_changes(self):
        orig_video, cloned_video = self._setup_original_and_deriative_nodes()
        sync_node(cloned_video, self.new_channel.id,
                         sync_attributes=True,
                         sync_tags=True,
                         sync_files=True,
                         sync_assessment_items=True,
                         sync_sort_order=True)
        self._assert_same_files(orig_video, cloned_video)

    def test_sync_with_subs(self):
        orig_video, cloned_video = self._setup_original_and_deriative_nodes()
        self._add_subs_to_video_node(orig_video, 'fr')
        self._add_subs_to_video_node(orig_video, 'es')
        self._add_subs_to_video_node(orig_video, 'en')
        sync_node(cloned_video, self.new_channel.id,
                         sync_attributes=True,
                         sync_tags=True,
                         sync_files=True,
                         sync_assessment_items=True,
                         sync_sort_order=True)
        self._assert_same_files(orig_video, cloned_video)


    def test_resync_after_more_subs_added(self):
        orig_video, cloned_video = self._setup_original_and_deriative_nodes()
        self._add_subs_to_video_node(orig_video, 'fr')
        self._add_subs_to_video_node(orig_video, 'es')
        self._add_subs_to_video_node(orig_video, 'en')
        sync_node(cloned_video, self.new_channel.id,
                         sync_attributes=True,
                         sync_tags=True,
                         sync_files=True,
                         sync_assessment_items=True,
                         sync_sort_order=True)
        self._add_subs_to_video_node(orig_video, 'ar')
        self._add_subs_to_video_node(orig_video, 'zul')
        sync_node(cloned_video, self.new_channel.id,
                         sync_attributes=True,
                         sync_tags=True,
                         sync_files=True,
                         sync_assessment_items=True,
                         sync_sort_order=True)
        self._assert_same_files(orig_video, cloned_video)


    def _create_video_node(self, title, parent, withsubs=False):
        data = dict(
            kind_id='video',
            title=title,
            node_id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        )
        video_node = testdata.node(data, parent=parent)

        if withsubs:
            self._add_subs_to_video_node(video_node, 'fr')
            self._add_subs_to_video_node(video_node, 'es')
            self._add_subs_to_video_node(video_node, 'en')

        return video_node

    def _add_subs_to_video_node(self, video_node, lang):
        lang_obj = Language.objects.get(id=lang)
        sub_file = create_temp_file('subsin'+lang, preset='video_subtitle', ext='vtt')['db_file']
        sub_file.language = lang_obj
        sub_file.contentnode = video_node
        sub_file.save()

    def _create_empty_tree(self):
        topic_kind = ContentKind.objects.get(kind="topic")
        root_node = ContentNode.objects.create(title='Le derivative root', kind=topic_kind)
        return root_node

    def _create_minimal_tree(self, withsubs=False):
        topic_kind = ContentKind.objects.get(kind="topic")
        root_node = ContentNode.objects.create(title='Le root', kind=topic_kind)
        self._create_video_node(title='Sample video', parent=root_node, withsubs=withsubs)
        return root_node

    def _setup_original_and_deriative_nodes(self):
        # Setup original channel
        self.channel = testdata.channel()  # done in base class but doesn't hurt to do again...
        self.channel.main_tree = self._create_minimal_tree(withsubs=False)
        self.channel.save()

        # Setup derivative channel
        self.new_channel = Channel.objects.create(name='derivative of teschannel', source_id='lkajs')
        self.new_channel.save()
        self.new_channel.main_tree = self._create_empty_tree()
        self.new_channel.main_tree.save()
        new_tree = nodes.duplicate_node_bulk(self.channel.main_tree, parent=self.new_channel.main_tree)
        self.new_channel.main_tree = new_tree
        # self.new_channel.main_tree.save()   #  InvalidMove: A node may not be made a child of any of its descendants.
        self.new_channel.main_tree.refresh_from_db()

        # Return video nodes we need for this test
        orig_video = self.channel.main_tree.children.all()[0]
        cloned_video = self.new_channel.main_tree.children.all()[0]
        return orig_video, cloned_video

    def _assert_same_files(self, nodeA, nodeB):
        filesA = nodeA.files.all().order_by('checksum')
        filesB = nodeB.files.all().order_by('checksum')
        assert len(filesA) == len(filesB), 'different number of files found'
        for fileA, fileB in zip(filesA, filesB):
            assert fileA.checksum == fileB.checksum, 'different checksum found'
            assert fileA.preset == fileB.preset, 'different preset found'
            assert fileA.language == fileB.language, 'different language found'
