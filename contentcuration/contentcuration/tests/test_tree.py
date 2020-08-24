from __future__ import absolute_import

import uuid

from django.db import transaction

from .base import BaseAPITestCase
from .testdata import channel
from contentcuration.models import ContentNode


class TreeAPITestCase(BaseAPITestCase):
    def setUp(self):
        super(TreeAPITestCase, self).setUp()
        self.tree_url = '/api/tree'
        self.channel = channel("Tree Channel")

        for i in range(3):
            new_channel = channel("Tree Channel {}".format(i))
            self.copy_first_node_to_clipboard(new_channel)

        self.copy_first_node_to_clipboard(self.channel)

    def copy_first_node_to_clipboard(self, channel):
        source = channel.main_tree.get_descendants().first()
        with transaction.atomic():
            # create a very basic copy
            new_node = ContentNode(
                content_id=source.content_id,
                kind=source.kind,
                title=source.title,
                description=source.description,
                cloned_source=source,
                source_channel_id=channel.id,
                node_id=uuid.uuid4().hex,
                source_node_id=source.node_id,
                freeze_authoring_data=True,
                changed=True,
                published=False,
            )
            new_node.parent = self.user.clipboard_tree
            new_node.save()

    def test_channel_id_param(self):
        url = '{}?channel_id={}'.format(self.tree_url, self.channel.id)
        response = self.get(url)

        for row in response.data:
            self.assertEquals(row['tree_id'], self.channel.main_tree.pk)
            self.assertEquals(row['channel_id'], self.channel.id)
        self.assertEquals(len(response.data), self.channel.main_tree.get_descendants(include_self=True).count())
        self.assertEquals(response.status_code, 200)

    def test_tree_id_param(self):
        url = '{}?tree_id={}'.format(self.tree_url, self.channel.main_tree.pk)
        response = self.get(url)

        for row in response.data:
            self.assertEquals(row['tree_id'], self.channel.main_tree.pk)
            self.assertIsNone(row['channel_id'])
        self.assertEquals(len(response.data), self.channel.main_tree.get_descendants(include_self=True).count())
        self.assertEquals(response.status_code, 200)

    def test_clipboard_tree(self):
        url = '{}?tree_id={}'.format(self.tree_url, self.user.clipboard_tree.pk)
        response = self.get(url)

        total_nodes = self.user.clipboard_tree.get_descendants(include_self=True).count()

        rows = response.data
        for row in rows:
            self.assertEquals(row['tree_id'], self.user.clipboard_tree.pk)
            if row['parent'] is not None:
                self.assertIsNotNone(row['channel_id'])

        self.assertEquals(len(response.data), total_nodes)
        self.assertEquals(response.status_code, 200)
