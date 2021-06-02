from __future__ import absolute_import

import uuid

from django.core.management import call_command
from django.urls import reverse
from le_utils.constants import content_kinds

from contentcuration import models
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.viewsets.sync.constants import CLIPBOARD
from contentcuration.viewsets.sync.utils import generate_create_event
from contentcuration.viewsets.sync.utils import generate_delete_event
from contentcuration.viewsets.sync.utils import generate_update_event


class SyncTestCase(StudioAPITestCase):
    @classmethod
    def setUpClass(cls):
        cls.create_bucket()
        super(SyncTestCase, cls).setUpClass()

    @classmethod
    def tearDownClass(cls):
        super(SyncTestCase, cls).tearDownClass()
        cls.create_bucket()

    @classmethod
    def setUpTestData(cls):
        call_command("loadconstants")
        cls.user = testdata.user()
        cls.channel = testdata.channel()
        cls.channel.viewers.add(cls.user)

    @property
    def sync_url(self):
        return reverse("sync")

    @property
    def clipboard_metadata(self):
        return {
            "id": uuid.uuid4().hex,
            "kind": content_kinds.VIDEO,
            "parent": self.user.clipboard_tree_id,
            "source_node_id": self.channel.main_tree.get_descendants()
            .filter(kind_id=content_kinds.VIDEO)
            .first()
            .node_id,
            "source_channel_id": self.channel.id,
        }

    @property
    def clipboard_db_metadata(self):
        return {
            "id": uuid.uuid4().hex,
            "kind_id": content_kinds.VIDEO,
            "parent_id": self.user.clipboard_tree_id,
            "source_node_id": self.channel.main_tree.get_descendants()
            .filter(kind_id=content_kinds.VIDEO)
            .first()
            .node_id,
            "source_channel_id": self.channel.id,
        }

    def test_create_clipboard(self):
        self.client.force_authenticate(user=self.user)
        clipboard = self.clipboard_metadata
        response = self.client.post(
            self.sync_url,
            [generate_create_event(clipboard["id"], CLIPBOARD, clipboard)],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.ContentNode.objects.get(id=clipboard["id"])
        except models.ContentNode.DoesNotExist:
            self.fail("ContentNode was not created")

    def test_create_clipboard_with_null_extra_fields(self):
        self.client.force_authenticate(user=self.user)
        clipboard = self.clipboard_metadata
        clipboard["extra_fields"] = None
        response = self.client.post(
            self.sync_url,
            [generate_create_event(clipboard["id"], CLIPBOARD, clipboard)],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.ContentNode.objects.get(id=clipboard["id"])
        except models.ContentNode.DoesNotExist:
            self.fail("ContentNode was not created")

    def test_create_clipboard_with_parent(self):
        channel = testdata.channel()
        channel.editors.add(self.user)
        self.client.force_authenticate(user=self.user)
        clipboard = self.clipboard_metadata
        clipboard["parent"] = channel.main_tree_id
        response = self.client.post(
            self.sync_url,
            [generate_create_event(clipboard["id"], CLIPBOARD, clipboard)],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            new_node = models.ContentNode.objects.get(id=clipboard["id"])
        except models.ContentNode.DoesNotExist:
            self.fail("ContentNode was not created")

        self.assertEqual(new_node.parent_id, channel.main_tree_id)

    def test_create_clipboards(self):
        self.client.force_authenticate(user=self.user)
        clipboard1 = self.clipboard_metadata
        clipboard2 = self.clipboard_metadata
        response = self.client.post(
            self.sync_url,
            [
                generate_create_event(clipboard1["id"], CLIPBOARD, clipboard1),
                generate_create_event(clipboard2["id"], CLIPBOARD, clipboard2),
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.ContentNode.objects.get(id=clipboard1["id"])
        except models.ContentNode.DoesNotExist:
            self.fail("ContentNode 1 was not created")

        try:
            models.ContentNode.objects.get(id=clipboard2["id"])
        except models.ContentNode.DoesNotExist:
            self.fail("ContentNode 2 was not created")

    def test_update_clipboard_extra_fields(self):
        clipboard = models.ContentNode.objects.create(**self.clipboard_db_metadata)
        node_id1 = uuid.uuid4().hex

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.sync_url,
            [
                generate_update_event(
                    clipboard.id,
                    CLIPBOARD,
                    {"extra_fields.excluded_descendants.{}".format(node_id1): True},
                )
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(
            models.ContentNode.objects.get(id=clipboard.id).extra_fields[
                "excluded_descendants"
            ][node_id1]
        )

        node_id2 = uuid.uuid4().hex

        response = self.client.post(
            self.sync_url,
            [
                generate_update_event(
                    clipboard.id,
                    CLIPBOARD,
                    {"extra_fields.excluded_descendants.{}".format(node_id2): True},
                )
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(
            models.ContentNode.objects.get(id=clipboard.id).extra_fields[
                "excluded_descendants"
            ][node_id1]
        )
        self.assertTrue(
            models.ContentNode.objects.get(id=clipboard.id).extra_fields[
                "excluded_descendants"
            ][node_id2]
        )

    def test_delete_clipboard(self):
        clipboard = models.ContentNode.objects.create(**self.clipboard_db_metadata)

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.sync_url,
            [generate_delete_event(clipboard.id, CLIPBOARD)],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.ContentNode.objects.get(id=clipboard.id)
            self.fail("ContentNode was not deleted")
        except models.ContentNode.DoesNotExist:
            pass

    def test_delete_clipboards(self):
        clipboard1 = models.ContentNode.objects.create(**self.clipboard_db_metadata)

        clipboard2 = models.ContentNode.objects.create(**self.clipboard_db_metadata)

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.sync_url,
            [
                generate_delete_event(clipboard1.id, CLIPBOARD),
                generate_delete_event(clipboard2.id, CLIPBOARD),
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.ContentNode.objects.get(id=clipboard1.id)
            self.fail("ContentNode 1 was not deleted")
        except models.ContentNode.DoesNotExist:
            pass

        try:
            models.ContentNode.objects.get(id=clipboard2.id)
            self.fail("ContentNode 2 was not deleted")
        except models.ContentNode.DoesNotExist:
            pass


class CRUDTestCase(StudioAPITestCase):
    @classmethod
    def setUpClass(cls):
        cls.create_bucket()
        super(CRUDTestCase, cls).setUpClass()

    @classmethod
    def tearDownClass(cls):
        super(CRUDTestCase, cls).tearDownClass()
        cls.create_bucket()

    @classmethod
    def setUpTestData(cls):
        call_command("loadconstants")
        cls.user = testdata.user()
        cls.channel = testdata.channel()
        cls.channel.viewers.add(cls.user)

    @property
    def clipboard_metadata(self):
        return {
            "id": uuid.uuid4().hex,
            "kind": content_kinds.VIDEO,
            "parent": self.user.clipboard_tree_id,
            "source_node_id": self.channel.main_tree.get_descendants()
            .filter(kind_id=content_kinds.VIDEO)
            .first()
            .node_id,
            "source_channel_id": self.channel.id,
        }

    @property
    def clipboard_db_metadata(self):
        return {
            "id": uuid.uuid4().hex,
            "kind_id": content_kinds.VIDEO,
            "parent_id": self.user.clipboard_tree_id,
            "source_node_id": self.channel.main_tree.get_descendants()
            .filter(kind_id=content_kinds.VIDEO)
            .first()
            .node_id,
            "source_channel_id": self.channel.id,
        }

    def test_create_clipboard(self):
        self.client.force_authenticate(user=self.user)
        clipboard = self.clipboard_metadata
        response = self.client.post(
            reverse("clipboard-list"), clipboard, format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        try:
            models.ContentNode.objects.get(id=clipboard["id"])
        except models.ContentNode.DoesNotExist:
            self.fail("ContentNode was not created")

    def test_delete_clipboard(self):
        clipboard = models.ContentNode.objects.create(**self.clipboard_db_metadata)

        self.client.force_authenticate(user=self.user)
        response = self.client.delete(
            reverse("clipboard-detail", kwargs={"pk": clipboard.id})
        )
        self.assertEqual(response.status_code, 204, response.content)
        try:
            models.ContentNode.objects.get(id=clipboard.id)
            self.fail("ContentNode was not deleted")
        except models.ContentNode.DoesNotExist:
            pass
