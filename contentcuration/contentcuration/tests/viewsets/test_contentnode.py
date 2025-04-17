import uuid

import mock
import pytest
from django.conf import settings
from django.core.management import call_command
from django.db.utils import OperationalError
from django.test.testcases import TestCase
from django.test.testcases import TransactionTestCase
from django.urls import reverse
from django_concurrent_tests.errors import WrappedError
from django_concurrent_tests.helpers import call_concurrently
from django_concurrent_tests.helpers import make_concurrent_calls
from le_utils.constants import completion_criteria
from le_utils.constants import content_kinds
from le_utils.constants import exercises
from le_utils.constants import roles
from le_utils.constants.labels.accessibility_categories import ACCESSIBILITYCATEGORIESLIST
from le_utils.constants.labels.subjects import SUBJECTSLIST

from contentcuration import models
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.tests.viewsets.base import generate_copy_event
from contentcuration.tests.viewsets.base import generate_create_event
from contentcuration.tests.viewsets.base import generate_delete_event
from contentcuration.tests.viewsets.base import generate_publish_channel_event
from contentcuration.tests.viewsets.base import generate_update_descendants_event
from contentcuration.tests.viewsets.base import generate_update_event
from contentcuration.tests.viewsets.base import SyncTestMixin
from contentcuration.utils.db_tools import TreeBuilder
from contentcuration.viewsets.channel import _unpublished_changes_query
from contentcuration.viewsets.contentnode import ContentNodeFilter
from contentcuration.viewsets.sync.constants import CONTENTNODE
from contentcuration.viewsets.sync.constants import CONTENTNODE_PREREQUISITE
from contentcuration.viewsets.sync.constants import UPDATED

nested_subjects = [subject for subject in SUBJECTSLIST if "." in subject]


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


@pytest.mark.skipif(True, reason="Concurrent processes overload CI")
class ConcurrencyTestCase(TransactionTestCase):
    def setUp(self):
        super(ConcurrencyTestCase, self).setUp()
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


class ContentNodeFilterTestCase(TestCase):
    def setUp(self):
        super(ContentNodeFilterTestCase, self).setUp()
        testdata.preset_video()
        testdata.fileformat_mp4()
        self.root = testdata.tree()
        self.filter = ContentNodeFilter()

    def assertQuerysetPKs(self, expected_qs, actual_qs):
        expected_pks = list(expected_qs.values_list("pk", flat=True))
        actual_pks = list(actual_qs.values_list("pk", flat=True))
        self.assertEqual(len(expected_pks), len(actual_pks))

        for expected_pk, actual_pk in zip(expected_pks, actual_pks):
            self.assertEqual(expected_pk, actual_pk)

    def test_filter_ancestors_of(self):
        target = models.ContentNode.objects.get(node_id="00000000000000000000000000000003")
        queryset = self.filter.filter_ancestors_of(models.ContentNode.objects.all(), None, target.pk)

        self.assertQuerysetPKs(target.get_ancestors(include_self=True), queryset)

    def test_filter_ancestors_of__root_node(self):
        queryset = self.filter.filter_ancestors_of(models.ContentNode.objects.all(), None, self.root.pk)
        self.assertQuerysetPKs(models.ContentNode.objects.filter(pk=self.root.pk), queryset)

    def test_filter_ancestors_of__missing_target(self):
        queryset = self.filter.filter_ancestors_of(models.ContentNode.objects.all(), None, "nonexistant ID")
        self.assertQuerysetPKs(models.ContentNode.objects.none(), queryset)


class ContentNodeViewSetTestCase(StudioAPITestCase):
    def viewset_url(self, **kwargs):
        return reverse("contentnode-detail", kwargs=kwargs)

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

    def test_consolidate_extra_fields(self):
        user = testdata.user()
        channel = testdata.channel()
        channel.public = True
        channel.save()
        contentnode = models.ContentNode.objects.create(
            title="Ozer's cool contentnode",
            id=uuid.uuid4().hex,
            kind_id=content_kinds.EXERCISE,
            description="coolest contentnode this side of the Pacific",
            parent_id=channel.main_tree_id,
            extra_fields={
                "m": 3,
                "n": 6,
                "mastery_model": exercises.M_OF_N,
            }
        )

        self.client.force_authenticate(user=user)
        with self.settings(TEST_ENV=False):
            response = self.client.get(
                self.viewset_url(pk=contentnode.id), format="json",
            )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["extra_fields"]["options"]["completion_criteria"]["threshold"]["m"], 3)
        self.assertEqual(response.data["extra_fields"]["options"]["completion_criteria"]["threshold"]["n"], 6)
        self.assertEqual(response.data["extra_fields"]["options"]["completion_criteria"]["threshold"]["mastery_model"], exercises.M_OF_N)
        self.assertEqual(response.data["extra_fields"]["options"]["completion_criteria"]["model"], completion_criteria.MASTERY)

    def test_consolidate_extra_fields_with_mastrey_model_none(self):

        user = testdata.user()
        channel = testdata.channel()
        channel.public = True
        channel.save()
        contentnode = models.ContentNode.objects.create(
            title="Aron's cool contentnode",
            id=uuid.uuid4().hex,
            kind_id=content_kinds.EXERCISE,
            description="India is the hottest country in the world",
            parent_id=channel.main_tree_id,
            extra_fields={

                "m": None,
                "n": None,
                "mastery_model": None,
            }
        )

        self.client.force_authenticate(user=user)
        with self.settings(TEST_ENV=False):
            response = self.client.get(
                self.viewset_url(pk=contentnode.id), format="json",
            )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["extra_fields"], {})


