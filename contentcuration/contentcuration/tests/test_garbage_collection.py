from __future__ import absolute_import

import json

import pytest
from django.conf import settings
from django.urls import reverse_lazy
from le_utils.constants import content_kinds

from .base import BaseAPITestCase
from .testdata import tree
from contentcuration import models as cc
from contentcuration.api import activate_channel
from contentcuration.utils.garbage_collect import clean_up_deleted_chefs
from contentcuration.utils.garbage_collect import get_deleted_chefs_root
from contentcuration.views.internal import api_commit_channel
from contentcuration.views.internal import create_channel

pytestmark = pytest.mark.django_db


class NodeSettingTestCase(BaseAPITestCase):
    def setUp(self):
        super(NodeSettingTestCase, self).setUp()
        # Set up ricecooker trees
        self.channel.staging_tree = cc.ContentNode(
            kind_id=content_kinds.TOPIC, title="test", node_id="aaa"
        )
        self.channel.staging_tree.save()
        self.channel.previous_tree = cc.ContentNode(
            kind_id=content_kinds.TOPIC, title="test", node_id="bbb"
        )
        self.channel.previous_tree.save()
        self.channel.chef_tree = cc.ContentNode(
            kind_id=content_kinds.TOPIC, title="test", node_id="ccc"
        )
        self.channel.chef_tree.save()
        self.channel.save()

        self.contentnode = cc.ContentNode.objects.create(kind_id="video")

    def test_garbage_node_created(self):
        # Make sure loadconstants created the garbage node
        self.assertTrue(
            cc.ContentNode.objects.filter(pk=settings.ORPHANAGE_ROOT_ID).exists()
        )

    def test_file_move(self):
        node = self.contentnode

        # Move node and check if it's still in the garbage tree
        node.parent_id = self.channel.main_tree.pk
        node.save()
        garbage_node = cc.ContentNode.objects.get(pk=settings.ORPHANAGE_ROOT_ID)

        # Node shouldn't be in garbage tree
        self.assertFalse(garbage_node.get_descendants().filter(pk=node.pk).exists())
        self.assertNotEqual(garbage_node.tree_id, node.tree_id)

    def test_old_chef_tree(self):
        # make an actual tree for deletion tests
        tree(parent=self.channel.chef_tree)
        chef_tree = self.channel.chef_tree
        self.assertTrue(chef_tree.get_descendant_count() > 0)
        garbage_node = get_deleted_chefs_root()

        self.assertNotEqual(chef_tree, self.channel.staging_tree)
        # Chef tree shouldn't be in garbage tree until create_channel is called
        self.assertFalse(
            garbage_node.get_descendants().filter(pk=chef_tree.pk).exists()
        )
        create_channel(self.channel.__dict__, self.user)
        garbage_node.refresh_from_db()
        chef_tree.refresh_from_db()
        self.channel.refresh_from_db()

        # We can't use MPTT methods to test the deleted chefs tree because we are not running the sort code
        # for performance reasons, so just do a parent test instead.
        self.assertEquals(chef_tree.parent.pk, garbage_node.pk)

        # New staging tree should not be in garbage tree
        self.assertFalse(self.channel.chef_tree.parent)
        self.assertNotEqual(garbage_node.tree_id, self.channel.chef_tree.tree_id)

        child_pk = chef_tree.children.first().pk

        clean_up_deleted_chefs()

        self.assertFalse(cc.ContentNode.objects.filter(parent=garbage_node).exists())
        self.assertFalse(cc.ContentNode.objects.filter(pk=child_pk).exists())

    def test_old_staging_tree(self):
        staging_tree = self.channel.staging_tree
        garbage_node = get_deleted_chefs_root()

        tree(parent=staging_tree)
        self.assertTrue(staging_tree.get_descendant_count() > 0)

        # Staging tree shouldn't be in garbage tree until api_commit_channel is called
        self.assertFalse(
            garbage_node.get_descendants().filter(pk=staging_tree.pk).exists()
        )
        request = self.create_post_request(
            reverse_lazy("api_finish_channel"),
            data=json.dumps({"channel_id": self.channel.pk}),
            content_type="application/json",
        )
        response = api_commit_channel(request)
        self.assertEqual(response.status_code, 200)
        garbage_node.refresh_from_db()
        staging_tree.refresh_from_db()
        self.channel.refresh_from_db()

        # We can't use MPTT methods on the deleted chefs tree because we are not running the sort code
        # for performance reasons, so just do a parent test instead.
        self.assertEqual(staging_tree.parent, garbage_node)

        # New staging tree should not be in garbage tree
        self.assertFalse(self.channel.main_tree.parent)
        self.assertNotEqual(garbage_node.tree_id, self.channel.main_tree.tree_id)

        child_pk = staging_tree.children.first().pk

        clean_up_deleted_chefs()

        self.assertFalse(cc.ContentNode.objects.filter(parent=garbage_node).exists())
        self.assertFalse(cc.ContentNode.objects.filter(pk=child_pk).exists())

    def test_activate_channel(self):
        previous_tree = self.channel.previous_tree
        tree(parent=previous_tree)
        garbage_node = get_deleted_chefs_root()

        # Previous tree shouldn't be in garbage tree until activate_channel is called
        self.assertFalse(
            garbage_node.get_descendants().filter(pk=previous_tree.pk).exists()
        )
        activate_channel(self.channel, self.user)
        garbage_node.refresh_from_db()
        previous_tree.refresh_from_db()
        self.channel.refresh_from_db()

        # We can't use MPTT methods on the deleted chefs tree because we are not running the sort code
        # for performance reasons, so just do a parent test instead.
        self.assertTrue(previous_tree.parent == garbage_node)

        # New previous tree should not be in garbage tree
        self.assertFalse(self.channel.previous_tree.parent)
        self.assertNotEqual(garbage_node.tree_id, self.channel.previous_tree.tree_id)

        child_pk = previous_tree.children.first().pk

        clean_up_deleted_chefs()

        self.assertFalse(cc.ContentNode.objects.filter(parent=garbage_node).exists())
        self.assertFalse(cc.ContentNode.objects.filter(pk=child_pk).exists())
