from __future__ import absolute_import

import uuid

from django.conf import settings
from django.core.urlresolvers import reverse
from le_utils.constants import content_kinds

from contentcuration import models
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.tests import testdata
from contentcuration.viewsets.sync.constants import CONTENTNODE
from contentcuration.viewsets.sync.utils import generate_copy_event
from contentcuration.viewsets.sync.utils import generate_create_event
from contentcuration.viewsets.sync.utils import generate_update_event
from contentcuration.viewsets.sync.utils import generate_delete_event


class SyncTestCase(StudioAPITestCase):
    @property
    def sync_url(self):
        return reverse("sync")

    @property
    def contentnode_metadata(self):
        return {
            "title": "Aron's cool contentnode",
            "id": uuid.uuid4().hex,
            "kind": content_kinds.VIDEO,
            "description": "coolest contentnode this side of the Pacific",
        }

    @property
    def contentnode_db_metadata(self):
        return {
            "title": "Aron's cool contentnode",
            "id": uuid.uuid4().hex,
            "kind_id": content_kinds.VIDEO,
            "description": "coolest contentnode this side of the Pacific",
            "parent_id": settings.ORPHANAGE_ROOT_ID,
        }

    def test_create_contentnode(self):
        user = testdata.user()
        self.client.force_authenticate(user=user)
        contentnode = self.contentnode_metadata
        response = self.client.post(
            self.sync_url,
            [generate_create_event(contentnode["id"], CONTENTNODE, contentnode)],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.ContentNode.objects.get(id=contentnode["id"])
        except models.ContentNode.DoesNotExist:
            self.fail("ContentNode was not created")

    def test_create_contentnodes(self):
        user = testdata.user()
        self.client.force_authenticate(user=user)
        contentnode1 = self.contentnode_metadata
        contentnode2 = self.contentnode_metadata
        response = self.client.post(
            self.sync_url,
            [
                generate_create_event(contentnode1["id"], CONTENTNODE, contentnode1),
                generate_create_event(contentnode2["id"], CONTENTNODE, contentnode2),
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.ContentNode.objects.get(id=contentnode1["id"])
        except models.ContentNode.DoesNotExist:
            self.fail("ContentNode 1 was not created")

        try:
            models.ContentNode.objects.get(id=contentnode2["id"])
        except models.ContentNode.DoesNotExist:
            self.fail("ContentNode 2 was not created")

    def test_update_contentnode(self):
        user = testdata.user()
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        new_title = "This is not the old title"

        self.client.force_authenticate(user=user)
        response = self.client.post(
            self.sync_url,
            [generate_update_event(contentnode.id, CONTENTNODE, {"title": new_title})],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode.id).title, new_title
        )

    def test_update_contentnodes(self):
        user = testdata.user()
        contentnode1 = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        contentnode2 = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        new_title = "This is not the old title"

        self.client.force_authenticate(user=user)
        response = self.client.post(
            self.sync_url,
            [
                generate_update_event(
                    contentnode1.id, CONTENTNODE, {"title": new_title}
                ),
                generate_update_event(
                    contentnode2.id, CONTENTNODE, {"title": new_title}
                ),
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode1.id).title, new_title
        )
        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode2.id).title, new_title
        )

    def test_delete_contentnode(self):
        user = testdata.user()
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)

        self.client.force_authenticate(user=user)
        response = self.client.post(
            self.sync_url,
            [generate_delete_event(contentnode.id, CONTENTNODE)],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.ContentNode.objects.get(id=contentnode.id)
            self.fail("ContentNode was not deleted")
        except models.ContentNode.DoesNotExist:
            pass

    def test_delete_contentnodes(self):
        user = testdata.user()
        contentnode1 = models.ContentNode.objects.create(**self.contentnode_db_metadata)

        contentnode2 = models.ContentNode.objects.create(**self.contentnode_db_metadata)

        self.client.force_authenticate(user=user)
        response = self.client.post(
            self.sync_url,
            [
                generate_delete_event(contentnode1.id, CONTENTNODE),
                generate_delete_event(contentnode2.id, CONTENTNODE),
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.ContentNode.objects.get(id=contentnode1.id)
            self.fail("ContentNode 1 was not deleted")
        except models.ContentNode.DoesNotExist:
            pass

        try:
            models.ContentNode.objects.get(id=contentnode2.id)
            self.fail("ContentNode 2 was not deleted")
        except models.ContentNode.DoesNotExist:
            pass

    def test_copy_contentnode(self):
        user = testdata.user()
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        new_node_id = uuid.uuid4().hex
        self.client.force_authenticate(user=user)
        response = self.client.post(
            self.sync_url,
            [generate_copy_event(new_node_id, CONTENTNODE, contentnode.id, {})],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

        try:
            new_node = models.ContentNode.objects.get(id=new_node_id)
        except models.ContentNode.DoesNotExist:
            self.fail("ContentNode was not copied")

        self.assertEqual(new_node.parent_id, settings.ORPHANAGE_ROOT_ID)

    def test_create_contentnode_moveable(self):
        """
        Regression test to ensure that nodes created here are able to be moved to
        other MPTT trees without invalidating data.
        """
        user = testdata.user()
        self.client.force_authenticate(user=user)
        contentnode = self.contentnode_metadata
        response = self.client.post(
            self.sync_url,
            [generate_create_event(contentnode["id"], CONTENTNODE, contentnode)],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            new_node = models.ContentNode.objects.get(id=contentnode["id"])
        except models.ContentNode.DoesNotExist:
            self.fail("ContentNode was not created")

        new_root = models.ContentNode.objects.create(
            title="Aron's cool contentnode",
            kind_id=content_kinds.VIDEO,
            description="coolest contentnode this side of the Pacific",
        )

        new_node.move_to(new_root, "last-child")

        try:
            new_node.get_root()
        except models.ContentNode.MultipleObjectsReturned:
            self.fail("Moving caused a breakdown of the tree structure")

    def test_copy_contentnode_moveable(self):
        """
        Regression test to ensure that nodes created here are able to be moved to
        other MPTT trees without invalidating data.
        """
        user = testdata.user()
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        new_node_id = uuid.uuid4().hex
        self.client.force_authenticate(user=user)
        response = self.client.post(
            self.sync_url,
            [generate_copy_event(new_node_id, CONTENTNODE, contentnode.id, {})],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

        try:
            new_node = models.ContentNode.objects.get(id=new_node_id)
        except models.ContentNode.DoesNotExist:
            self.fail("ContentNode was not copied")

        new_root = models.ContentNode.objects.create(
            title="Aron's cool contentnode",
            kind_id=content_kinds.VIDEO,
            description="coolest contentnode this side of the Pacific",
        )

        new_node.move_to(new_root, "last-child")

        try:
            new_node.get_root()
        except models.ContentNode.MultipleObjectsReturned:
            self.fail("Moving caused a breakdown of the tree structure")


class CRUDTestCase(StudioAPITestCase):
    @property
    def contentnode_metadata(self):
        return {
            "title": "Aron's cool contentnode",
            "id": uuid.uuid4().hex,
            "kind": content_kinds.VIDEO,
            "description": "coolest contentnode this side of the Pacific",
        }

    @property
    def contentnode_db_metadata(self):
        return {
            "title": "Aron's cool contentnode",
            "id": uuid.uuid4().hex,
            "kind_id": content_kinds.VIDEO,
            "description": "coolest contentnode this side of the Pacific",
            "parent_id": settings.ORPHANAGE_ROOT_ID,
        }

    def test_create_contentnode(self):
        user = testdata.user()
        self.client.force_authenticate(user=user)
        contentnode = self.contentnode_metadata
        response = self.client.post(
            reverse("contentnode-list"), contentnode, format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        try:
            models.ContentNode.objects.get(id=contentnode["id"])
        except models.ContentNode.DoesNotExist:
            self.fail("ContentNode was not created")

    def test_update_contentnode(self):
        user = testdata.user()
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        new_title = "This is not the old title"

        self.client.force_authenticate(user=user)
        response = self.client.patch(
            reverse("contentnode-detail", kwargs={"pk": contentnode.id}),
            {"title": new_title},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode.id).title, new_title
        )

    def test_delete_contentnode(self):
        user = testdata.user()
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)

        self.client.force_authenticate(user=user)
        response = self.client.delete(
            reverse("contentnode-detail", kwargs={"pk": contentnode.id})
        )
        self.assertEqual(response.status_code, 204, response.content)
        try:
            models.ContentNode.objects.get(id=contentnode.id)
            self.fail("ContentNode was not deleted")
        except models.ContentNode.DoesNotExist:
            pass
