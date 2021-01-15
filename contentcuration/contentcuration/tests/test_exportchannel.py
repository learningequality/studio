from __future__ import absolute_import

import os
import random
import string
import tempfile

import pytest
from kolibri_content import models as kolibri_models
from kolibri_content.router import set_active_content_database
from mock import patch

from .base import StudioTestCase
from .testdata import channel
from .testdata import node as create_node
from .testdata import slideshow
from contentcuration import models as cc
from contentcuration.utils.publish import convert_channel_thumbnail
from contentcuration.utils.publish import create_bare_contentnode
from contentcuration.utils.publish import create_content_database
from contentcuration.utils.publish import create_slideshow_manifest
from contentcuration.utils.publish import fill_published_fields
from contentcuration.utils.publish import map_prerequisites
from contentcuration.utils.publish import MIN_SCHEMA_VERSION
from contentcuration.utils.publish import prepare_export_database
from contentcuration.utils.publish import set_channel_icon_encoding
from contentcuration.utils.publish import wait_for_async_tasks

pytestmark = pytest.mark.django_db


def description():
    return "".join(random.sample(string.printable, 20))


class ExportChannelTestCase(StudioTestCase):

    @classmethod
    def setUpClass(cls):
        super(ExportChannelTestCase, cls).setUpClass()
        cls.patch_copy_db = patch('contentcuration.utils.publish.save_export_database')
        cls.patch_copy_db.start()

    @classmethod
    def tearDownClass(cls):
        super(ExportChannelTestCase, cls).tearDownClass()
        cls.patch_copy_db.stop()

    def setUp(self):
        super(ExportChannelTestCase, self).setUp()
        self.content_channel = channel()

        # Add some incomplete nodes to ensure they don't get published.
        new_node = create_node({'kind_id': 'topic', 'title': 'Incomplete topic', 'children': []})
        new_node.complete = False
        new_node.parent = self.content_channel.main_tree
        new_node.save()

        new_video = create_node({'kind_id': 'video', 'title': 'Incomplete video', 'children': []})
        new_video.complete = False
        new_video.parent = new_node
        new_video.save()

        # Add a complete node within an incomplete node to ensure it's excluded.
        new_video = create_node({'kind_id': 'video', 'title': 'Complete video', 'children': []})
        new_video.complete = True
        new_video.parent = new_node
        new_video.save()

        set_channel_icon_encoding(self.content_channel)
        self.tempdb = create_content_database(self.content_channel, True, None, True)

        set_active_content_database(self.tempdb)

    def tearDown(self):
        super(ExportChannelTestCase, self).tearDown()
        set_active_content_database(None)
        if os.path.exists(self.tempdb):
            os.remove(self.tempdb)

    def test_channel_rootnode_data(self):
        channel = kolibri_models.ChannelMetadata.objects.first()
        self.assertEqual(channel.root_pk, channel.root_id)

    def test_channel_version_data(self):
        channel = kolibri_models.ChannelMetadata.objects.first()
        self.assertEqual(channel.min_schema_version, MIN_SCHEMA_VERSION)

    def test_contentnode_license_data(self):
        nodes = kolibri_models.ContentNode.objects.all()
        assert nodes.count() > 0
        for node in nodes:
            if node.license:
                self.assertEqual(node.license_name, node.license.license_name)
                self.assertEqual(node.license_description, node.license.license_description)

    def test_contentnode_incomplete_not_published(self):
        kolibri_nodes = kolibri_models.ContentNode.objects.all()
        assert kolibri_nodes.count() > 0
        channel_nodes = self.content_channel.main_tree.get_descendants()
        complete_nodes = channel_nodes.filter(complete=True)
        incomplete_nodes = channel_nodes.filter(complete=False)

        assert complete_nodes.count() > 0
        assert incomplete_nodes.count() > 0

        for node in complete_nodes:
            # if a parent node is incomplete, this node is excluded as well.
            if node.get_ancestors().filter(complete=False).count() == 0:
                assert kolibri_nodes.filter(pk=node.node_id).count() == 1
            else:
                assert kolibri_nodes.filter(pk=node.node_id).count() == 0

        for node in incomplete_nodes:
            assert kolibri_nodes.filter(pk=node.node_id).count() == 0

    def test_contentnode_channel_id_data(self):
        channel = kolibri_models.ChannelMetadata.objects.first()
        nodes = kolibri_models.ContentNode.objects.all()
        assert nodes.count() > 0
        for node in nodes:
            self.assertEqual(node.channel_id, channel.id)

    def test_contentnode_file_checksum_data(self):
        files = kolibri_models.File.objects.all()
        assert files.count() > 0
        for file in files:
            self.assertEqual(file.checksum, file.local_file_id)

    def test_contentnode_file_extension_data(self):
        files = kolibri_models.File.objects.all()
        assert files.count() > 0
        for file in files.prefetch_related('local_file'):
            self.assertEqual(file.extension, file.local_file.extension)

    def test_contentnode_file_size_data(self):
        files = kolibri_models.File.objects.all()
        assert files.count() > 0
        for file in files.prefetch_related('local_file'):
            self.assertEqual(file.file_size, file.local_file.file_size)

    def test_channel_icon_encoding(self):
        self.assertIsNotNone(self.content_channel.icon_encoding)


