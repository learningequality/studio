from __future__ import absolute_import

import uuid

import pytest
from django.conf import settings
from django.core.management import call_command
from django.core.urlresolvers import reverse
from django.db.utils import OperationalError
from django.test.testcases import TransactionTestCase
from django_concurrent_tests.errors import WrappedError
from django_concurrent_tests.helpers import call_concurrently
from django_concurrent_tests.helpers import make_concurrent_calls
from le_utils.constants import content_kinds

from contentcuration import models
from contentcuration.tests import testdata
from contentcuration.tests.base import BucketTestMixin
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.utils.db_tools import TreeBuilder
from contentcuration.viewsets.sync.constants import CONTENTNODE
from contentcuration.viewsets.sync.utils import generate_copy_event
from contentcuration.viewsets.sync.utils import generate_create_event
from contentcuration.viewsets.sync.utils import generate_delete_event
from contentcuration.viewsets.sync.utils import generate_update_event


def create_contentnode(parent_id):
    contentnode = models.ContentNode.objects.create(
        title="Aron's cool contentnode",
        id=uuid.uuid4().hex,
        kind_id=content_kinds.VIDEO,
        description="coolest contentnode this side of the Pacific",
        parent_id=parent_id,
    )
    return contentnode.id


def move_contentnode(node, target):
    move_node = models.ContentNode.objects.get(id=node)
    target_node = models.ContentNode.objects.get(id=target)

    move_node.move_to(target_node, "last-child")
    return move_node.id


def rebuild_tree(tree_id):
    models.ContentNode.objects.partial_rebuild(tree_id)