class SyncTestCase(SyncTestMixin, StudioAPITestCase):

    def setUp(self):
        super(SyncTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)
        self.client.force_authenticate(user=self.user)

    @property
    def contentnode_metadata(self):
        return {
            "title": "Aron's cool contentnode",
            "id": uuid.uuid4().hex,
            "kind": content_kinds.VIDEO,
            "description": "coolest contentnode this side of the Pacific",
            "parent": self.channel.main_tree_id,
        }

    @property
    def contentnode_db_metadata(self):
        return {
            "title": "Aron's cool contentnode",
            "id": uuid.uuid4().hex,
            "kind_id": content_kinds.VIDEO,
            "description": "coolest contentnode this side of the Pacific",
            "parent_id": self.channel.main_tree_id,
        }

    def test_create_contentnode_no_permissions(self):
        self.channel.editors.remove(self.user)
        contentnode = self.contentnode_metadata
        response = self.sync_changes(
            [generate_create_event(contentnode["id"], CONTENTNODE, contentnode, channel_id=self.channel.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        with self.assertRaises(models.ContentNode.DoesNotExist):
            models.ContentNode.objects.get(id=contentnode["id"])

    def test_create_contentnode_with_parent(self):
        self.channel.editors.add(self.user)
        contentnode = self.contentnode_metadata
        response = self.sync_changes(
            [generate_create_event(contentnode["id"], CONTENTNODE, contentnode, channel_id=self.channel.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            new_node = models.ContentNode.objects.get(id=contentnode["id"])
        except models.ContentNode.DoesNotExist:
            self.fail("ContentNode was not created")

        self.assertEqual(new_node.parent_id, self.channel.main_tree_id)

    def test_cannot_create_contentnode(self):
        self.channel.editors.remove(self.user)
        self.channel.viewers.remove(self.user)

        contentnode = self.contentnode_metadata
        contentnode["parent"] = self.channel.main_tree_id

        response = self.sync_changes(
            [generate_create_event(contentnode["id"], CONTENTNODE, contentnode, channel_id=self.channel.id)],
        )
        self.assertEqual(len(response.data["disallowed"]), 1)
        try:
            models.ContentNode.objects.get(id=contentnode["id"])
            self.fail("ContentNode was created")
        except models.ContentNode.DoesNotExist:
            pass

    def test_create_contentnodes(self):
        contentnode1 = self.contentnode_metadata
        contentnode2 = self.contentnode_metadata
        response = self.sync_changes(
            [
                generate_create_event(contentnode1["id"], CONTENTNODE, contentnode1, channel_id=self.channel.id),
                generate_create_event(contentnode2["id"], CONTENTNODE, contentnode2, channel_id=self.channel.id),
            ],
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
        channel1 = testdata.channel()
        channel1.editors.add(self.user)
        channel2 = testdata.channel()

        contentnode1 = self.contentnode_metadata
        contentnode2 = self.contentnode_metadata

        contentnode1["parent"] = channel1.main_tree_id
        contentnode2["parent"] = channel2.main_tree_id

        response = self.sync_changes(
            [
                generate_create_event(
                    contentnode1["id"], CONTENTNODE, contentnode1, channel_id=channel1.id
                ),
                generate_create_event(
                    contentnode2["id"], CONTENTNODE, contentnode2, channel_id=channel2.id
                ),
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.data["allowed"]), 1)
        self.assertEqual(len(response.data["disallowed"]), 1)
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
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        new_title = "This is not the old title"

        response = self.sync_changes(
            [generate_update_event(contentnode.id, CONTENTNODE, {"title": new_title}, channel_id=self.channel.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode.id).title, new_title
        )

    def test_cannot_update_contentnode_parent(self):
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        contentnode2 = models.ContentNode.objects.create(**self.contentnode_db_metadata)

        self.sync_changes(
            [generate_update_event(contentnode.id, CONTENTNODE, {"parent": contentnode2.id})],
        )
        self.assertNotEqual(
            models.ContentNode.objects.get(id=contentnode.id).parent_id, contentnode2.id
        )

    def test_cannot_update_no_permissions(self):
        self.channel.editors.remove(self.user)
        contentnode = create_and_get_contentnode(self.channel.main_tree_id)
        new_title = "This is not the old title"

        response = self.sync_changes(
            [
                generate_update_event(
                    contentnode.id, CONTENTNODE, {"title": new_title}, channel_id=self.channel.id
                )
            ],
        )

        self.assertEqual(len(response.data["disallowed"]), 1)
        self.assertNotEqual(
            models.ContentNode.objects.get(id=contentnode.id).title, new_title
        )

    def test_update_descendants_contentnode(self):
        root_node = testdata.tree(parent=self.channel.main_tree)

        descendants = root_node.get_descendants(include_self=True)

        new_language = "es"

        response = self.sync_changes(
            [generate_update_descendants_event(root_node.id, {"language": new_language}, channel_id=self.channel.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)

        descendants = root_node.get_descendants(include_self=True)
        for descendant in descendants:
            language = models.ContentNode.objects.get(id=descendant.id).language
            language = str(language)
            self.assertEqual(language, new_language)

    def test_cannot_update_descendants_when_updating_non_topic_node(self):
        root_node = testdata.tree()
        video_node = root_node.get_descendants().filter(kind_id=content_kinds.VIDEO).first()
        new_language = "pt"

        response = self.sync_changes(
            [generate_update_descendants_event(video_node.id, {"language": new_language}, channel_id=self.channel.id)],
        )

        self.assertEqual(len(response.data["errors"]), 1)
        self.assertNotEqual(
            models.ContentNode.objects.get(id=video_node.id).language, new_language
        )

    def test_update_contentnode_exercise_mastery_model(self):
        metadata = self.contentnode_db_metadata
        metadata["kind_id"] = content_kinds.EXERCISE
        contentnode = models.ContentNode.objects.create(**metadata)

        # Update m and n fields
        m = 5
        n = 10
        response = self.sync_changes(
            [generate_update_event(contentnode.id, CONTENTNODE, {
                "extra_fields.options.completion_criteria.threshold.m": m,
                "extra_fields.options.completion_criteria.threshold.n": n,
                "extra_fields.options.completion_criteria.threshold.mastery_model": exercises.M_OF_N,
                "extra_fields.options.completion_criteria.model": completion_criteria.MASTERY
            }, channel_id=self.channel.id)],
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode.id).extra_fields["options"]["completion_criteria"]["threshold"]["m"], m
        )
        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode.id).extra_fields["options"]["completion_criteria"]["threshold"]["n"], n
        )

    def test_update_contentnode_exercise_mastery_model_partial(self):
        data = self.contentnode_db_metadata
        data["kind_id"] = content_kinds.EXERCISE
        data["extra_fields"] = {
            "options": {
                "completion_criteria": {
                    "threshold": {
                        "m": 5,
                        "n": 10,
                        "mastery_model": exercises.M_OF_N,
                    },
                    "model": completion_criteria.MASTERY,
                }
            }
        }
        contentnode = models.ContentNode.objects.create(**data)

        # Update m and n fields
        m = 4
        response = self.sync_changes(
            [generate_update_event(contentnode.id, CONTENTNODE, {
                "extra_fields.options.completion_criteria.threshold.m": m,
            }, channel_id=self.channel.id)],
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode.id).extra_fields["options"]["completion_criteria"]["threshold"]["m"], m
        )

    def test_update_contentnode_exercise_mastery_model_old(self):
        data = self.contentnode_db_metadata
        data["kind_id"] = content_kinds.EXERCISE
        data["extra_fields"] = {
            "m": 5,
            "n": 10,
            "mastery_model": exercises.M_OF_N,
        }

        contentnode = models.ContentNode.objects.create(**data)

        # Update m and n fields
        m = 4
        response = self.sync_changes(
            [generate_update_event(contentnode.id, CONTENTNODE, {
                "extra_fields.options.completion_criteria.threshold.m": m,
            }, channel_id=self.channel.id)],
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode.id).extra_fields["options"]["completion_criteria"]["threshold"]["m"], m
        )
        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode.id).extra_fields["options"]["completion_criteria"]["threshold"]["n"], 10
        )
        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode.id).extra_fields["options"]["completion_criteria"]["threshold"]["mastery_model"], exercises.M_OF_N
        )
        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode.id).extra_fields["options"]["completion_criteria"]["model"], completion_criteria.MASTERY
        )

    def test_update_contentnode_exercise_incomplete_mastery_model_marked_complete(self):
        metadata = self.contentnode_db_metadata
        metadata["kind_id"] = content_kinds.EXERCISE
        contentnode = models.ContentNode.objects.create(**metadata)

        response = self.sync_changes(
            [generate_update_event(contentnode.id, CONTENTNODE, {
                "complete": True,
            }, channel_id=self.channel.id)],
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(
            models.ContentNode.objects.get(id=contentnode.id).complete
        )
        change = models.Change.objects.filter(channel=self.channel, change_type=UPDATED, table=CONTENTNODE).last()
        self.assertFalse(change.kwargs["mods"]["complete"])

    def test_update_contentnode_extra_fields(self):
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        # Update extra_fields.randomize
        randomize = True
        response = self.sync_changes(
            [generate_update_event(contentnode.id, CONTENTNODE, {"extra_fields.randomize": randomize}, channel_id=self.channel.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode.id).extra_fields["randomize"], randomize
        )

    def test_update_contentnode_add_to_extra_fields_nested(self):
        metadata = self.contentnode_db_metadata
        contentnode = models.ContentNode.objects.create(**metadata)
        # Add extra_fields.options.modality
        response = self.sync_changes(
            [generate_update_event(contentnode.id, CONTENTNODE, {"extra_fields.options.modality": "QUIZ"}, channel_id=self.channel.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(models.ContentNode.objects.get(id=contentnode.id).extra_fields["options"]["modality"], "QUIZ")

    def test_update_contentnode_remove_from_extra_fields_nested(self):
        metadata = self.contentnode_db_metadata
        metadata["extra_fields"] = {
            "options": {
                "modality": "QUIZ",
            },
        }
        contentnode = models.ContentNode.objects.create(**metadata)
        # Remove extra_fields.options.modality
        response = self.sync_changes(
            [generate_update_event(contentnode.id, CONTENTNODE, {"extra_fields.options.modality": None}, channel_id=self.channel.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        with self.assertRaises(KeyError):
            models.ContentNode.objects.get(id=contentnode.id).extra_fields["options"]["modality"]

    def test_update_contentnode_update_options_completion_criteria(self):
        metadata = self.contentnode_db_metadata
        metadata["extra_fields"] = {
            "options": {
                "completion_criteria": {
                    "model": completion_criteria.REFERENCE,
                    "threshold": None,
                }
            },
        }
        contentnode = models.ContentNode.objects.create(**metadata)
        # Change extra_fields.options.completion_criteria.model
        # and extra_fields.options.completion_criteria.threshold
        response = self.sync_changes(
            [
                generate_update_event(
                    contentnode.id,
                    CONTENTNODE,
                    {
                        "extra_fields.options.completion_criteria.model": completion_criteria.TIME,
                        "extra_fields.options.completion_criteria.threshold": 10
                    },
                    channel_id=self.channel.id
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        c = models.ContentNode.objects.get(id=contentnode.id)

        self.assertEqual(c.extra_fields["options"]["completion_criteria"]["model"], completion_criteria.TIME)
        self.assertEqual(c.extra_fields["options"]["completion_criteria"]["threshold"], 10)

    def test_update_contentnode_update_options_completion_criteria_threshold_only(self):
        metadata = self.contentnode_db_metadata
        metadata["extra_fields"] = {
            "options": {
                "completion_criteria": {
                    "model": completion_criteria.TIME,
                    "threshold": 5,
                }
            },
        }
        contentnode = models.ContentNode.objects.create(**metadata)
        # Change extra_fields.options.completion_criteria.model
        # and extra_fields.options.completion_criteria.threshold
        response = self.sync_changes(
            [
                generate_update_event(
                    contentnode.id,
                    CONTENTNODE,
                    {
                        "extra_fields.options.completion_criteria.threshold": 10
                    },
                    channel_id=self.channel.id
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        c = models.ContentNode.objects.get(id=contentnode.id)

        self.assertEqual(c.extra_fields["options"]["completion_criteria"]["model"], completion_criteria.TIME)
        self.assertEqual(c.extra_fields["options"]["completion_criteria"]["threshold"], 10)

    def test_update_completion_criteria_model_to_determined_by_resource_edge_case(self):
        metadata = self.contentnode_db_metadata
        metadata["kind_id"] = content_kinds.HTML5
        metadata["extra_fields"] = {
            "options": {
                "completion_criteria": {
                    "model": completion_criteria.REFERENCE,
                    "threshold": None,
                    "learner_managed": False
                }
            }
        }
        contentnode = models.ContentNode.objects.create(**metadata)

        response = self.sync_changes(
                [
                    generate_update_event(
                        contentnode.id,
                        CONTENTNODE,
                        {
                            "complete": True,
                            "extra_fields.options.completion_criteria.threshold": 600,
                            "extra_fields.options.completion_criteria.model": completion_criteria.APPROX_TIME
                        },
                        channel_id=self.channel.id
                    ),
                    generate_update_event(
                        contentnode.id,
                        CONTENTNODE,
                        {
                            "extra_fields.options.completion_criteria.model": completion_criteria.DETERMINED_BY_RESOURCE
                        },
                        channel_id=self.channel.id
                    )
                ],
        )
        self.assertEqual(len(response.data["errors"]), 0)
        updated_contentnode = models.ContentNode.objects.get(id=contentnode.id)
        self.assertEqual(updated_contentnode.extra_fields["options"]["completion_criteria"]["model"], completion_criteria.DETERMINED_BY_RESOURCE)
        self.assertNotIn("threshold", updated_contentnode.extra_fields["options"]["completion_criteria"])

    def test_update_contentnode_update_options_invalid_completion_criteria(self):
        metadata = self.contentnode_db_metadata
        metadata["extra_fields"] = {
            "options": {
                "completion_criteria": {
                    "model": completion_criteria.REFERENCE,
                    "threshold": None,
                }
            },
        }
        contentnode = models.ContentNode.objects.create(**metadata)
        # Change extra_fields.options.completion_criteria.model
        # and extra_fields.options.completion_criteria.threshold
        response = self.sync_changes(
            [
                generate_update_event(
                    contentnode.id,
                    CONTENTNODE,
                    {
                        # Only do full validation of this when the update is setting to True.
                        "complete": True,
                        "extra_fields.options.completion_criteria.model": completion_criteria.TIME,
                    },
                    channel_id=self.channel.id
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        c = models.ContentNode.objects.get(id=contentnode.id)

        self.assertEqual(c.extra_fields["options"]["completion_criteria"]["model"], completion_criteria.REFERENCE)
        self.assertEqual(c.extra_fields["options"]["completion_criteria"]["threshold"], None)

    def test_update_contentnode_add_multiple_metadata_labels(self):
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        # Add metadata label to accessibility_labels
        response = self.sync_changes(
            [
                generate_update_event(
                    contentnode.id,
                    CONTENTNODE,
                    {"accessibility_labels.{}".format(ACCESSIBILITYCATEGORIESLIST[0]): True},
                    channel_id=self.channel.id
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(models.ContentNode.objects.get(id=contentnode.id).accessibility_labels[ACCESSIBILITYCATEGORIESLIST[0]])

        response = self.sync_changes(
            [
                generate_update_event(
                    contentnode.id,
                    CONTENTNODE,
                    {"accessibility_labels.{}".format(ACCESSIBILITYCATEGORIESLIST[1]): True},
                    channel_id=self.channel.id
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(models.ContentNode.objects.get(id=contentnode.id).accessibility_labels[ACCESSIBILITYCATEGORIESLIST[0]])
        self.assertTrue(models.ContentNode.objects.get(id=contentnode.id).accessibility_labels[ACCESSIBILITYCATEGORIESLIST[1]])

    def test_update_contentnode_add_multiple_nested_metadata_labels(self):

        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        # Add metadata label to categories
        response = self.sync_changes(
            [generate_update_event(contentnode.id, CONTENTNODE, {"categories.{}".format(nested_subjects[0]): True}, channel_id=self.channel.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(models.ContentNode.objects.get(id=contentnode.id).categories[nested_subjects[0]])

        response = self.sync_changes(
            [generate_update_event(contentnode.id, CONTENTNODE, {"categories.{}".format(nested_subjects[1]): True}, channel_id=self.channel.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(models.ContentNode.objects.get(id=contentnode.id).categories[nested_subjects[0]])
        self.assertTrue(models.ContentNode.objects.get(id=contentnode.id).categories[nested_subjects[1]])

    def test_update_contentnode_remove_metadata_label(self):
        metadata = self.contentnode_db_metadata
        metadata["accessibility_labels"] = {ACCESSIBILITYCATEGORIESLIST[0]: True}

        contentnode = models.ContentNode.objects.create(**metadata)
        # Add metadata label to accessibility_labels
        response = self.sync_changes(
            [
                generate_update_event(
                    contentnode.id,
                    CONTENTNODE,
                    {"accessibility_labels.{}".format(ACCESSIBILITYCATEGORIESLIST[0]): None},
                    channel_id=self.channel.id
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        with self.assertRaises(KeyError):
            models.ContentNode.objects.get(id=contentnode.id).accessibility_labels[ACCESSIBILITYCATEGORIESLIST[0]]

    def test_update_contentnode_remove_nested_metadata_label(self):
        metadata = self.contentnode_db_metadata
        metadata["categories"] = {nested_subjects[0]: True}

        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        # Add metadata label to categories
        response = self.sync_changes(
            [generate_update_event(contentnode.id, CONTENTNODE, {"categories.{}".format(nested_subjects[0]): None}, channel_id=self.channel.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        with self.assertRaises(KeyError):
            models.ContentNode.objects.get(id=contentnode.id).categories[nested_subjects[0]]

    def test_update_contentnode_tags(self):
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        tag = "howzat!"

        response = self.sync_changes(
            [
                generate_update_event(
                    contentnode.id, CONTENTNODE, {"tags.{}".format(tag): True}, channel_id=self.channel.id
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(
            models.ContentNode.objects.get(id=contentnode.id)
            .tags.filter(tag_name=tag)
            .exists()
        )

        other_tag = "LBW!"

        response = self.sync_changes(
            [
                generate_update_event(
                    contentnode.id, CONTENTNODE, {"tags.{}".format(other_tag): True}, channel_id=self.channel.id
                )
            ],
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

        response = self.sync_changes(
            [
                generate_update_event(
                    contentnode.id, CONTENTNODE, {"tags.{}".format(other_tag): None}, channel_id=self.channel.id
                )
            ],
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

    def test_update_contentnode_tag_greater_than_30_chars(self):

        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        tag = "kolibri studio, kolibri studio!"

        response = self.sync_changes(
            [
                generate_update_event(
                    contentnode.id, CONTENTNODE, {"tags.{}".format(tag): True}, channel_id=self.channel.id
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(
            models.ContentNode.objects.get(id=contentnode.id)
            .tags.filter(tag_name=tag)
            .exists()
        )

    def test_update_contentnode_suggested_duration(self):
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        new_suggested_duration = 600

        response = self.sync_changes(
            [generate_update_event(contentnode.id, CONTENTNODE, {"suggested_duration": new_suggested_duration}, channel_id=self.channel.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode.id).suggested_duration, new_suggested_duration
        )

    def test_update_contentnode_extra_fields_inherited_metadata(self):
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)

        response = self.sync_changes(
            [generate_update_event(contentnode.id, CONTENTNODE, {"extra_fields.inherited_metadata.categories": True}, channel_id=self.channel.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(
            models.ContentNode.objects.get(id=contentnode.id).extra_fields["inherited_metadata"]["categories"]
        )

    def test_update_contentnode_tags_dont_duplicate(self):
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        tag = "howzat!"

        old_tag = models.ContentTag.objects.create(tag_name=tag)

        response = self.sync_changes(
            [
                generate_update_event(
                    contentnode.id, CONTENTNODE, {"tags.{}".format(tag): True}, channel_id=self.channel.id
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(
            models.ContentNode.objects.get(id=contentnode.id)
            .tags.filter(id=old_tag.id)
            .exists()
        )

    def test_update_contentnode_tags_list(self):
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        tag = "howzat!"

        response = self.sync_changes(
            [generate_update_event(contentnode.id, CONTENTNODE, {"tags": [tag]}, channel_id=self.channel.id)],
        )
        self.assertEqual(len(response.data["errors"]), 1)

    def test_update_contentnodes(self):
        contentnode1 = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        contentnode2 = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        new_title = "This is not the old title"

        response = self.sync_changes(
            [
                generate_update_event(
                    contentnode1.id, CONTENTNODE, {"title": new_title}, channel_id=self.channel.id
                ),
                generate_update_event(
                    contentnode2.id, CONTENTNODE, {"title": new_title}, channel_id=self.channel.id
                ),
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode1.id).title, new_title
        )
        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode2.id).title, new_title
        )

    def test_cannot_update_some_contentnodes(self):

        channel1 = testdata.channel()
        channel1.editors.add(self.user)
        contentnode1 = create_and_get_contentnode(channel1.main_tree_id)

        channel2 = testdata.channel()
        contentnode2 = create_and_get_contentnode(channel2.main_tree_id)
        new_title = "This is not the old title"

        response = self.sync_changes(
            [
                generate_update_event(
                    contentnode1.id, CONTENTNODE, {"title": new_title}, channel_id=channel1.id
                ),
                generate_update_event(
                    contentnode2.id, CONTENTNODE, {"title": new_title}, channel_id=channel2.id
                ),
            ],
        )
        self.assertEqual(len(response.data["disallowed"]), 1)

        self.assertEqual(
            models.ContentNode.objects.get(id=contentnode1.id).title, new_title
        )
        self.assertNotEqual(
            models.ContentNode.objects.get(id=contentnode2.id).title, new_title
        )

    def test_update_contentnode_updates_last_modified(self):
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)

        last_modified = contentnode.modified
        new_title = "This is not the old title"

        response = self.sync_changes(
            [generate_update_event(contentnode.id, CONTENTNODE, {"title": new_title}, channel_id=self.channel.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        updated_node = models.ContentNode.objects.get(id=contentnode.id)
        self.assertNotEqual(last_modified, updated_node.modified)

    def test_delete_contentnode(self):
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)

        response = self.sync_changes(
            [generate_delete_event(contentnode.id, CONTENTNODE, channel_id=self.channel.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.ContentNode.objects.get(id=contentnode.id)
            self.fail("ContentNode was not deleted")
        except models.ContentNode.DoesNotExist:
            pass

    def test_cannot_delete_contentnode_no_permissions(self):
        self.channel.editors.remove(self.user)
        contentnode = create_and_get_contentnode(self.channel.main_tree_id)

        response = self.sync_changes(
            [generate_delete_event(contentnode.id, CONTENTNODE, channel_id=self.channel.id)],
        )
        # Return a 200 here rather than a 404.
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.ContentNode.objects.get(id=contentnode.id)
        except models.ContentNode.DoesNotExist:
            self.fail("ContentNode was deleted")

    def test_delete_contentnodes(self):
        contentnode1 = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        contentnode2 = models.ContentNode.objects.create(**self.contentnode_db_metadata)

        self.sync_changes(
            [
                generate_delete_event(contentnode1.id, CONTENTNODE, channel_id=self.channel.id),
                generate_delete_event(contentnode2.id, CONTENTNODE, channel_id=self.channel.id),
            ],
        )
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

        channel1 = testdata.channel()
        channel1.editors.add(self.user)
        contentnode1 = create_and_get_contentnode(channel1.main_tree_id)

        channel2 = testdata.channel()
        contentnode2 = create_and_get_contentnode(channel2.main_tree_id)

        response = self.sync_changes(
            [
                generate_delete_event(contentnode1.id, CONTENTNODE, channel_id=channel1.id),
                generate_delete_event(contentnode2.id, CONTENTNODE, channel_id=channel2.id),
            ],
        )
        self.assertEqual(len(response.data["disallowed"]), 1)
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
        self.channel.editors.add(self.user)
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        new_node_id = uuid.uuid4().hex
        response = self.sync_changes(
            [
                generate_copy_event(
                    new_node_id, CONTENTNODE, contentnode.id, self.channel.main_tree_id, channel_id=self.channel.id
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)

        try:
            new_node = models.ContentNode.objects.get(id=new_node_id)
        except models.ContentNode.DoesNotExist:
            self.fail("ContentNode was not copied")

        self.assertEqual(new_node.parent_id, self.channel.main_tree_id)

    def test_copy_contentnode_finalization_does_not_make_publishable(self):
        self.channel.editors.add(self.user)
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        new_node_id = uuid.uuid4().hex
        response = self.sync_changes(
            [
                generate_copy_event(
                    new_node_id, CONTENTNODE, contentnode.id, self.channel.main_tree_id, channel_id=self.channel.id
                ),
                # Save a published change for the channel, so that the finalization change will be generated
                # after the publish change, and we can check that it is properly not making the channel appear publishable.
                generate_publish_channel_event(self.channel.id),
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(_unpublished_changes_query(self.channel).count(), 0)

    def test_cannot_copy_contentnode__source_permission(self):
        source_channel = testdata.channel()
        contentnode = create_and_get_contentnode(source_channel.main_tree_id)

        new_node_id = uuid.uuid4().hex

        response = self.sync_changes(
            [
                generate_copy_event(
                    new_node_id, CONTENTNODE, contentnode.id, self.channel.main_tree_id, channel_id=self.channel.id
                )
            ],
        )
        self.assertEqual(len(response.data["errors"]), 1)

        try:
            models.ContentNode.objects.get(id=new_node_id)
            self.fail("ContentNode was copied")
        except models.ContentNode.DoesNotExist:
            pass

    def test_cannot_copy_contentnode__target_permission(self):
        self.channel.editors.remove(self.user)
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        new_node_id = uuid.uuid4().hex

        response = self.sync_changes(
            [
                generate_copy_event(
                    new_node_id, CONTENTNODE, contentnode.id, self.channel.main_tree_id, channel_id=self.channel.id
                )
            ],
        )
        self.assertEqual(len(response.data["disallowed"]), 1)

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
        contentnode = self.contentnode_metadata
        response = self.sync_changes(
            [generate_create_event(contentnode["id"], CONTENTNODE, contentnode, channel_id=self.channel.id)],
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
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        new_node_id = uuid.uuid4().hex
        response = self.sync_changes(
            [
                generate_copy_event(
                    new_node_id, CONTENTNODE, contentnode.id, self.channel.main_tree_id, channel_id=self.channel.id
                )
            ],
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
        new_title = "This is not the old title"

        response = self.sync_changes(
            [
                generate_update_event(
                    settings.ORPHANAGE_ROOT_ID, CONTENTNODE, {"title": new_title}
                )
            ],
        )
        self.assertEqual(len(response.data["disallowed"]), 1)
        self.assertNotEqual(
            models.ContentNode.objects.get(id=settings.ORPHANAGE_ROOT_ID).title,
            new_title,
        )

    def test_delete_orphanage_root(self):
        models.ContentNode.objects.create(**self.contentnode_db_metadata)

        response = self.sync_changes(
            [generate_delete_event(settings.ORPHANAGE_ROOT_ID, CONTENTNODE, channel_id=self.channel.id)],
        )
        # We return 200 even when a deletion is not found, but it should
        # still not actually delete it.
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.ContentNode.objects.get(id=settings.ORPHANAGE_ROOT_ID)
        except models.ContentNode.DoesNotExist:
            self.fail("Orphanage root was deleted")

    def test_create_prerequisites(self):
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        prereq = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        postreq = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        response = self.sync_changes(
            [
                generate_create_event(
                    [contentnode.id, prereq.id], CONTENTNODE_PREREQUISITE, {}, channel_id=self.channel.id
                ),
                generate_create_event(
                    [postreq.id, contentnode.id], CONTENTNODE_PREREQUISITE, {}, channel_id=self.channel.id
                ),
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(contentnode.prerequisite.filter(id=prereq.id).exists())
        self.assertTrue(contentnode.is_prerequisite_of.filter(id=postreq.id).exists())

    def test_create_self_referential_prerequisite(self):
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        response = self.sync_changes(
            [
                generate_create_event(
                    [contentnode.id, contentnode.id], CONTENTNODE_PREREQUISITE, {}, channel_id=self.channel.id
                ),
            ],
        )
        self.assertEqual(len(response.data["errors"]), 1)
        self.assertFalse(contentnode.prerequisite.filter(id=contentnode.id).exists())

    def test_create_cyclic_prerequisite(self):
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        prereq = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        models.PrerequisiteContentRelationship.objects.create(
            target_node=contentnode, prerequisite=prereq
        )
        response = self.sync_changes(
            [
                generate_create_event(
                    [prereq.id, contentnode.id], CONTENTNODE_PREREQUISITE, {}, channel_id=self.channel.id
                ),
            ],
        )
        self.assertEqual(len(response.data["errors"]), 1)
        self.assertFalse(prereq.prerequisite.filter(id=contentnode.id).exists())

    def test_create_cross_tree_prerequisite(self):
        other_channel = testdata.channel()
        other_channel.editors.add(self.user)
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        prereq = other_channel.main_tree.get_descendants().first()
        response = self.sync_changes(
            [
                generate_create_event(
                    [contentnode.id, prereq.id], CONTENTNODE_PREREQUISITE, {}, channel_id=self.channel.id
                ),
            ],
        )
        self.assertEqual(len(response.data["errors"]), 1, response.data)
        self.assertFalse(contentnode.prerequisite.filter(id=prereq.id).exists())

    def test_create_no_permission_prerequisite(self):
        self.channel.editors.remove(self.user)
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        prereq = self.channel.main_tree.get_descendants().first()
        response = self.sync_changes(
            [
                generate_create_event(
                    [contentnode.id, prereq.id], CONTENTNODE_PREREQUISITE, {}, channel_id=self.channel.id
                ),
            ],
        )
        self.assertEqual(len(response.data["disallowed"]), 1)
        self.assertFalse(contentnode.prerequisite.filter(id=prereq.id).exists())

    def test_delete_prerequisites(self):
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        prereq = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        postreq = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        models.PrerequisiteContentRelationship.objects.create(
            target_node=contentnode, prerequisite=prereq
        )
        models.PrerequisiteContentRelationship.objects.create(
            target_node=postreq, prerequisite=contentnode
        )
        response = self.sync_changes(
            [
                generate_delete_event(
                    [contentnode.id, prereq.id], CONTENTNODE_PREREQUISITE, channel_id=self.channel.id
                ),
                generate_delete_event(
                    [postreq.id, contentnode.id], CONTENTNODE_PREREQUISITE, channel_id=self.channel.id
                ),
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(contentnode.prerequisite.filter(id=prereq.id).exists())
        self.assertFalse(contentnode.is_prerequisite_of.filter(id=postreq.id).exists())

    def test_delete_no_permission_prerequisite(self):
        self.channel.editors.remove(self.user)
        contentnode = self.channel.main_tree.get_descendants().last()
        prereq = self.channel.main_tree.get_descendants().first()
        models.PrerequisiteContentRelationship.objects.create(
            target_node=contentnode, prerequisite=prereq
        )
        response = self.sync_changes(
            [
                generate_delete_event(
                    [contentnode.id, prereq.id], CONTENTNODE_PREREQUISITE, channel_id=self.channel.id
                ),
            ],
        )
        self.assertEqual(len(response.data["disallowed"]), 1)
        self.assertTrue(contentnode.prerequisite.filter(id=prereq.id).exists())


class CRUDTestCase(StudioAPITestCase):

    def setUp(self):
        super(CRUDTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)
        self.client.force_authenticate(user=self.user)

    @property
    def contentnode_metadata(self):
        return {
            "title": "Aron's cool contentnode",
            "id": uuid.uuid4().hex,
            "kind": content_kinds.VIDEO,
            "description": "coolest contentnode this side of the Pacific",
            "parent": self.channel.main_tree_id,
        }

    @property
    def contentnode_db_metadata(self):
        return {
            "title": "Aron's cool contentnode",
            "id": uuid.uuid4().hex,
            "kind_id": content_kinds.VIDEO,
            "description": "coolest contentnode this side of the Pacific",
            "parent_id": self.channel.main_tree_id,
        }

    def test_fetch_contentnode(self):
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        response = self.client.get(
            reverse("contentnode-detail", kwargs={"pk": contentnode.id}), format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["id"], contentnode.id)

    def test_fetch_contentnode__by_parent(self):

        channel = models.Channel.objects.create(actor_id=self.user.id, name="Test channel")
        channel.editors.add(self.user)
        channel.save()

        metadata = self.contentnode_db_metadata
        metadata.update(parent_id=channel.main_tree_id)
        contentnode = models.ContentNode.objects.create(**metadata)

        response = self.client.get(
            reverse("contentnode-list"), format="json", data={"parent": channel.main_tree_id},
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], contentnode.id)

    def test_fetch_contentnode__by_node_id_channel_id(self):
        channel = models.Channel.objects.create(actor_id=self.user.id, name="Test channel")
        channel.editors.add(self.user)
        channel.save()

        metadata = self.contentnode_db_metadata
        metadata.update(parent_id=channel.main_tree_id)
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
        contentnode = self.contentnode_metadata
        response = self.client.post(
            reverse("contentnode-list"), contentnode, format="json",
        )
        self.assertEqual(response.status_code, 405, response.content)

    def test_update_contentnode(self):
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)
        new_title = "This is not the old title"

        response = self.client.patch(
            reverse("contentnode-detail", kwargs={"pk": contentnode.id}),
            {"title": new_title},
            format="json",
        )
        self.assertEqual(response.status_code, 405, response.content)

    def test_delete_contentnode(self):
        contentnode = models.ContentNode.objects.create(**self.contentnode_db_metadata)

        response = self.client.delete(
            reverse("contentnode-detail", kwargs={"pk": contentnode.id})
        )
        self.assertEqual(response.status_code, 405, response.content)

    @mock.patch("contentcuration.utils.nodes.STALE_MAX_CALCULATION_SIZE", 5000)
    def test_resource_size(self):
        tree = TreeBuilder(user=self.user)
        self.channel.main_tree = tree.root
        self.channel.save()

        response = self.client.get(
            reverse("contentnode-size", kwargs={"pk": self.channel.main_tree.id})
        )

        files_map = {}

        for c in self.channel.main_tree.get_descendants(include_self=True):
            for f in c.files.all():
                files_map[f.checksum] = f.file_size

        total_size = sum(files_map.values())

        self.assertEqual(response.data.get('size', 0), total_size)


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