class ChannelExportUtilityFunctionTestCase(StudioTestCase):
    @classmethod
    def setUpClass(cls):
        super(ChannelExportUtilityFunctionTestCase, cls).setUpClass()
        cls.patch_copy_db = patch('contentcuration.utils.publish.save_export_database')
        cls.patch_copy_db.start()

    @classmethod
    def tearDownClass(cls):
        super(ChannelExportUtilityFunctionTestCase, cls).tearDownClass()
        cls.patch_copy_db.stop()

    def setUp(self):
        super(ChannelExportUtilityFunctionTestCase, self).setUp()
        fh, output_db = tempfile.mkstemp(suffix=".sqlite3")
        self.output_db = output_db
        set_active_content_database(self.output_db)
        prepare_export_database(self.output_db)

    def tearDown(self):
        super(ChannelExportUtilityFunctionTestCase, self).tearDown()
        set_active_content_database(None)
        if os.path.exists(self.output_db):
            os.remove(self.output_db)

    def test_convert_channel_thumbnail_empty_thumbnail(self):
        channel = cc.Channel.objects.create()
        self.assertEqual("", convert_channel_thumbnail(channel))

    def test_convert_channel_thumbnail_static_thumbnail(self):
        channel = cc.Channel.objects.create(thumbnail="/static/kolibri_flapping_bird.png")
        self.assertEqual("", convert_channel_thumbnail(channel))

    def test_convert_channel_thumbnail_encoding_valid(self):
        channel = cc.Channel.objects.create(thumbnail="/content/kolibri_flapping_bird.png", thumbnail_encoding={"base64": "flappy_bird"})
        self.assertEqual("flappy_bird", convert_channel_thumbnail(channel))

    def test_convert_channel_thumbnail_encoding_invalid(self):
        with patch("contentcuration.utils.publish.get_thumbnail_encoding", return_value="this is a test"):
            channel = cc.Channel.objects.create(thumbnail="/content/kolibri_flapping_bird.png", thumbnail_encoding={})
            self.assertEquals("this is a test", convert_channel_thumbnail(channel))

    def test_create_slideshow_manifest(self):
        content_channel = cc.Channel.objects.create()
        ccnode = cc.ContentNode.objects.create(kind_id=slideshow(), extra_fields={}, complete=True)
        kolibrinode = create_bare_contentnode(ccnode, ccnode.language, content_channel.id, content_channel.name)
        create_slideshow_manifest(ccnode, kolibrinode)
        manifest_collection = cc.File.objects.filter(contentnode=ccnode, preset_id=u"slideshow_manifest")
        assert len(manifest_collection) == 1

    def test_blocking_task_detection(self):
        with patch('time.sleep') as patched_time_sleep:
            user = cc.User.objects.create()
            channel = cc.Channel.objects.create()
            cc.Task.objects.create(channel_id=channel.pk, user_id=user.pk, task_type='sync-channel', metadata={})
            wait_for_async_tasks(channel, attempts=1)
            self.assertEqual(1, patched_time_sleep.call_count)

    def test_blocking_task_completion_detection(self):
        with patch('time.sleep') as patched_time_sleep:
            user = cc.User.objects.create()
            channel = cc.Channel.objects.create()
            cc.Task.objects.create(channel_id=channel.pk, user_id=user.pk, task_type='sync-channel', metadata={}, status='SUCCESS')
            wait_for_async_tasks(channel, attempts=1)
            self.assertEqual(0, patched_time_sleep.call_count)

    def test_blocking_task_failure_detection(self):
        with patch('time.sleep') as patched_time_sleep:
            user = cc.User.objects.create()
            channel = cc.Channel.objects.create()
            cc.Task.objects.create(channel_id=channel.pk, user_id=user.pk, task_type='sync-channel', metadata={}, status='FAILURE')
            wait_for_async_tasks(channel, attempts=1)
            self.assertEqual(0, patched_time_sleep.call_count)

    def test_nonblocking_task_detection(self):
        with patch('time.sleep') as patched_time_sleep:
            user = cc.User.objects.create()
            channel = cc.Channel.objects.create()
            cc.Task.objects.create(channel_id=channel.pk, user_id=user.pk, task_type='get-node-diff', metadata={})
            wait_for_async_tasks(channel, attempts=1)
            self.assertEqual(0, patched_time_sleep.call_count)


class ChannelExportPrerequisiteTestCase(StudioTestCase):
    @classmethod
    def setUpClass(cls):
        super(ChannelExportPrerequisiteTestCase, cls).setUpClass()
        cls.patch_copy_db = patch('contentcuration.utils.publish.save_export_database')
        cls.patch_copy_db.start()

    def setUp(self):
        super(ChannelExportPrerequisiteTestCase, self).setUp()
        fh, output_db = tempfile.mkstemp(suffix=".sqlite3")
        self.output_db = output_db
        set_active_content_database(self.output_db)
        prepare_export_database(self.output_db)

    def tearDown(self):
        super(ChannelExportPrerequisiteTestCase, self).tearDown()
        set_active_content_database(None)
        if os.path.exists(self.output_db):
            os.remove(self.output_db)

    def test_nonexistent_prerequisites(self):
        channel = cc.Channel.objects.create()
        node1 = cc.ContentNode.objects.create(kind_id="exercise", parent_id=channel.main_tree.pk, complete=True)
        exercise = cc.ContentNode.objects.create(kind_id="exercise", complete=True)

        cc.PrerequisiteContentRelationship.objects.create(target_node=exercise, prerequisite=node1)
        map_prerequisites(node1)


class ChannelExportPublishedData(StudioTestCase):
    def test_fill_published_fields(self):
        version_notes = description()
        channel = cc.Channel.objects.create()
        channel.last_published
        fill_published_fields(channel, version_notes)
        self.assertTrue(channel.published_data)
        self.assertIsNotNone(channel.published_data.get(0))
        self.assertEqual(channel.published_data[0]['version_notes'], version_notes)
