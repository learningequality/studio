from cStringIO import StringIO

import json
import pytest
from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.urlresolvers import reverse_lazy
from contentcuration import models as cc
from contentcuration.api import activate_channel

from base import BaseAPITestCase

from contentcuration.views.files import file_create
from contentcuration.views.internal import create_channel, api_commit_channel

pytestmark = pytest.mark.django_db


class NodeSettingTestCase(BaseAPITestCase):
    def setUp(self):
        super(NodeSettingTestCase, self).setUp()
        # Set up ricecooker trees
        self.channel.staging_tree = cc.ContentNode(kind_id="topic", title="test", node_id="aaa")
        self.channel.staging_tree.save()
        self.channel.previous_tree = cc.ContentNode(kind_id="topic", title="test", node_id="bbb")
        self.channel.previous_tree.save()
        self.channel.chef_tree = cc.ContentNode(kind_id="topic", title="test", node_id="ccc")
        self.channel.chef_tree.save()
        self.channel.save()

        request = self.create_post_request(reverse_lazy('file_create'), {'file': SimpleUploadedFile("file.pdf", b"contents")})
        self.file_response = file_create(request)

    def test_garbage_node_created(self):
        # Make sure loadconstants created the garbage node
        self.assertTrue(cc.ContentNode.objects.filter(pk=settings.ORPHANAGE_ROOT_ID).exists())


    def test_file_create(self):
        self.assertEqual(self.file_response.status_code, 200)
        garbage_node = cc.ContentNode.objects.get(pk=settings.ORPHANAGE_ROOT_ID)
        data = json.loads(self.file_response.content)
        node = json.loads(data['node'])
        node = cc.ContentNode.objects.get(pk=node['id'])

        # Node should be in garbage tree
        self.assertTrue(garbage_node.get_descendants().filter(pk=node.pk).exists())
        self.assertEqual(garbage_node.tree_id, node.tree_id)


    def test_file_move(self):
        self.assertEqual(self.file_response.status_code, 200)
        data = json.loads(self.file_response.content)
        node = json.loads(data['node'])
        node = cc.ContentNode.objects.get(pk=node['id'])

        # Move node and check if it's still in the garbage tree
        node.parent_id = self.channel.main_tree.pk
        node.save()
        garbage_node = cc.ContentNode.objects.get(pk=settings.ORPHANAGE_ROOT_ID)

        # Node shouldn't be in garbage tree
        self.assertFalse(garbage_node.get_descendants().filter(pk=node.pk).exists())
        self.assertNotEqual(garbage_node.tree_id, node.tree_id)


    def test_old_chef_tree(self):
        chef_tree = self.channel.chef_tree
        garbage_node = cc.ContentNode.objects.get(pk=settings.ORPHANAGE_ROOT_ID)

        # Chef tree shouldn't be in garbage tree until create_channel is called
        self.assertFalse(garbage_node.get_descendants().filter(pk=chef_tree.pk).exists())
        create_channel(self.channel.__dict__, self.user)
        garbage_node.refresh_from_db()
        chef_tree.refresh_from_db()
        self.channel.refresh_from_db()

        # Old chef tree should be in garbage tree now
        self.assertTrue(garbage_node.get_descendants().filter(pk=chef_tree.pk).exists())
        self.assertEqual(garbage_node.tree_id, chef_tree.tree_id)

        # New chef tree should not be in garbage tree
        self.assertFalse(garbage_node.get_descendants().filter(pk=self.channel.chef_tree.pk).exists())
        self.assertNotEqual(garbage_node.tree_id, self.channel.chef_tree.tree_id)

    def test_old_staging_tree(self):
        staging_tree = self.channel.staging_tree
        garbage_node = cc.ContentNode.objects.get(pk=settings.ORPHANAGE_ROOT_ID)

        # Staging tree shouldn't be in garbage tree until api_commit_channel is called
        self.assertFalse(garbage_node.get_descendants().filter(pk=staging_tree.pk).exists())
        request = self.create_post_request(reverse_lazy('api_finish_channel'), data=json.dumps({'channel_id': self.channel.pk}), content_type='application/json')
        response = api_commit_channel(request)
        self.assertEqual(response.status_code, 200)
        garbage_node.refresh_from_db()
        staging_tree.refresh_from_db()
        self.channel.refresh_from_db()

        # Old staging tree should be in garbage tree now
        self.assertTrue(garbage_node.get_descendants().filter(pk=staging_tree.pk).exists())
        self.assertEqual(garbage_node.tree_id, staging_tree.tree_id)

        # New staging tree should not be in garbage tree
        self.assertFalse(garbage_node.get_descendants().filter(pk=self.channel.main_tree.pk).exists())
        self.assertNotEqual(garbage_node.tree_id, self.channel.main_tree.tree_id)

    def test_activate_channel(self):
        previous_tree = self.channel.previous_tree
        garbage_node = cc.ContentNode.objects.get(pk=settings.ORPHANAGE_ROOT_ID)

        # Previous tree shouldn't be in garbage tree until activate_channel is called
        self.assertFalse(garbage_node.get_descendants().filter(pk=previous_tree.pk).exists())
        activate_channel(self.channel, self.user)
        garbage_node.refresh_from_db()
        previous_tree.refresh_from_db()
        self.channel.refresh_from_db()

        # Old previous tree should be in garbage tree now
        self.assertTrue(garbage_node.get_descendants().filter(pk=previous_tree.pk).exists())
        self.assertEqual(garbage_node.tree_id, previous_tree.tree_id)

        # New previous tree should not be in garbage tree
        self.assertFalse(garbage_node.get_descendants().filter(pk=self.channel.previous_tree.pk).exists())
        self.assertNotEqual(garbage_node.tree_id, self.channel.previous_tree.tree_id)
