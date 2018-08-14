#!/usr/bin/env python
from cStringIO import StringIO
from datetime import datetime, timedelta

import json
import requests
from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.urlresolvers import reverse_lazy
from contentcuration.models import ContentNode, File
from contentcuration.api import activate_channel
from contentcuration.views.files import file_create
from contentcuration.views.internal import create_channel, api_commit_channel
from contentcuration.utils.garbage_collect import clean_up_contentnodes

from base import StudioTestCase, BaseAPITestCase

THREE_MONTHS_AGO = datetime.now() - timedelta(days=93)


def _create_expired_contentnode(creation_date=THREE_MONTHS_AGO):
    c = ContentNode.objects.create(
        kind_id="topic",
        title="test",
        modified=creation_date,
        created=creation_date,
        parent_id=settings.ORPHANAGE_ROOT_ID,
    )
    # Use q queryset.update() to bypass auto_now's forced setting of
    # created to now()
    ContentNode.objects.filter(pk=c.pk).update(
        created=creation_date,
        modified=creation_date,
    )
    return c


class CleanUpContentNodesTestCase(StudioTestCase):

    def test_delete_all_contentnodes_in_orphanage_tree(self):
        """
        Make sure that by default, all nodes created with a timestamp of 3 months
        ago doesn't exist anymore.
        """

        # create our contentnodes that will go under our garbage tree
        num_contentnodes = 3
        for _ in range(num_contentnodes):
            _create_expired_contentnode()

        garbage_tree = ContentNode.objects.get(pk=settings.ORPHANAGE_ROOT_ID)

        # sanity check to see if we have X contentnodes under the garbage tree
        assert garbage_tree.get_descendant_count() == num_contentnodes

        # now clean up our contentnodes, and check that our descendant count is indeed 0 now
        clean_up_contentnodes()
        garbage_tree.refresh_from_db()
        assert garbage_tree.get_descendant_count() == 0


    def test_deletes_associated_files(self):
        c = _create_expired_contentnode()
        f = File.objects.create(
            contentnode_id=c.pk,
            file_on_disk=ContentFile("test"),
            checksum="aaa",
        )
        f.file_on_disk.save("aaa.jpg", ContentFile("aaa"))
        file_url = f.file_on_disk.url

        # check that file_url exists before cleaning up
        requests.head(file_url).raise_for_status()
        clean_up_contentnodes()

        # there should be no file object in the DB
        assert File.objects.count() == 0

    def test_doesnt_delete_nonorphan_files_and_contentnodes(self):
        """
        Make sure that clean_up_contentnodes doesn't touch non-orphan files and
        contentnodes. Bad things will happen if we do.
        """
        # this legit tree, since it's not attached to our
        # orphan tree, should still exist after cleanup
        legit_tree = ContentNode.objects.create(
            kind_id="Topic",
        )
        # this file should still be here too since we attach
        # it to our legit tree
        f = File.objects.create(
            contentnode=legit_tree,
        )

        # this node should be gone
        expired_node = _create_expired_contentnode()

        # do our cleanup!
        clean_up_contentnodes()

        # assert that out expired node doesn't exist
        assert not ContentNode.objects.filter(pk=expired_node.pk).exists()

        # assert that our legit tree still exists
        assert ContentNode.objects.filter(pk=legit_tree.pk).exists()
        assert File.objects.filter(pk=f.pk).exists()

    def test_doesnt_delete_old_legit_tree(self):
        """
        Make sure we don't delete an old content tree, as long as it's not under the
        orphan tree.
        """

        # orphan node. This shouldn't exist anymore at the end of our test.
        orphan_node = _create_expired_contentnode()

        # our old, but not orphaned tree. This should exist at the end of our test.
        legit_node = ContentNode.objects.create(
            kind_id="Topic",
        )
        # mark the legit_node as old
        ContentNode.objects.filter(pk=legit_node.pk).update(
            created=THREE_MONTHS_AGO,
            modified=THREE_MONTHS_AGO,
        )

        clean_up_contentnodes()

        # is our orphan gone? :(
        assert not ContentNode.objects.filter(pk=orphan_node.pk).exists()
        # is our senior, legit node still around? :)
        assert ContentNode.objects.filter(pk=legit_node.pk).exists()


class NodeSettingTestCase(BaseAPITestCase):
    persist_bucket = True

    @classmethod
    def setUpClass(self):
        super(NodeSettingTestCase, self).setUpClass()
        # Set up ricecooker trees
        self.channel.staging_tree = ContentNode(kind_id="topic", title="test", node_id="aaa")
        self.channel.staging_tree.save()
        self.channel.previous_tree = ContentNode(kind_id="topic", title="test", node_id="bbb")
        self.channel.previous_tree.save()
        self.channel.chef_tree = ContentNode(kind_id="topic", title="test", node_id="ccc")
        self.channel.chef_tree.save()
        self.channel.save()


    def test_garbage_node_created(self):
        # Make sure loadconstants created the garbage node
        self.assertTrue(ContentNode.objects.filter(pk=settings.ORPHANAGE_ROOT_ID).exists())

    def test_file_create(self):
        request = self.create_post_request(reverse_lazy('file_create'), {'file': SimpleUploadedFile("file.pdf", b"contents")})
        file_response = file_create(request)
        self.assertEqual(file_response.status_code, 200)
        garbage_node = ContentNode.objects.get(pk=settings.ORPHANAGE_ROOT_ID)
        data = json.loads(file_response.content)
        node = json.loads(data['node'])
        node = ContentNode.objects.get(pk=node['id'])

        # Node should be in garbage tree
        self.assertTrue(garbage_node.get_descendants().filter(pk=node.pk).exists())
        self.assertEqual(garbage_node.tree_id, node.tree_id)


    def test_file_move(self):
        request = self.create_post_request(reverse_lazy('file_create'), {'file': SimpleUploadedFile("file.pdf", b"contents")})
        file_response = file_create(request)
        self.assertEqual(file_response.status_code, 200)
        data = json.loads(file_response.content)
        node = json.loads(data['node'])
        node = ContentNode.objects.get(pk=node['id'])

        # Move node and check if it's still in the garbage tree
        node.parent = self.channel.main_tree
        node.save()
        garbage_node = ContentNode.objects.get(pk=settings.ORPHANAGE_ROOT_ID)

        # Node shouldn't be in garbage tree
        self.assertFalse(garbage_node.get_descendants().filter(pk=node.pk).exists())
        self.assertNotEqual(garbage_node.tree_id, node.tree_id)


    def test_old_chef_tree(self):
        chef_tree = self.channel.chef_tree
        garbage_node = ContentNode.objects.get(pk=settings.ORPHANAGE_ROOT_ID)

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
        garbage_node = ContentNode.objects.get(pk=settings.ORPHANAGE_ROOT_ID)

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
        garbage_node = ContentNode.objects.get(pk=settings.ORPHANAGE_ROOT_ID)

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
