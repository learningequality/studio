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
from le_utils.constants import roles

from contentcuration import models
from contentcuration.tests import testdata
from contentcuration.tests.base import BucketTestMixin
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.utils.db_tools import TreeBuilder
from contentcuration.viewsets.sync.constants import CONTENTNODE
from contentcuration.viewsets.sync.constants import CONTENTNODE_PREREQUISITE
from contentcuration.viewsets.sync.utils import generate_copy_event
from contentcuration.viewsets.sync.utils import generate_create_event
from contentcuration.viewsets.sync.utils import generate_delete_event
from contentcuration.viewsets.sync.utils import generate_update_event


def create_and_get_contentnode(parent_id):
    contentnode = models.ContentNode.objects.create(
        title="Aron's cool contentnode",
        id=uuid.uuid4().hex,
        kind_id=content_kinds.VIDEO,
        description="coolest contentnode this side of the Pacific",
        parent_id=parent_id,
    )
    return contentnode


def create_contentnode(parent_id):
    return create_and_get_contentnode(parent_id).id


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


class ContentNodeViewSetTestCase(StudioAPITestCase):
    def viewset_url(self, **kwargs):
        return reverse("contentnode-detail", kwargs=kwargs)

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

    def test_get_contentnode__editor(self):
        user = testdata.user()
        channel = testdata.channel()
        channel.editors.add(user)
        contentnode = create_and_get_contentnode(channel.main_tree_id)

        self.client.force_authenticate(user=user)
        with self.settings(TEST_ENV=False):
            response = self.client.get(
                self.viewset_url(pk=contentnode.id), format="json",
            )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["id"], contentnode.id)
        self.assertEqual(response.data["channel_id"], channel.id)

    def test_get_contentnode__viewer(self):
        user = testdata.user()
        channel = testdata.channel()
        channel.viewers.add(user)
        contentnode = create_and_get_contentnode(channel.main_tree_id)

        self.client.force_authenticate(user=user)
        with self.settings(TEST_ENV=False):
            response = self.client.get(
                self.viewset_url(pk=contentnode.id), format="json",
            )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["id"], contentnode.id)
        self.assertEqual(response.data["channel_id"], channel.id)

    def test_get_contentnode__no_permssion(self):
        user = testdata.user()
        channel = testdata.channel()
        contentnode = create_and_get_contentnode(channel.main_tree_id)

        self.client.force_authenticate(user=user)
        with self.settings(TEST_ENV=False):
            response = self.client.get(
                self.viewset_url(pk=contentnode.id), format="json",
            )
        self.assertEqual(response.status_code, 404, response.content)

    def test_get_contentnode__unauthenticated(self):
        channel = testdata.channel()
        contentnode = create_and_get_contentnode(channel.main_tree_id)

        with self.settings(TEST_ENV=False):
            response = self.client.get(
                self.viewset_url(pk=contentnode.id), format="json",
            )
        self.assertEqual(response.status_code, 403, response.content)

    def test_public_get_contentnode__unauthenticated(self):
        channel = testdata.channel()
        channel.public = True
        channel.save()
        contentnode = create_and_get_contentnode(channel.main_tree_id)

        with self.settings(TEST_ENV=False):
            response = self.client.get(
                self.viewset_url(pk=contentnode.id), format="json",
            )
        self.assertEqual(response.status_code, 403, response.content)


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

    def test_create_contentnode_tag(self):
        user = testdata.user()
        tag = "howzat!"

        self.client.force_authenticate(user=user)
        contentnode = self.contentnode_metadata
        contentnode["tags"] = {
            tag: True,
        }
        response = self.client.post(
            self.sync_url,
            [generate_create_event(contentnode["id"], CONTENTNODE, contentnode)],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(
            models.ContentNode.objects.get(id=contentnode["id"])
            .tags.filter(tag_name=tag)
            .exists()
        )

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

    def test_cannot_create_contentnode(self):
        channel = testdata.channel()
        user = testdata.user()
        channel.editors.remove(user)
        channel.viewers.remove(user)

        contentnode = self.contentnode_metadata
        contentnode["parent"] = channel.main_tree_id

        self.client.force_authenticate(user=user)
        with self.settings(TEST_ENV=False):
            response = self.client.post(
                self.sync_url,
                [generate_create_event(contentnode["id"], CONTENTNODE, contentnode)],
                format="json",
            )
        self.assertEqual(response.status_code, 400, response.content)
        try:
            models.ContentNode.objects.get(id=contentnode["id"])
            self.fail("ContentNode was created")
        except models.ContentNode.DoesNotExist:
            pass

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

    def test_cannot_create_some_contentnodes(self):
        user = testdata.user()
        channel1 = testdata.channel()
        channel1.editors.add(user)
        channel2 = testdata.channel()

        contentnode1 = self.contentnode_metadata
        contentnode2 = self.contentnode_metadata

        contentnode1["parent"] = channel1.main_tree_id
        contentnode2["parent"] = channel2.main_tree_id

        self.client.force_authenticate(user=user)
        with self.settings(TEST_ENV=False):
            response = self.client.post(
                self.sync_url,
                [
                    generate_create_event(
                        contentnode1["id"], CONTENTNODE, contentnode1
                    ),
                    generate_create_event(
                        contentnode2["id"], CONTENTNODE, contentnode2
                    ),
                ],
                format="json",
            )
        self.assertEqual(response.status_code, 207, response.content)
        try:
            models.ContentNode.objects.get(id=contentnode1["id"])
        except models.ContentNode.DoesNotExist:
            self.fail("ContentNode 1 was not created")

        try:
            models.ContentNode.objects.get(id=contentnode2["id"])
            self.fail("ContentNode 2 was created")
        except models.ContentNode.DoesNotExist:
            pass

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

    def test_cannot_update_contentnode(self):
        user = testdata.user()
        channel = testdata.channel()
        contentnode = create_and_get_contentnode(channel.main_tree_id)
        new_title = "This is not the old title"

        self.client.force_authenticate(user=user)
        with self.settings(TEST_ENV=False):
            response = self.client.post(
                self.sync_url,
                [
                    generate_update_event(
                        contentnode.id, CONTENTNODE, {"title": new_title}
                    )
                ],
                format="json",
            )

        self.assertEqual(response.status_code, 400, response.content)
        self.assertNotEqual(
            models.ContentNode.objects.get(id=contentnode.id).title, new_title
        )

    def test_update_contentnode_extra_fields(self):
        user = testdata.user()
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)

        # Update extra_fields.m
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

        # Update extra_fields.m
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

        # Update extra_fields.randomize
        randomize = True
        response = self.client.post(
            self.sync_url,
            [generate_update_event(contentnode.id, CONTENTNODE, {"extra_fields.randomize": randomize})],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode.id).extra_fields["m"], m
        )
        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode.id).extra_fields["n"], n
        )
        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode.id).extra_fields["randomize"], randomize
        )

    def test_update_contentnode_tags(self):
        user = testdata.user()
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        tag = "howzat!"

        self.client.force_authenticate(user=user)
        response = self.client.post(
            self.sync_url,
            [
                generate_update_event(
                    contentnode.id, CONTENTNODE, {"tags.{}".format(tag): True}
                )
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(
            models.ContentNode.objects.get(id=contentnode.id)
            .tags.filter(tag_name=tag)
            .exists()
        )

        other_tag = "LBW!"

        response = self.client.post(
            self.sync_url,
            [
                generate_update_event(
                    contentnode.id, CONTENTNODE, {"tags.{}".format(other_tag): True}
                )
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(
            models.ContentNode.objects.get(id=contentnode.id)
            .tags.filter(tag_name=tag)
            .exists()
        )
        self.assertTrue(
            models.ContentNode.objects.get(id=contentnode.id)
            .tags.filter(tag_name=other_tag)
            .exists()
        )

        response = self.client.post(
            self.sync_url,
            [
                generate_update_event(
                    contentnode.id, CONTENTNODE, {"tags.{}".format(other_tag): None}
                )
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(
            models.ContentNode.objects.get(id=contentnode.id)
            .tags.filter(tag_name=tag)
            .exists()
        )
        self.assertFalse(
            models.ContentNode.objects.get(id=contentnode.id)
            .tags.filter(tag_name=other_tag)
            .exists()
        )

    def test_update_contentnode_tags_dont_duplicate(self):
        user = testdata.user()
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        tag = "howzat!"

        old_tag = models.ContentTag.objects.create(tag_name=tag)

        self.client.force_authenticate(user=user)
        response = self.client.post(
            self.sync_url,
            [
                generate_update_event(
                    contentnode.id, CONTENTNODE, {"tags.{}".format(tag): True}
                )
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(
            models.ContentNode.objects.get(id=contentnode.id)
            .tags.filter(id=old_tag.id)
            .exists()
        )

    def test_update_contentnode_tags_list(self):
        user = testdata.user()
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        tag = "howzat!"

        self.client.force_authenticate(user=user)
        response = self.client.post(
            self.sync_url,
            [generate_update_event(contentnode.id, CONTENTNODE, {"tags": [tag]})],
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)

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

    def test_cannot_update_some_contentnodes(self):
        user = testdata.user()

        channel1 = testdata.channel()
        channel1.editors.add(user)
        contentnode1 = create_and_get_contentnode(channel1.main_tree_id)

        channel2 = testdata.channel()
        contentnode2 = create_and_get_contentnode(channel2.main_tree_id)
        new_title = "This is not the old title"

        self.client.force_authenticate(user=user)
        with self.settings(TEST_ENV=False):
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
        self.assertEqual(response.status_code, 207, response.content)
        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode1.id).title, new_title
        )
        self.assertNotEqual(
            models.ContentNode.objects.get(id=contentnode2.id).title, new_title
        )

    def test_update_contentnode_updates_last_modified(self):
        user = testdata.user()
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)

        last_modified = contentnode.modified
        new_title = "This is not the old title"

        self.client.force_authenticate(user=user)
        response = self.client.post(
            self.sync_url,
            [generate_update_event(contentnode.id, CONTENTNODE, {"title": new_title})],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        updated_node = models.ContentNode.objects.get(id=contentnode.id)
        self.assertNotEqual(last_modified, updated_node.modified)

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

    def test_cannot_delete_contentnode(self):
        user = testdata.user()
        channel = testdata.channel()
        contentnode = create_and_get_contentnode(channel.main_tree_id)

        self.client.force_authenticate(user=user)
        with self.settings(TEST_ENV=False):
            response = self.client.post(
                self.sync_url,
                [generate_delete_event(contentnode.id, CONTENTNODE)],
                format="json",
            )
        # Return a 200 here rather than a 404.
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.ContentNode.objects.get(id=contentnode.id)
        except models.ContentNode.DoesNotExist:
            self.fail("ContentNode was deleted")

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

    def test_cannot_delete_some_contentnodes(self):
        user = testdata.user()

        channel1 = testdata.channel()
        channel1.editors.add(user)
        contentnode1 = create_and_get_contentnode(channel1.main_tree_id)

        channel2 = testdata.channel()
        contentnode2 = create_and_get_contentnode(channel2.main_tree_id)

        self.client.force_authenticate(user=user)
        with self.settings(TEST_ENV=False):
            response = self.client.post(
                self.sync_url,
                [
                    generate_delete_event(contentnode1.id, CONTENTNODE),
                    generate_delete_event(contentnode2.id, CONTENTNODE),
                ],
                format="json",
            )
        # Return a 200 here rather than a 207. As operation is done!
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.ContentNode.objects.get(id=contentnode1.id)
            self.fail("ContentNode 1 was not deleted")
        except models.ContentNode.DoesNotExist:
            pass

        try:
            models.ContentNode.objects.get(id=contentnode2.id)
        except models.ContentNode.DoesNotExist:
            self.fail("ContentNode 2 was deleted")

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
                    new_node_id, CONTENTNODE, contentnode.id, channel.main_tree_id,
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

    def test_cannot_copy_contentnode__source_permission(self):
        user = testdata.user()
        channel = testdata.channel()
        channel.editors.add(user)

        source_channel = testdata.channel()
        contentnode = create_and_get_contentnode(source_channel.main_tree_id)

        new_node_id = uuid.uuid4().hex

        self.client.force_authenticate(user=user)
        with self.settings(TEST_ENV=False):
            response = self.client.post(
                self.sync_url,
                [
                    generate_copy_event(
                        new_node_id, CONTENTNODE, contentnode.id, channel.main_tree_id,
                    )
                ],
                format="json",
            )
        self.assertEqual(response.status_code, 207, response.content)

        try:
            models.ContentNode.objects.get(id=new_node_id)
            self.fail("ContentNode was copied")
        except models.ContentNode.DoesNotExist:
            pass

    def test_cannot_copy_contentnode__target_permission(self):
        channel = testdata.channel()
        user = testdata.user()
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        new_node_id = uuid.uuid4().hex

        self.client.force_authenticate(user=user)
        with self.settings(TEST_ENV=False):
            response = self.client.post(
                self.sync_url,
                [
                    generate_copy_event(
                        new_node_id, CONTENTNODE, contentnode.id, channel.main_tree_id,
                    )
                ],
                format="json",
            )
        self.assertEqual(response.status_code, 400, response.content)

        try:
            models.ContentNode.objects.get(id=new_node_id)
            self.fail("ContentNode was copied")
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
                    new_node_id, CONTENTNODE, contentnode.id, channel.main_tree_id,
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
        # We return 200 even when a deletion is not found, but it should
        # still not actually delete it.
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.ContentNode.objects.get(id=settings.ORPHANAGE_ROOT_ID)
        except models.ContentNode.DoesNotExist:
            self.fail("Orphanage root was deleted")

    def test_create_prerequisites(self):
        user = testdata.user()
        self.client.force_authenticate(user=user)
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        prereq = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        postreq = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        response = self.client.post(
            self.sync_url,
            [
                generate_create_event(
                    [contentnode.id, prereq.id], CONTENTNODE_PREREQUISITE, {}
                ),
                generate_create_event(
                    [postreq.id, contentnode.id], CONTENTNODE_PREREQUISITE, {}
                ),
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(contentnode.prerequisite.filter(id=prereq.id).exists())
        self.assertTrue(contentnode.is_prerequisite_of.filter(id=postreq.id).exists())

    def test_create_self_referential_prerequisite(self):
        user = testdata.user()
        self.client.force_authenticate(user=user)
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        response = self.client.post(
            self.sync_url,
            [
                generate_create_event(
                    [contentnode.id, contentnode.id], CONTENTNODE_PREREQUISITE, {}
                ),
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)
        self.assertFalse(contentnode.prerequisite.filter(id=contentnode.id).exists())

    def test_create_cyclic_prerequisite(self):
        user = testdata.user()
        self.client.force_authenticate(user=user)
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        prereq = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        models.PrerequisiteContentRelationship.objects.create(
            target_node=contentnode, prerequisite=prereq
        )
        response = self.client.post(
            self.sync_url,
            [
                generate_create_event(
                    [prereq.id, contentnode.id], CONTENTNODE_PREREQUISITE, {}
                ),
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)
        self.assertFalse(prereq.prerequisite.filter(id=contentnode.id).exists())

    def test_create_cross_tree_prerequisite(self):
        user = testdata.user()
        channel = testdata.channel()
        channel.editors.add(user)
        self.client.force_authenticate(user=user)
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        prereq = channel.main_tree.get_descendants().first()
        response = self.client.post(
            self.sync_url,
            [
                generate_create_event(
                    [contentnode.id, prereq.id], CONTENTNODE_PREREQUISITE, {}
                ),
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)
        self.assertFalse(contentnode.prerequisite.filter(id=prereq.id).exists())

    def test_create_no_permission_prerequisite(self):
        user = testdata.user()
        channel = testdata.channel()
        self.client.force_authenticate(user=user)
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        prereq = channel.main_tree.get_descendants().first()
        response = self.client.post(
            self.sync_url,
            [
                generate_create_event(
                    [contentnode.id, prereq.id], CONTENTNODE_PREREQUISITE, {}
                ),
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)
        self.assertFalse(contentnode.prerequisite.filter(id=prereq.id).exists())

    def test_delete_prerequisites(self):
        user = testdata.user()
        self.client.force_authenticate(user=user)
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        prereq = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        postreq = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        models.PrerequisiteContentRelationship.objects.create(
            target_node=contentnode, prerequisite=prereq
        )
        models.PrerequisiteContentRelationship.objects.create(
            target_node=postreq, prerequisite=contentnode
        )
        response = self.client.post(
            self.sync_url,
            [
                generate_delete_event(
                    [contentnode.id, prereq.id], CONTENTNODE_PREREQUISITE
                ),
                generate_delete_event(
                    [postreq.id, contentnode.id], CONTENTNODE_PREREQUISITE
                ),
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(contentnode.prerequisite.filter(id=prereq.id).exists())
        self.assertFalse(contentnode.is_prerequisite_of.filter(id=postreq.id).exists())

    def test_delete_no_permission_prerequisite(self):
        user = testdata.user()
        channel = testdata.channel()
        self.client.force_authenticate(user=user)
        contentnode = channel.main_tree.get_descendants().last()
        prereq = channel.main_tree.get_descendants().first()
        models.PrerequisiteContentRelationship.objects.create(
            target_node=contentnode, prerequisite=prereq
        )
        response = self.client.post(
            self.sync_url,
            [
                generate_delete_event(
                    [contentnode.id, prereq.id], CONTENTNODE_PREREQUISITE
                ),
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)
        self.assertTrue(contentnode.prerequisite.filter(id=prereq.id).exists())


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

    def test_fetch_contentnode(self):
        user = testdata.user()
        self.client.force_authenticate(user=user)
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        response = self.client.get(
            reverse("contentnode-detail", kwargs={"pk": contentnode.id}), format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["id"], contentnode.id)

    def test_fetch_contentnode__by_parent(self):
        user = testdata.user()
        self.client.force_authenticate(user=user)

        channel = models.Channel.objects.create(name="Test channel")
        channel.editors.add(user)
        channel.save()

        metadata = self.contentnode_db_metadata
        metadata.update(parent=channel.main_tree)
        contentnode = models.ContentNode.objects.create(**metadata)

        response = self.client.get(
            reverse("contentnode-list"), format="json", data={"parent": channel.main_tree_id},
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], contentnode.id)

    def test_fetch_contentnode__by_node_id_channel_id(self):
        user = testdata.user()
        self.client.force_authenticate(user=user)

        channel = models.Channel.objects.create(name="Test channel")
        channel.editors.add(user)
        channel.save()

        metadata = self.contentnode_db_metadata
        metadata.update(parent=channel.main_tree)
        contentnode = models.ContentNode.objects.create(**metadata)

        params = {
            "_node_id_channel_id___in": ",".join([contentnode.node_id, channel.id]),
        }

        response = self.client.get(
            reverse("contentnode-list"), format="json", data=params
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], contentnode.id)

    def test_fetch_requisites(self):
        user = testdata.user()
        self.client.force_authenticate(user=user)
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        prereq = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        postreq = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        models.PrerequisiteContentRelationship.objects.create(
            target_node=contentnode, prerequisite=prereq
        )
        models.PrerequisiteContentRelationship.objects.create(
            target_node=postreq, prerequisite=contentnode
        )
        response = self.client.get(
            reverse("contentnode-requisites", kwargs={"pk": contentnode.id}),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(
            any(
                entry
                for entry in response.data
                if entry["target_node"] == contentnode.id
            )
        )
        self.assertTrue(
            any(entry for entry in response.data if entry["prerequisite"] == prereq.id)
        )
        self.assertTrue(
            any(
                entry
                for entry in response.data
                if entry["prerequisite"] == contentnode.id
            )
        )
        self.assertTrue(
            any(entry for entry in response.data if entry["target_node"] == postreq.id)
        )

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

    def test_create_contentnode_tag(self):
        user = testdata.user()
        tag = "howzat!"

        self.client.force_authenticate(user=user)
        contentnode = self.contentnode_metadata
        contentnode["tags"] = {
            tag: True,
        }
        response = self.client.post(
            reverse("contentnode-list"), contentnode, format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertTrue(
            models.ContentNode.objects.get(id=contentnode["id"])
            .tags.filter(tag_name=tag)
            .exists()
        )

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

    def test_update_contentnode_tags(self):
        user = testdata.user()
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        tag = "howzat!"

        self.client.force_authenticate(user=user)
        response = self.client.patch(
            reverse("contentnode-detail", kwargs={"pk": contentnode.id}),
            {"tags.{}".format(tag): True},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(
            models.ContentNode.objects.get(id=contentnode.id)
            .tags.filter(tag_name=tag)
            .exists()
        )

        other_tag = "LBW!"

        response = self.client.patch(
            reverse("contentnode-detail", kwargs={"pk": contentnode.id}),
            {"tags.{}".format(other_tag): True},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(
            models.ContentNode.objects.get(id=contentnode.id)
            .tags.filter(tag_name=tag)
            .exists()
        )
        self.assertTrue(
            models.ContentNode.objects.get(id=contentnode.id)
            .tags.filter(tag_name=other_tag)
            .exists()
        )

        response = self.client.patch(
            reverse("contentnode-detail", kwargs={"pk": contentnode.id}),
            {"tags.{}".format(other_tag): None},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(
            models.ContentNode.objects.get(id=contentnode.id)
            .tags.filter(tag_name=tag)
            .exists()
        )
        self.assertFalse(
            models.ContentNode.objects.get(id=contentnode.id)
            .tags.filter(tag_name=other_tag)
            .exists()
        )

    def test_update_contentnode_tags_dont_duplicate(self):
        user = testdata.user()
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        tag = "howzat!"

        old_tag = models.ContentTag.objects.create(tag_name=tag)

        self.client.force_authenticate(user=user)
        response = self.client.patch(
            reverse("contentnode-detail", kwargs={"pk": contentnode.id}),
            {"tags.{}".format(tag): True},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(
            models.ContentNode.objects.get(id=contentnode.id)
            .tags.filter(id=old_tag.id)
            .exists()
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


class AnnotationsTest(StudioAPITestCase):
    def setUp(self):
        super(AnnotationsTest, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)
        self.client.force_authenticate(user=self.user)

    def create_coach_node(self, parent):
        coach_video = testdata.node(
            {
                "node_id": "7e1584e2ae270e9915207ced7074c784",
                "kind_id": content_kinds.VIDEO,
                "title": "Coach video",
            },
            parent=parent,
        )
        coach_video.role_visibility = roles.COACH
        coach_video.save()
        coach_video.refresh_from_db()
        return coach_video

    def set_tree_changed(self, tree, changed):
        tree.get_descendants(include_self=True).update(changed=changed)
        tree.changed = changed
        tree.save()

    def fetch_data(self, node):
        # Set it as the root node of our channel so that the user has permission
        self.channel.main_tree = node
        self.channel.save()
        response = self.client.get(
            reverse("contentnode-detail", kwargs={"pk": node.id})
        )
        return response.data

    def test_descendant_count(self):
        topic_tree_node = testdata.tree()
        self.channel.main_tree = topic_tree_node
        self.channel.save()
        response = self.client.get(
            reverse("contentnode-detail", kwargs={"pk": topic_tree_node.id})
        )
        serialized = response.data

        self.assertEqual(serialized.get("total_count"), 7)

    def test_assessment_count(self):
        node = models.ContentNode.objects.get(
            node_id="00000000000000000000000000000005"
        )
        self.channel.main_tree = node
        self.channel.save()
        response = self.client.get(
            reverse("contentnode-detail", kwargs={"pk": node.id})
        )
        serialized = response.data

        self.assertEqual(serialized.get("assessment_item_count"), 3)

    def test_resource_count(self):
        topic_tree_node = testdata.tree()
        self.channel.main_tree = topic_tree_node
        self.channel.save()
        response = self.client.get(
            reverse("contentnode-detail", kwargs={"pk": topic_tree_node.id})
        )
        serialized = response.data

        self.assertEqual(serialized.get("resource_count"), 5)

    def test_coach_count(self):
        topic_tree_node = testdata.tree()
        self.channel.main_tree = topic_tree_node
        self.channel.save()
        nested_topic = (
            topic_tree_node.get_descendants().filter(kind=content_kinds.TOPIC).first()
        )
        self.create_coach_node(nested_topic)

        response = self.client.get(
            reverse("contentnode-detail", kwargs={"pk": topic_tree_node.id})
        )
        serialized = response.data

        self.assertEqual(1, serialized.get("coach_count"))

    def test_multiple(self):
        topic_tree_node1 = testdata.tree()
        topic_tree_node2 = testdata.tree()

        topic_tree1_topics = topic_tree_node1.get_descendants().filter(
            kind=content_kinds.TOPIC
        )
        video_node = self.create_coach_node(topic_tree1_topics.first())
        exercise_node = models.ContentNode.objects.get(
            tree_id=topic_tree_node2.tree_id, node_id="00000000000000000000000000000005"
        )

        self.set_tree_changed(topic_tree_node1, False)
        self.set_tree_changed(topic_tree_node2, False)
        topic_tree1_topics.last().delete()

        topic_tree1_results = self.fetch_data(topic_tree_node1)
        topic_tree2_results = self.fetch_data(topic_tree_node2)
        video_node_results = self.fetch_data(video_node)
        exercise_node_results = self.fetch_data(exercise_node)

        self.assertIsNotNone(topic_tree1_results)
        self.assertEqual(6, topic_tree1_results.get("total_count"))
        self.assertEqual(5, topic_tree1_results.get("resource_count"))
        self.assertEqual(0, topic_tree1_results.get("assessment_item_count"))
        self.assertEqual(1, topic_tree1_results.get("coach_count"))

        self.assertIsNotNone(topic_tree2_results)
        self.assertEqual(7, topic_tree2_results.get("total_count"))
        self.assertEqual(5, topic_tree2_results.get("resource_count"))
        self.assertEqual(0, topic_tree2_results.get("assessment_item_count"))
        self.assertEqual(0, topic_tree2_results.get("coach_count"))

        self.assertIsNotNone(video_node_results)
        self.assertEqual(0, video_node_results.get("total_count"))
        self.assertEqual(0, video_node_results.get("resource_count"))
        self.assertEqual(0, video_node_results.get("assessment_item_count"))

        self.assertEqual(0, video_node_results.get("coach_count"))

        self.assertIsNotNone(exercise_node_results)
        self.assertEqual(0, exercise_node_results.get("total_count"))
        self.assertEqual(0, exercise_node_results.get("resource_count"))
        self.assertEqual(3, exercise_node_results.get("assessment_item_count"))
        self.assertEqual(0, exercise_node_results.get("coach_count"))