@pytest.mark.skipif(True, reason="Concurrent processes overload Travis VM")
class ConcurrencyTestCase(TransactionTestCase, BucketTestMixin):
    def setUp(self):
        super(ConcurrencyTestCase, self).setUp()
        if not self.persist_bucket:
            self.create_bucket()
        call_command("loadconstants")
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)
        tree = TreeBuilder(user=self.user)
        self.channel.main_tree = tree.root
        self.channel.save()

    def tearDown(self):
        call_command("flush", interactive=False)
        super(ConcurrencyTestCase, self).tearDown()
        if not self.persist_bucket:
            self.delete_bucket()

    def test_create_contentnodes_concurrently(self):
        results = call_concurrently(
            15, create_contentnode, parent_id=self.channel.main_tree_id
        )

        results = [r for r in results if not isinstance(r, WrappedError)]

        new_nodes = models.ContentNode.objects.filter(id__in=results).order_by("lft")

        self.assertEqual(len(new_nodes), 15)

        last_rght = None

        for new_node in new_nodes:
            self.assertEqual(new_node.parent_id, self.channel.main_tree_id)
            # All the new nodes should be immediate siblings, so their
            # lft and rght values should be an incrementing sequence
            if last_rght is not None:
                self.assertEqual(last_rght + 1, new_node.lft)
            last_rght = new_node.rght

    def test_move_contentnodes_concurrently(self):

        first_node = self.channel.main_tree.get_children().first()

        child_node = first_node.get_children().first()

        child_node_target = self.channel.main_tree.get_children().last()

        results = make_concurrent_calls(
            *[
                (
                    move_contentnode,
                    {"node": first_node.id, "target": self.channel.main_tree_id},
                ),
                (
                    move_contentnode,
                    {"node": child_node.id, "target": child_node_target.id},
                ),
            ]
            * 5
        )

        results = [r for r in results if not isinstance(r, WrappedError)]

        moved_nodes = models.ContentNode.objects.filter(id__in=results).order_by("lft")

        for node in moved_nodes:
            siblings = node.get_siblings().order_by("lft")
            for sibling in siblings:
                if sibling.lft < node.lft and sibling.rght > node.rght:
                    self.fail("Sibling is an ancestor of the node")
                if sibling.lft > node.lft and sibling.rght < node.rght:
                    self.fail("Sibling is a descendant of the node")
                if sibling.lft == node.lft or sibling.rght == node.rght:
                    self.fail("Sibling has the same lft or rght value as the node")
            ancestor = node.parent
            while ancestor:
                if ancestor.lft > node.lft or ancestor.rght < node.rght:
                    self.fail("Ancestor is not an ancestor of the node")
                ancestor = ancestor.parent

    def test_move_contentnodes_across_trees_concurrently(self):
        tree = TreeBuilder(user=self.user)
        self.channel.staging_tree = tree.root
        self.channel.save()

        first_node = self.channel.staging_tree.get_children().first()

        child_node = first_node.get_children().first()

        child_node_target = self.channel.main_tree.get_children().last()

        results = make_concurrent_calls(
            *[
                (
                    move_contentnode,
                    {"node": first_node.id, "target": self.channel.main_tree_id},
                ),
                (
                    move_contentnode,
                    {"node": child_node.id, "target": child_node_target.id},
                ),
            ]
            * 5
        )

        results = [r for r in results if not isinstance(r, WrappedError)]

        moved_nodes = models.ContentNode.objects.filter(id__in=results).order_by("lft")

        for node in moved_nodes:
            siblings = node.get_siblings().order_by("lft")
            for sibling in siblings:
                if sibling.lft < node.lft and sibling.rght > node.rght:
                    self.fail("Sibling is an ancestor of the node")
                if sibling.lft > node.lft and sibling.rght < node.rght:
                    self.fail("Sibling is a descendant of the node")
                if sibling.lft == node.lft or sibling.rght == node.rght:
                    self.fail("Sibling has the same lft or rght value as the node")
            ancestor = node.parent
            while ancestor:
                if ancestor.lft > node.lft or ancestor.rght < node.rght:
                    self.fail("Ancestor is not an ancestor of the node")
                ancestor = ancestor.parent

    def test_deadlock_move_and_rebuild(self):
        root_children_ids = self.channel.main_tree.get_children().values_list(
            "id", flat=True
        )

        first_child_node_children_ids = (
            self.channel.main_tree.get_children()
            .first()
            .get_children()
            .first()
            .get_children()
            .values_list("id", flat=True)
        )

        results = make_concurrent_calls(
            (rebuild_tree, {"tree_id": self.channel.main_tree.tree_id}),
            *(
                (move_contentnode, {"node": node_id, "target": target_id})
                for (node_id, target_id) in zip(
                    root_children_ids, first_child_node_children_ids
                )
            )
        )

        for result in results:
            if isinstance(result, WrappedError):
                if (
                    isinstance(result.error, OperationalError)
                    and "deadlock detected" in result.error.args[0]
                ):
                    self.fail("Deadlock occurred during concurrent operations")

    def test_deadlock_create_and_rebuild(self):
        first_child_node_children_ids = (
            self.channel.main_tree.get_children()
            .first()
            .get_children()
            .first()
            .get_children()
            .values_list("id", flat=True)
        )

        results = make_concurrent_calls(
            (rebuild_tree, {"tree_id": self.channel.main_tree.tree_id}),
            *(
                (create_contentnode, {"parent_id": node_id})
                for node_id in first_child_node_children_ids
            )
        )

        for result in results:
            if isinstance(result, WrappedError):
                if (
                    isinstance(result.error, OperationalError)
                    and "deadlock detected" in result.error.args[0]
                ):
                    self.fail("Deadlock occurred during concurrent operations")


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

    def test_create_contentnode_with_parent(self):
        channel = testdata.channel()
        user = testdata.user()
        channel.editors.add(user)
        self.client.force_authenticate(user=user)
        contentnode = self.contentnode_metadata
        contentnode["parent"] = channel.main_tree_id
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

        self.assertEqual(new_node.parent_id, channel.main_tree_id)

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

    def test_update_contentnode_extra_fields(self):
        user = testdata.user()
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        m = 5

        self.client.force_authenticate(user=user)
        response = self.client.post(
            self.sync_url,
            [generate_update_event(contentnode.id, CONTENTNODE, {"extra_fields.m": m})],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode.id).extra_fields["m"], m
        )

        n = 10

        response = self.client.post(
            self.sync_url,
            [generate_update_event(contentnode.id, CONTENTNODE, {"extra_fields.n": n})],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode.id).extra_fields["m"], m
        )
        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode.id).extra_fields["n"], n
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
        channel = testdata.channel()
        user = testdata.user()
        channel.editors.add(user)
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        new_node_id = uuid.uuid4().hex
        self.client.force_authenticate(user=user)
        response = self.client.post(
            self.sync_url,
            [
                generate_copy_event(
                    new_node_id,
                    CONTENTNODE,
                    contentnode.id,
                    {"target": channel.main_tree_id},
                )
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

        try:
            new_node = models.ContentNode.objects.get(id=new_node_id)
        except models.ContentNode.DoesNotExist:
            self.fail("ContentNode was not copied")

        self.assertEqual(new_node.parent_id, channel.main_tree_id)

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
        channel = testdata.channel()
        user = testdata.user()
        channel.editors.add(user)
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        new_node_id = uuid.uuid4().hex
        self.client.force_authenticate(user=user)
        response = self.client.post(
            self.sync_url,
            [
                generate_copy_event(
                    new_node_id,
                    CONTENTNODE,
                    contentnode.id,
                    {"target": channel.main_tree_id},
                )
            ],
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

    def test_update_orphanage_root(self):
        user = testdata.user()
        new_title = "This is not the old title"

        self.client.force_authenticate(user=user)
        response = self.client.post(
            self.sync_url,
            [
                generate_update_event(
                    settings.ORPHANAGE_ROOT_ID, CONTENTNODE, {"title": new_title}
                )
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)
        self.assertNotEqual(
            models.ContentNode.objects.get(id=settings.ORPHANAGE_ROOT_ID).title,
            new_title,
        )

    def test_delete_orphanage_root(self):
        user = testdata.user()
        models.ContentNode.objects.create(**self.contentnode_db_metadata)

        self.client.force_authenticate(user=user)
        response = self.client.post(
            self.sync_url,
            [generate_delete_event(settings.ORPHANAGE_ROOT_ID, CONTENTNODE)],
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)
        try:
            models.ContentNode.objects.get(id=settings.ORPHANAGE_ROOT_ID)
        except models.ContentNode.DoesNotExist:
            self.fail("Orphanage root was deleted")


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

    def test_create_contentnode_moveable(self):
        """
        Regression test to ensure that nodes created here are able to be moved to
        other MPTT trees without invalidating data.
        """
        user = testdata.user()
        self.client.force_authenticate(user=user)
        contentnode = self.contentnode_metadata
        response = self.client.post(
            reverse("contentnode-list"), contentnode, format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
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

    def test_update_orphanage_root(self):
        user = testdata.user()
        new_title = "This is not the old title"

        self.client.force_authenticate(user=user)
        response = self.client.patch(
            reverse("contentnode-detail", kwargs={"pk": settings.ORPHANAGE_ROOT_ID}),
            {"title": new_title},
            format="json",
        )
        self.assertEqual(response.status_code, 404, response.content)
        self.assertNotEqual(
            models.ContentNode.objects.get(id=settings.ORPHANAGE_ROOT_ID).title,
            new_title,
        )

    def test_delete_orphanage_root(self):
        user = testdata.user()
        models.ContentNode.objects.create(**self.contentnode_db_metadata)

        self.client.force_authenticate(user=user)
        response = self.client.delete(
            reverse("contentnode-detail", kwargs={"pk": settings.ORPHANAGE_ROOT_ID})
        )
        self.assertEqual(response.status_code, 404, response.content)
        try:
            models.ContentNode.objects.get(id=settings.ORPHANAGE_ROOT_ID)
        except models.ContentNode.DoesNotExist:
            self.fail("Orphanage root was deleted")
