import random
import string
import time
import uuid

import pytest
from django.db import IntegrityError
from django.db.utils import DataError
from le_utils.constants import completion_criteria
from le_utils.constants import content_kinds
from le_utils.constants import exercises
from le_utils.constants import format_presets
from mixer.backend.django import mixer
from mock import patch

from . import testdata
from .base import StudioTestCase
from .testdata import create_studio_file
from contentcuration.models import AssessmentItem
from contentcuration.models import Channel
from contentcuration.models import ContentKind
from contentcuration.models import ContentNode
from contentcuration.models import ContentTag
from contentcuration.models import File
from contentcuration.models import FormatPreset
from contentcuration.models import generate_storage_url
from contentcuration.models import Language
from contentcuration.models import License
from contentcuration.utils.db_tools import TreeBuilder
from contentcuration.utils.files import create_thumbnail_from_base64
from contentcuration.utils.sync import sync_node


def _create_nodes(num_nodes, title, parent=None, levels=2):
    topic, _created = ContentKind.objects.get_or_create(kind="Topic")

    for i in range(num_nodes):
        new_node = ContentNode.objects.create(title=title, parent=parent, kind=topic)
        # create a couple levels for testing purposes
        if i > 0 and levels > 1 and i % (num_nodes // levels) == 0:
            parent = new_node


def _check_nodes(
    parent, title=None, original_channel_id=None, source_channel_id=None, channel=None
):
    for node in parent.get_children():
        if title:
            assert node.title == title
        assert node.parent == parent
        if original_channel_id:
            assert (
                node.original_channel_id == original_channel_id
            ), "Node {} with title {} has an incorrect original_channel_id.".format(
                node.pk, node.title
            )
        if channel:
            assert node.get_channel() == channel
        if source_channel_id:
            assert node.source_channel_id == source_channel_id
        _check_nodes(node, title, original_channel_id, source_channel_id, channel)


def _check_files_for_object(source, copy):
    source_files = source.files.all().order_by("file_on_disk")
    copy_files = copy.files.all().order_by("file_on_disk")
    assert len(source_files) == len(copy_files)
    for source_file, copy_file in zip(source_files, copy_files):
        assert source_file.file_on_disk == copy_file.file_on_disk
        assert source_file.preset_id == copy_file.preset_id


def _check_tags_for_node(source, copy):
    source_tags = source.tags.all().order_by("tag_name").distinct("tag_name")
    copy_tags = copy.tags.all().order_by("tag_name")
    assert len(source_tags) == len(copy_tags)
    for source_tag, copy_tag in zip(source_tags, copy_tags):
        assert source_tag.tag_name == copy_tag.tag_name
        assert copy_tag.channel_id is None


def _check_node_copy(source, copy, original_channel_id=None, channel=None):
    source_children = source.get_children()
    copy.refresh_from_db()
    copy_children = copy.get_children()
    assert len(source_children) == len(copy_children)
    for child_source, child_copy in zip(source_children, copy_children):
        assert child_copy.title == child_source.title
        assert child_copy.description == child_source.description
        assert child_copy.content_id == child_source.content_id
        assert child_copy.node_id != child_source.node_id
        assert child_copy.language_id == child_source.language_id
        assert child_copy.license_id == child_source.license_id
        assert child_copy.license_description == child_source.license_description
        assert child_copy.thumbnail_encoding == child_source.thumbnail_encoding
        assert child_copy.extra_fields == child_source.extra_fields
        assert child_copy.copyright_holder == child_source.copyright_holder
        assert child_copy.author == child_source.author
        assert child_copy.aggregator == child_source.aggregator
        assert child_copy.provider == child_source.provider
        assert child_copy.role_visibility == child_source.role_visibility
        assert child_copy.grade_levels == child_source.grade_levels
        assert child_copy.resource_types == child_source.resource_types
        assert child_copy.learning_activities == child_source.learning_activities
        assert child_copy.accessibility_labels == child_source.accessibility_labels
        assert child_copy.categories == child_source.categories
        assert child_copy.learner_needs == child_source.learner_needs
        assert child_copy.suggested_duration == child_source.suggested_duration
        assert child_copy.changed
        assert not child_copy.published
        assert child_copy.complete == child_source.complete
        assert child_copy.parent == copy
        assert not child_copy.prerequisite.exists()
        assert not child_copy.is_prerequisite_of.exists()
        assert child_copy.original_channel_id == (
            child_source.original_channel_id or original_channel_id
        ), "Node {} with title {} has an incorrect original_channel_id.".format(
            child_copy.pk, child_copy.title
        )
        assert (
            child_copy.original_source_node_id == source.original_source_node_id
            or source.node_id
        )
        if channel:
            assert child_copy.get_channel() == channel
        assert child_copy.source_channel_id == child_source.get_channel().id
        _check_files_for_object(child_source, child_copy)
        source_assessments = child_source.assessment_items.all().order_by("order")
        copy_assessments = child_copy.assessment_items.all().order_by("order")
        assert len(source_assessments) == len(copy_assessments)
        for source_assessment, copy_assessment in zip(
            source_assessments, copy_assessments
        ):
            _check_files_for_object(source_assessment, copy_assessment)
            assert source_assessment.question == copy_assessment.question
            assert source_assessment.answers == copy_assessment.answers
            assert source_assessment.hints == copy_assessment.hints
            assert source_assessment.assessment_id == copy_assessment.assessment_id
        _check_tags_for_node(child_source, child_copy)
        _check_node_copy(child_source, child_copy, original_channel_id, channel)


class NodeGettersTestCase(StudioTestCase):
    def setUp(self):
        super(NodeGettersTestCase, self).setUpBase()

        self.channel = testdata.channel()
        self.topic, _created = ContentKind.objects.get_or_create(kind="Topic")
        self.thumbnail_data = "allyourbase64arebelongtous"

    def test_get_node_thumbnail_base64(self):
        new_node = ContentNode.objects.create(
            title="Heyo!", parent=self.channel.main_tree, kind=self.topic
        )

        new_node.thumbnail_encoding = '{"base64": "%s"}' % self.thumbnail_data

        assert new_node.get_thumbnail() == self.thumbnail_data

    def test_get_node_thumbnail_file(self):
        new_node = ContentNode.objects.create(
            title="Heyo!", parent=self.channel.main_tree, kind=self.topic
        )
        thumbnail_file = create_thumbnail_from_base64(testdata.base64encoding())
        thumbnail_file.contentnode = new_node

        # we need to make sure the file is marked as a thumbnail
        preset, _created = FormatPreset.objects.get_or_create(id="video_thumbnail")
        preset.thumbnail = True
        thumbnail_file.preset = preset
        thumbnail_file.save()

        assert new_node.get_thumbnail() == generate_storage_url(str(thumbnail_file))

    def test_get_node_details(self):
        details = self.channel.main_tree.get_details()
        assert details["resource_count"] > 0
        assert details["resource_size"] > 0
        assert len(details["kind_count"]) > 0

        # assert format of list fields, including that they do not contain invalid data
        list_fields = [
            "kind_count",
            "languages",
            "accessible_languages",
            "licenses",
            "tags",
            "original_channels",
            "authors",
            "aggregators",
            "providers",
            "copyright_holders",
        ]
        for field in list_fields:
            self.assertIsInstance(
                details.get(field), list, f"Field '{field}' isn't a list"
            )
            self.assertEqual(
                len(details[field]),
                len([value for value in details[field] if value]),
                f"List field '{field}' has falsy values",
            )


class NodeOperationsTestCase(StudioTestCase):
    def setUp(self):
        super(NodeOperationsTestCase, self).setUpBase()

        self.channel = testdata.channel()
        tree = TreeBuilder()
        self.channel.main_tree = tree.root
        self.channel.save()

    @pytest.mark.skipif(True, reason="Benchmarking test")
    def test_duplicate_nodes_benchmark(self):
        """
        Benchmarks copy operations with different batch_sizes
        """
        for batch_size in [50, 75, 100, 150, 200, 400, 500]:
            new_channel = testdata.channel()
            start = time.time()
            with patch(
                "contentcuration.db.models.manager.log_lock_time_spent"
            ) as mock_log:
                self.channel.main_tree.copy_to(
                    new_channel.main_tree, batch_size=batch_size
                )
                timings = [log[0][0] for log in mock_log.call_args_list]
            print(
                "Batch size: {} took {} seconds to copy".format(
                    batch_size, time.time() - start
                )
            )
            total_lock_time = sum(timings)
            total_locks = len(timings)
            print(
                "Batch size: {} spent an average of {} seconds in mptt locks with {} locks for a total of {}".format(
                    batch_size,
                    total_lock_time / total_locks,
                    total_locks,
                    total_lock_time,
                )
            )

    def test_duplicate_nodes_shallow(self):
        """
        Ensures that when we copy nodes in a shallow way, a full copy happens
        """
        new_channel = testdata.channel()

        # simulate a clean, right-after-publish state to ensure only new channel is marked as change
        self.channel.main_tree.changed = False
        self.channel.main_tree.save()
        self.channel.main_tree.refresh_from_db()
        self.assertFalse(self.channel.main_tree.changed)

        new_channel.main_tree.changed = False
        new_channel.main_tree.save()
        new_channel.main_tree.refresh_from_db()
        self.assertFalse(new_channel.main_tree.changed)

        self.channel.main_tree.copy_to(new_channel.main_tree, batch_size=1)

        _check_node_copy(
            self.channel.main_tree,
            new_channel.main_tree.get_children().last(),
            original_channel_id=self.channel.id,
            channel=new_channel,
        )
        new_channel.main_tree.refresh_from_db()
        self.assertTrue(new_channel.main_tree.changed)

        self.channel.main_tree.refresh_from_db()
        self.assertFalse(self.channel.main_tree.changed)

    def test_duplicate_nodes_shallow_refreshes(self):
        """
        Ensures that when we copy nodes in a shallow way, target nodes get refreshed
        """
        new_channel = testdata.channel()

        new_channel.main_tree.copy_to(self.channel.main_tree, batch_size=1)

        new_channel.main_tree.copy_to(
            self.channel.main_tree.get_children().first(), batch_size=1
        )

        new_channel.main_tree.copy_to(self.channel.main_tree, batch_size=1)

        last_rght = None

        for new_node in self.channel.main_tree.get_children():
            # All the new nodes should be immediate siblings, so their
            # lft and rght values should be an incrementing sequence
            if last_rght is not None:
                self.assertEqual(last_rght + 1, new_node.lft)
            last_rght = new_node.rght

    def test_duplicate_nodes_position_right_shallow(self):
        """
        Ensures that when we copy nodes to the right, they are inserted at the next position
        Testing with shallow batch_size of 1
        """
        new_channel = testdata.channel()

        # simulate a clean, right-after-publish state to ensure only new channel is marked as change
        self.channel.main_tree.changed = False
        self.channel.main_tree.title = "Some other name"
        self.channel.main_tree.save()
        self.channel.main_tree.refresh_from_db()

        self.channel.main_tree.copy_to(
            new_channel.main_tree.get_children()[0], position="right", batch_size=1
        )

        self.assertEqual(
            new_channel.main_tree.get_children()[1].title, self.channel.main_tree.title
        )

    def test_duplicate_nodes_position_right_mixed(self):
        """
        Ensures that when we copy nodes to the right, they are inserted at the next position
        Testing with a mixed/medium batch size of 1000
        """
        new_channel = testdata.channel()

        # simulate a clean, right-after-publish state to ensure only new channel is marked as change
        self.channel.main_tree.changed = False
        self.channel.main_tree.title = "Some other name"
        self.channel.main_tree.save()
        self.channel.main_tree.refresh_from_db()

        self.channel.main_tree.copy_to(
            new_channel.main_tree.get_children()[0], position="right", batch_size=1000
        )

        self.assertEqual(
            new_channel.main_tree.get_children()[1].title, self.channel.main_tree.title
        )

    def test_duplicate_nodes_position_right_deep(self):
        """
        Ensures that when we copy nodes to the right, they are inserted at the next position
        Testing with deep batch_size of 10,000
        """
        new_channel = testdata.channel()

        # simulate a clean, right-after-publish state to ensure only new channel is marked as change
        self.channel.main_tree.changed = False
        self.channel.main_tree.title = "Some other name"
        self.channel.main_tree.save()
        self.channel.main_tree.refresh_from_db()

        self.channel.main_tree.copy_to(
            new_channel.main_tree.get_children()[0], position="right", batch_size=10000
        )

        self.assertEqual(
            new_channel.main_tree.get_children()[1].title, self.channel.main_tree.title
        )

    def test_duplicate_nodes_mixed(self):
        """
        Ensures that when we copy nodes in a mixed way, a full copy happens
        """
        new_channel = testdata.channel()

        # simulate a clean, right-after-publish state to ensure only new channel is marked as change
        self.channel.main_tree.changed = False
        self.channel.main_tree.save()
        self.channel.main_tree.refresh_from_db()
        self.assertFalse(self.channel.main_tree.changed)

        new_channel.main_tree.changed = False
        new_channel.main_tree.save()
        new_channel.main_tree.refresh_from_db()
        self.assertFalse(new_channel.main_tree.changed)

        self.channel.main_tree.copy_to(new_channel.main_tree, batch_size=1000)

        _check_node_copy(
            self.channel.main_tree,
            new_channel.main_tree.get_children().last(),
            original_channel_id=self.channel.id,
            channel=new_channel,
        )
        new_channel.main_tree.refresh_from_db()
        self.assertTrue(new_channel.main_tree.changed)

        self.channel.main_tree.refresh_from_db()
        self.assertFalse(self.channel.main_tree.changed)

    def test_duplicate_nodes_with_tags(self):
        """
        Ensures that when we copy nodes with tags they get copied
        """
        new_channel = testdata.channel()

        tree = TreeBuilder(tags=True)
        self.channel.main_tree = tree.root
        self.channel.save()

        # Add a legacy tag with a set channel to test the tag copying behaviour.
        legacy_tag = ContentTag.objects.create(tag_name="test", channel=self.channel)
        # Add an identical tag without a set channel to make sure it gets reused.
        ContentTag.objects.create(tag_name="test")

        num_test_tags_before = ContentTag.objects.filter(tag_name="test").count()

        self.channel.main_tree.get_children().first().tags.add(legacy_tag)

        self.channel.main_tree.copy_to(new_channel.main_tree, batch_size=1000)

        _check_node_copy(
            self.channel.main_tree,
            new_channel.main_tree.get_children().last(),
            original_channel_id=self.channel.id,
            channel=new_channel,
        )

        self.assertEqual(
            num_test_tags_before, ContentTag.objects.filter(tag_name="test").count()
        )

    def test_duplicate_nodes_with_duplicate_tags(self):
        """
        Ensures that when we copy nodes with duplicated tags they get copied
        """
        new_channel = testdata.channel()

        tree = TreeBuilder(tags=True)
        self.channel.main_tree = tree.root
        self.channel.save()

        # Add a legacy tag with a set channel to test the tag copying behaviour.
        legacy_tag = ContentTag.objects.create(tag_name="test", channel=self.channel)
        # Add an identical tag without a set channel to make sure it gets reused.
        identical_tag = ContentTag.objects.create(tag_name="test")

        num_test_tags_before = ContentTag.objects.filter(tag_name="test").count()

        # Add both the legacy and the new style tag and ensure that it doesn't break.
        self.channel.main_tree.get_children().first().tags.add(legacy_tag)
        self.channel.main_tree.get_children().first().tags.add(identical_tag)

        self.channel.main_tree.copy_to(new_channel.main_tree, batch_size=1000)

        _check_node_copy(
            self.channel.main_tree,
            new_channel.main_tree.get_children().last(),
            original_channel_id=self.channel.id,
            channel=new_channel,
        )

        self.assertEqual(
            num_test_tags_before, ContentTag.objects.filter(tag_name="test").count()
        )

    def test_duplicate_nodes_deep(self):
        """
        Ensures that when we copy nodes in a deep way, a full copy happens
        """
        new_channel = testdata.channel()

        # simulate a clean, right-after-publish state to ensure only new channel is marked as change
        self.channel.main_tree.changed = False
        self.channel.main_tree.save()
        self.channel.main_tree.refresh_from_db()
        self.assertFalse(self.channel.main_tree.changed)

        new_channel.main_tree.changed = False
        new_channel.main_tree.save()
        new_channel.main_tree.refresh_from_db()
        self.assertFalse(new_channel.main_tree.changed)

        self.channel.main_tree.copy_to(new_channel.main_tree, batch_size=10000)

        _check_node_copy(
            self.channel.main_tree,
            new_channel.main_tree.get_children().last(),
            original_channel_id=self.channel.id,
            channel=new_channel,
        )
        new_channel.main_tree.refresh_from_db()
        self.assertTrue(new_channel.main_tree.changed)

        self.channel.main_tree.refresh_from_db()
        self.assertFalse(self.channel.main_tree.changed)

    def test_duplicate_nodes_deep_refreshes(self):
        """
        Ensures that when we copy nodes in a shallow way, target nodes get refreshed
        """
        new_channel = testdata.channel()

        new_channel.main_tree.copy_to(self.channel.main_tree, batch_size=10000)

        new_channel.main_tree.copy_to(
            self.channel.main_tree.get_children().first(), batch_size=10000
        )

        new_channel.main_tree.copy_to(self.channel.main_tree, batch_size=10000)

        last_rght = None

        for new_node in self.channel.main_tree.get_children():
            # All the new nodes should be immediate siblings, so their
            # lft and rght values should be an incrementing sequence
            if last_rght is not None:
                self.assertEqual(last_rght + 1, new_node.lft)
            last_rght = new_node.rght

    def test_duplicate_nodes_with_changes(self):
        """
        Ensures that when we copy nodes, we can apply additional changes to the nodes
        during the copy - primarily used for setting a new title at copy
        """
        new_channel = testdata.channel()

        # simulate a clean, right-after-publish state to ensure only new channel is marked as change
        self.channel.main_tree.changed = False
        self.channel.main_tree.save()
        self.channel.main_tree.refresh_from_db()

        new_title = "this should be different"

        copy = self.channel.main_tree.copy_to(
            new_channel.main_tree, mods={"title": new_title}
        )

        self.assertEqual(copy.title, new_title)

    def test_duplicate_nodes_with_excluded_descendants(self):
        """
        Ensures that when we copy nodes, we can exclude nodes from the descendant
        hierarchy
        """
        new_channel = testdata.channel()

        # simulate a clean, right-after-publish state to ensure only new channel is marked as change
        self.channel.main_tree.changed = False
        self.channel.main_tree.save()

        excluded_node_id = self.channel.main_tree.get_children().first().node_id

        self.channel.main_tree.copy_to(
            new_channel.main_tree, excluded_descendants={excluded_node_id: True}
        )

        self.assertEqual(
            new_channel.main_tree.get_children().last().get_children().count(),
            self.channel.main_tree.get_children().count() - 1,
        )

    def test_duplicate_nodes_freeze_authoring_data_no_edit(self):
        """
        Ensures that when we copy nodes, we can exclude nodes from the descendant
        hierarchy
        """
        new_channel = testdata.channel()

        # simulate a clean, right-after-publish state to ensure only new channel is marked as change
        self.channel.main_tree.changed = False
        self.channel.main_tree.freeze_authoring_data = False
        self.channel.main_tree.save()

        self.channel.main_tree.copy_to(
            new_channel.main_tree, can_edit_source_channel=False
        )

        self.assertTrue(
            new_channel.main_tree.get_children().last().freeze_authoring_data
        )

    def test_duplicate_nodes_no_freeze_authoring_data_edit(self):
        """
        Ensures that when we copy nodes, we can modify fields if they are not frozen for editing
        """
        new_channel = testdata.channel()

        # simulate a clean, right-after-publish state to ensure only new channel is marked as change
        self.channel.main_tree.changed = False
        self.channel.main_tree.freeze_authoring_data = False
        self.channel.main_tree.save()

        self.channel.main_tree.copy_to(
            new_channel.main_tree, can_edit_source_channel=True
        )

        self.assertFalse(
            new_channel.main_tree.get_children().last().freeze_authoring_data
        )

    def test_duplicate_nodes_freeze_authoring_data_edit(self):
        """
        Ensures that when we copy nodes, we can't modify fields if they are frozen for editing
        """
        new_channel = testdata.channel()

        # simulate a clean, right-after-publish state to ensure only new channel is marked as change
        self.channel.main_tree.changed = False
        self.channel.main_tree.freeze_authoring_data = True
        self.channel.main_tree.save()

        self.channel.main_tree.copy_to(
            new_channel.main_tree, can_edit_source_channel=True
        )

        self.assertTrue(
            new_channel.main_tree.get_children().last().freeze_authoring_data
        )

    def test_duplicate_nodes_with_assessment_item_file(self):
        """
        Ensures that when we copy nodes with tags they get copied
        """
        new_channel = testdata.channel()

        tree = TreeBuilder(tags=True)
        self.channel.main_tree = tree.root
        self.channel.save()

        exercise = (
            self.channel.main_tree.get_descendants()
            .filter(kind_id=content_kinds.EXERCISE)
            .first()
        )

        ai = exercise.assessment_items.first()

        file = testdata.fileobj_exercise_image()

        file.assessment_item = ai
        file.save()

        self.channel.main_tree.copy_to(new_channel.main_tree, batch_size=1000)

        _check_node_copy(
            self.channel.main_tree,
            new_channel.main_tree.get_children().last(),
            original_channel_id=self.channel.id,
            channel=new_channel,
        )

    def test_multiple_copy_channel_ids(self):
        """
        This test ensures that as we copy nodes across various channels, that their original_channel_id and
        source_channel_id values are properly updated.
        """

        channels = [
            self.channel,
            testdata.channel(),
            testdata.channel(),
            testdata.channel(),
            testdata.channel(),
        ]

        copy_node_root = self.channel.main_tree.get_children().first()
        for i in range(1, len(channels)):
            print("Copying channel {} nodes to channel {}".format(i - 1, i))
            channel = channels[i]
            prev_channel = channels[i - 1]

            prev_channel.main_tree.changed = False
            prev_channel.main_tree.save()
            prev_channel.main_tree.refresh_from_db()
            self.assertFalse(prev_channel.main_tree.changed)

            # simulate a clean, right-after-publish state to ensure only new channel
            # is marked as change
            channel.main_tree.changed = False
            channel.main_tree.save()
            channel.main_tree.refresh_from_db()
            self.assertFalse(channel.main_tree.changed)

            # make sure we always copy the copy we made in the previous go around :)
            copy_node_root.copy_to(channel.main_tree)

            old_copy_node_root = copy_node_root

            copy_node_root = channel.main_tree.get_children().last()

            _check_node_copy(
                old_copy_node_root,
                copy_node_root,
                original_channel_id=self.channel.id,
                channel=channel,
            )
            channel.main_tree.refresh_from_db()
            self.assertTrue(channel.main_tree.changed)
            self.assertTrue(
                channel.main_tree.get_descendants().filter(changed=True).exists()
            )

            prev_channel.main_tree.refresh_from_db()
            self.assertFalse(prev_channel.main_tree.changed)

    def test_move_nodes(self):
        """
        Ensures that moving nodes properly removes them from the original parent
        and adds them to the new one, and marks the new and old parents as changed,
        and that the node channel info gets updated as well.
        """
        title = "A Node on the Move"
        topic, _created = ContentKind.objects.get_or_create(kind="Topic")
        self.channel.main_tree = ContentNode.objects.create(title="Heyo!", kind=topic)
        self.channel.save()
        _create_nodes(10, title, parent=self.channel.main_tree)

        self.assertEqual(self.channel.main_tree.get_descendant_count(), 10)
        self.assertTrue(self.channel.main_tree.changed)
        self.assertIsNone(self.channel.main_tree.parent)

        _check_nodes(
            self.channel.main_tree,
            title,
            original_channel_id=None,
            source_channel_id=None,
            channel=self.channel,
        )

        new_channel = testdata.channel()
        new_channel.editors.add(self.user)
        new_channel.main_tree.get_children().delete()
        new_channel_node_count = new_channel.main_tree.get_descendants().count()

        # simulate a clean, right-after-publish state for both trees to ensure they are marked
        # changed after this
        self.channel.main_tree.changed = False
        self.channel.main_tree.save()
        new_channel.main_tree.changed = False
        new_channel.main_tree.save()

        for node in self.channel.main_tree.get_children():
            node.move_to(new_channel.main_tree)

        self.channel.main_tree.refresh_from_db()
        new_channel.main_tree.refresh_from_db()

        # these can get out of sync if we don't do a rebuild
        self.assertEqual(
            self.channel.main_tree.get_descendants().count(),
            self.channel.main_tree.get_descendant_count(),
        )

        self.assertNotEqual(self.channel.main_tree, new_channel.main_tree)
        self.assertTrue(self.channel.main_tree.changed)
        self.assertTrue(new_channel.main_tree.changed)

        assert self.channel.main_tree.get_descendant_count() == 0
        if new_channel.main_tree.get_descendants().count() > 10:

            def recursive_print(node, indent=0):
                for child in node.get_children():
                    print("{}Node: {}".format(" " * indent, child.title))
                    recursive_print(child, indent + 4)

            recursive_print(new_channel.main_tree)

        self.assertEqual(
            new_channel.main_tree.get_descendants().count(), new_channel_node_count + 10
        )

        self.assertFalse(
            self.channel.main_tree.get_descendants().filter(changed=True).exists()
        )
        self.assertTrue(
            new_channel.main_tree.get_descendants().filter(changed=True).exists()
        )

        # The newly created node still has None for its original channel and source channel,
        # as it has been moved, not duplicated.
        _check_nodes(
            new_channel.main_tree,
            title=title,
            original_channel_id=None,
            source_channel_id=None,
            channel=new_channel,
        )


class SyncNodesOperationTestCase(StudioTestCase):
    """
    Checks that sync nodes updates properies.
    """

    def setUp(self):
        super(SyncNodesOperationTestCase, self).setUpBase()

    def test_sync_after_no_changes(self):
        orig_video, cloned_video = self._setup_original_and_deriative_nodes()
        sync_node(
            cloned_video,
            sync_titles_and_descriptions=True,
            sync_resource_details=True,
            sync_files=True,
            sync_assessment_items=True,
        )
        self._assert_same_files(orig_video, cloned_video)

    def test_sync_with_subs(self):
        orig_video, cloned_video = self._setup_original_and_deriative_nodes()
        self._add_subs_to_video_node(orig_video, "fr")
        self._add_subs_to_video_node(orig_video, "es")
        self._add_subs_to_video_node(orig_video, "en")
        sync_node(
            cloned_video,
            sync_titles_and_descriptions=True,
            sync_resource_details=True,
            sync_files=True,
            sync_assessment_items=True,
        )
        self._assert_same_files(orig_video, cloned_video)

    def test_resync_after_more_subs_added(self):
        orig_video, cloned_video = self._setup_original_and_deriative_nodes()
        self._add_subs_to_video_node(orig_video, "fr")
        self._add_subs_to_video_node(orig_video, "es")
        self._add_subs_to_video_node(orig_video, "en")
        sync_node(
            cloned_video,
            sync_titles_and_descriptions=True,
            sync_resource_details=True,
            sync_files=True,
            sync_assessment_items=True,
        )
        self._add_subs_to_video_node(orig_video, "ar")
        self._add_subs_to_video_node(orig_video, "zul")
        sync_node(
            cloned_video,
            sync_titles_and_descriptions=True,
            sync_resource_details=True,
            sync_files=True,
            sync_assessment_items=True,
        )
        self._assert_same_files(orig_video, cloned_video)

    def _create_video_node(self, title, parent, withsubs=False):
        data = dict(
            kind_id="video",
            title=title,
            node_id="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        )
        video_node = testdata.node(data, parent=parent)

        if withsubs:
            self._add_subs_to_video_node(video_node, "fr")
            self._add_subs_to_video_node(video_node, "es")
            self._add_subs_to_video_node(video_node, "en")

        return video_node

    def _add_subs_to_video_node(self, video_node, lang):
        lang_obj = Language.objects.get(id=lang)
        sub_file = create_studio_file(
            "subsin" + lang, preset="video_subtitle", ext="vtt"
        )["db_file"]
        sub_file.language = lang_obj
        sub_file.contentnode = video_node
        sub_file.save()

    def _create_empty_tree(self):
        topic_kind = ContentKind.objects.get(kind="topic")
        root_node = ContentNode.objects.create(
            title="Le derivative root", kind=topic_kind
        )
        return root_node

    def _create_minimal_tree(self, withsubs=False):
        topic_kind = ContentKind.objects.get(kind="topic")
        root_node = ContentNode.objects.create(title="Le root", kind=topic_kind)
        self._create_video_node(
            title="Sample video", parent=root_node, withsubs=withsubs
        )
        return root_node

    def _setup_original_and_deriative_nodes(self):
        # Setup original channel
        self.channel = (
            testdata.channel()
        )  # done in base class but doesn't hurt to do again...
        self.channel.main_tree = self._create_minimal_tree(withsubs=False)
        self.channel.save()

        # Setup derivative channel
        self.new_channel = Channel.objects.create(
            name="derivative of teschannel",
            source_id="lkajs",
            actor_id=self.admin_user.id,
        )
        self.new_channel.save()
        self.new_channel.main_tree = self._create_empty_tree()
        self.new_channel.main_tree.save()
        new_tree = self.channel.main_tree.copy()
        self.new_channel.main_tree = new_tree
        self.new_channel.main_tree.refresh_from_db()

        # Return video nodes we need for this test
        orig_video = self.channel.main_tree.children.all()[0]
        cloned_video = self.new_channel.main_tree.children.all()[0]
        return orig_video, cloned_video

    def _assert_same_files(self, nodeA, nodeB):
        filesA = nodeA.files.all().order_by("checksum")
        filesB = nodeB.files.all().order_by("checksum")
        assert len(filesA) == len(filesB), "different number of files found"
        for fileA, fileB in zip(filesA, filesB):
            assert fileA.checksum == fileB.checksum, "different checksum found"
            assert fileA.preset == fileB.preset, "different preset found"
            assert fileA.language == fileB.language, "different language found"


class NodeCreationTestCase(StudioTestCase):
    def setUp(self):
        return super(NodeCreationTestCase, self).setUpBase()

    def test_content_tag_creation(self):
        """
        Verfies tag creation works
        """
        mixer.blend(
            ContentTag,
            tag_name="".join(random.sample(string.printable, random.randint(31, 50))),
        )
        with self.assertRaises(DataError):
            mixer.blend(
                ContentTag,
                tag_name=random.sample(string.printable, random.randint(51, 80)),
            )

    def test_create_node_null_complete(self):
        new_obj = ContentNode(kind_id=content_kinds.TOPIC)
        try:
            new_obj.save()
        except IntegrityError:
            self.fail("Caused an IntegrityError")


class NodeCompletionTestCase(StudioTestCase):

    old_extra_fields = {
        "mastery_model": exercises.M_OF_N,
        "randomize": False,
        "m": 3,
        "n": 5,
    }

    new_extra_fields = {
        "randomize": False,
        "options": {
            "completion_criteria": {
                "threshold": {
                    "mastery_model": exercises.M_OF_N,
                    "m": 4,
                    "n": 5,
                },
                "model": completion_criteria.MASTERY,
            }
        },
    }

    def setUp(self):
        return super(NodeCompletionTestCase, self).setUpBase()

    def test_create_topic_set_complete_no_parent(self):
        new_obj = ContentNode(kind_id=content_kinds.TOPIC)
        new_obj.save()
        new_obj.mark_complete()
        self.assertTrue(new_obj.complete)

    def test_create_topic_set_complete_parent_no_title(self):
        channel = testdata.channel()
        new_obj = ContentNode(kind_id=content_kinds.TOPIC, parent=channel.main_tree)
        new_obj.save()
        new_obj.mark_complete()
        self.assertFalse(new_obj.complete)

    def test_create_topic_set_complete_parent_title(self):
        channel = testdata.channel()
        new_obj = ContentNode(
            title="yes", kind_id=content_kinds.TOPIC, parent=channel.main_tree
        )
        new_obj.save()
        new_obj.mark_complete()
        self.assertTrue(new_obj.complete)

    def test_create_video_set_complete_no_license(self):
        channel = testdata.channel()
        new_obj = ContentNode(
            title="yes", kind_id=content_kinds.VIDEO, parent=channel.main_tree
        )
        new_obj.save()
        File.objects.create(
            contentnode=new_obj,
            preset_id=format_presets.VIDEO_HIGH_RES,
            checksum=uuid.uuid4().hex,
        )
        new_obj.mark_complete()
        self.assertFalse(new_obj.complete)

    def test_create_video_set_complete_custom_license_no_description(self):
        custom_licenses = list(
            License.objects.filter(is_custom=True).values_list("pk", flat=True)
        )
        channel = testdata.channel()
        new_obj = ContentNode(
            title="yes",
            kind_id=content_kinds.VIDEO,
            parent=channel.main_tree,
            license_id=custom_licenses[0],
            copyright_holder="Some person",
        )
        new_obj.save()
        File.objects.create(
            contentnode=new_obj,
            preset_id=format_presets.VIDEO_HIGH_RES,
            checksum=uuid.uuid4().hex,
        )
        new_obj.mark_complete()
        self.assertFalse(new_obj.complete)

    def test_create_video_set_complete_custom_license_with_description(self):
        custom_licenses = list(
            License.objects.filter(is_custom=True).values_list("pk", flat=True)
        )
        channel = testdata.channel()
        new_obj = ContentNode(
            title="yes",
            kind_id=content_kinds.VIDEO,
            parent=channel.main_tree,
            license_id=custom_licenses[0],
            license_description="don't do this!",
            copyright_holder="Some person",
        )
        new_obj.save()
        File.objects.create(
            contentnode=new_obj,
            preset_id=format_presets.VIDEO_HIGH_RES,
            checksum=uuid.uuid4().hex,
        )
        new_obj.mark_complete()
        self.assertTrue(new_obj.complete)

    def test_create_video_set_complete_copyright_holder_required_no_copyright_holder(
        self,
    ):
        required_holder = list(
            License.objects.filter(
                copyright_holder_required=True, is_custom=False
            ).values_list("pk", flat=True)
        )
        channel = testdata.channel()
        new_obj = ContentNode(
            title="yes",
            kind_id=content_kinds.VIDEO,
            parent=channel.main_tree,
            license_id=required_holder[0],
        )
        new_obj.save()
        File.objects.create(
            contentnode=new_obj,
            preset_id=format_presets.VIDEO_HIGH_RES,
            checksum=uuid.uuid4().hex,
        )
        new_obj.mark_complete()
        self.assertFalse(new_obj.complete)

    def test_create_video_set_complete_copyright_holder_required_copyright_holder(self):
        required_holder = list(
            License.objects.filter(
                copyright_holder_required=True, is_custom=False
            ).values_list("pk", flat=True)
        )
        channel = testdata.channel()
        new_obj = ContentNode(
            title="yes",
            kind_id=content_kinds.VIDEO,
            parent=channel.main_tree,
            license_id=required_holder[0],
            copyright_holder="Some person",
        )
        new_obj.save()
        File.objects.create(
            contentnode=new_obj,
            preset_id=format_presets.VIDEO_HIGH_RES,
            checksum=uuid.uuid4().hex,
        )
        new_obj.mark_complete()
        self.assertTrue(new_obj.complete)

    def test_create_video_no_files(self):
        licenses = list(
            License.objects.filter(
                copyright_holder_required=False, is_custom=False
            ).values_list("pk", flat=True)
        )
        channel = testdata.channel()
        new_obj = ContentNode(
            title="yes",
            kind_id=content_kinds.VIDEO,
            parent=channel.main_tree,
            license_id=licenses[0],
        )
        new_obj.save()
        new_obj.mark_complete()
        self.assertFalse(new_obj.complete)

    def test_create_video_thumbnail_only(self):
        licenses = list(
            License.objects.filter(
                copyright_holder_required=False, is_custom=False
            ).values_list("pk", flat=True)
        )
        channel = testdata.channel()
        new_obj = ContentNode(
            title="yes",
            kind_id=content_kinds.VIDEO,
            parent=channel.main_tree,
            license_id=licenses[0],
        )
        new_obj.save()
        File.objects.create(
            contentnode=new_obj,
            preset_id=format_presets.VIDEO_THUMBNAIL,
            checksum=uuid.uuid4().hex,
        )
        new_obj.mark_complete()
        self.assertFalse(new_obj.complete)

    def test_create_video_invalid_completion_criterion(self):
        licenses = list(
            License.objects.filter(
                copyright_holder_required=False, is_custom=False
            ).values_list("pk", flat=True)
        )
        channel = testdata.channel()
        new_obj = ContentNode(
            title="yes",
            kind_id=content_kinds.VIDEO,
            parent=channel.main_tree,
            license_id=licenses[0],
            copyright_holder="Some person",
            extra_fields={
                "randomize": False,
                "options": {
                    "completion_criteria": {
                        "threshold": {
                            "mastery_model": exercises.M_OF_N,
                            "n": 5,
                        },
                        "model": completion_criteria.MASTERY,
                    }
                },
            },
        )
        new_obj.save()
        File.objects.create(
            contentnode=new_obj,
            preset_id=format_presets.VIDEO_HIGH_RES,
            checksum=uuid.uuid4().hex,
        )
        new_obj.mark_complete()
        self.assertFalse(new_obj.complete)

    def test_create_exercise_no_assessment_items(self):
        licenses = list(
            License.objects.filter(
                copyright_holder_required=False, is_custom=False
            ).values_list("pk", flat=True)
        )
        channel = testdata.channel()
        new_obj = ContentNode(
            title="yes",
            kind_id=content_kinds.EXERCISE,
            parent=channel.main_tree,
            license_id=licenses[0],
            extra_fields=self.new_extra_fields,
        )
        new_obj.save()
        new_obj.mark_complete()
        self.assertFalse(new_obj.complete)

    def test_create_exercise_invalid_assessment_item_no_question(self):
        licenses = list(
            License.objects.filter(
                copyright_holder_required=False, is_custom=False
            ).values_list("pk", flat=True)
        )
        channel = testdata.channel()
        new_obj = ContentNode(
            title="yes",
            kind_id=content_kinds.EXERCISE,
            parent=channel.main_tree,
            license_id=licenses[0],
            extra_fields=self.new_extra_fields,
        )
        new_obj.save()
        AssessmentItem.objects.create(
            contentnode=new_obj, answers='[{"correct": true, "text": "answer"}]'
        )
        new_obj.mark_complete()
        self.assertFalse(new_obj.complete)

    def test_create_exercise_invalid_assessment_item_no_answers(self):
        licenses = list(
            License.objects.filter(
                copyright_holder_required=False, is_custom=False
            ).values_list("pk", flat=True)
        )
        channel = testdata.channel()
        new_obj = ContentNode(
            title="yes",
            kind_id=content_kinds.EXERCISE,
            parent=channel.main_tree,
            license_id=licenses[0],
            extra_fields=self.new_extra_fields,
        )
        new_obj.save()
        AssessmentItem.objects.create(
            contentnode=new_obj, question="This is a question"
        )
        new_obj.mark_complete()
        self.assertFalse(new_obj.complete)

    def test_create_exercise_valid_assessment_item_free_response_no_answers(self):
        licenses = list(
            License.objects.filter(
                copyright_holder_required=False, is_custom=False
            ).values_list("pk", flat=True)
        )
        channel = testdata.channel()
        new_obj = ContentNode(
            title="yes",
            kind_id=content_kinds.EXERCISE,
            parent=channel.main_tree,
            license_id=licenses[0],
            extra_fields=self.new_extra_fields,
        )
        new_obj.save()
        AssessmentItem.objects.create(
            contentnode=new_obj,
            question="This is a question",
            type=exercises.FREE_RESPONSE,
        )
        new_obj.mark_complete()
        self.assertTrue(new_obj.complete)

    def test_create_exercise_invalid_assessment_item_no_correct_answers(self):
        licenses = list(
            License.objects.filter(
                copyright_holder_required=False, is_custom=False
            ).values_list("pk", flat=True)
        )
        channel = testdata.channel()
        new_obj = ContentNode(
            title="yes",
            kind_id=content_kinds.EXERCISE,
            parent=channel.main_tree,
            license_id=licenses[0],
            extra_fields=self.new_extra_fields,
        )
        new_obj.save()
        AssessmentItem.objects.create(
            contentnode=new_obj,
            question="This is a question",
            answers='[{"correct": false, "text": "answer"}]',
        )
        new_obj.mark_complete()
        self.assertFalse(new_obj.complete)

    def test_create_exercise_valid_assessment_item_no_correct_answers_input(self):
        licenses = list(
            License.objects.filter(
                copyright_holder_required=False, is_custom=False
            ).values_list("pk", flat=True)
        )
        channel = testdata.channel()
        new_obj = ContentNode(
            title="yes",
            kind_id=content_kinds.EXERCISE,
            parent=channel.main_tree,
            license_id=licenses[0],
            extra_fields=self.new_extra_fields,
        )
        new_obj.save()
        AssessmentItem.objects.create(
            contentnode=new_obj,
            question="This is a question",
            answers='[{"correct": false, "text": "answer"}]',
            type=exercises.INPUT_QUESTION,
        )
        new_obj.mark_complete()
        self.assertTrue(new_obj.complete)

    def test_create_exercise_valid_assessment_items(self):
        licenses = list(
            License.objects.filter(
                copyright_holder_required=False, is_custom=False
            ).values_list("pk", flat=True)
        )
        channel = testdata.channel()
        new_obj = ContentNode(
            title="yes",
            kind_id=content_kinds.EXERCISE,
            parent=channel.main_tree,
            license_id=licenses[0],
            extra_fields=self.new_extra_fields,
        )
        new_obj.save()
        AssessmentItem.objects.create(
            contentnode=new_obj,
            question="This is a question",
            answers='[{"correct": true, "text": "answer"}]',
        )
        new_obj.mark_complete()
        self.assertTrue(new_obj.complete)

    def test_create_exercise_valid_assessment_items_raw_data(self):
        licenses = list(
            License.objects.filter(
                copyright_holder_required=False, is_custom=False
            ).values_list("pk", flat=True)
        )
        channel = testdata.channel()
        new_obj = ContentNode(
            title="yes",
            kind_id=content_kinds.EXERCISE,
            parent=channel.main_tree,
            license_id=licenses[0],
            extra_fields=self.new_extra_fields,
        )
        new_obj.save()
        AssessmentItem.objects.create(contentnode=new_obj, raw_data='{"question": {}}')
        new_obj.mark_complete()
        self.assertTrue(new_obj.complete)

    def test_create_exercise_no_extra_fields(self):
        licenses = list(
            License.objects.filter(
                copyright_holder_required=False, is_custom=False
            ).values_list("pk", flat=True)
        )
        channel = testdata.channel()
        new_obj = ContentNode(
            title="yes",
            kind_id=content_kinds.EXERCISE,
            parent=channel.main_tree,
            license_id=licenses[0],
        )
        new_obj.save()
        AssessmentItem.objects.create(
            contentnode=new_obj,
            question="This is a question",
            answers='[{"correct": true, "text": "answer"}]',
        )
        new_obj.mark_complete()
        self.assertFalse(new_obj.complete)

    def test_create_exercise_old_extra_fields(self):
        licenses = list(
            License.objects.filter(
                copyright_holder_required=False, is_custom=False
            ).values_list("pk", flat=True)
        )
        channel = testdata.channel()
        new_obj = ContentNode(
            title="yes",
            kind_id=content_kinds.EXERCISE,
            parent=channel.main_tree,
            license_id=licenses[0],
            extra_fields=self.old_extra_fields,
        )
        new_obj.save()
        AssessmentItem.objects.create(
            contentnode=new_obj,
            question="This is a question",
            answers='[{"correct": true, "text": "answer"}]',
        )
        new_obj.mark_complete()
        self.assertTrue(new_obj.complete)

    def test_create_exercise_bad_new_extra_fields(self):
        licenses = list(
            License.objects.filter(
                copyright_holder_required=False, is_custom=False
            ).values_list("pk", flat=True)
        )
        channel = testdata.channel()
        new_obj = ContentNode(
            title="yes",
            kind_id=content_kinds.EXERCISE,
            parent=channel.main_tree,
            license_id=licenses[0],
            extra_fields={
                "randomize": False,
                "options": {
                    "completion_criteria": {
                        "threshold": {
                            "mastery_model": exercises.M_OF_N,
                            "n": 5,
                        },
                        "model": completion_criteria.MASTERY,
                    }
                },
            },
        )
        new_obj.save()
        AssessmentItem.objects.create(
            contentnode=new_obj,
            question="This is a question",
            answers='[{"correct": true, "text": "answer"}]',
        )
        new_obj.mark_complete()
        self.assertFalse(new_obj.complete)

    def test_create_video_null_extra_fields(self):
        licenses = list(
            License.objects.filter(
                copyright_holder_required=False, is_custom=False
            ).values_list("pk", flat=True)
        )
        channel = testdata.channel()
        new_obj = ContentNode(
            title="yes",
            kind_id=content_kinds.VIDEO,
            parent=channel.main_tree,
            license_id=licenses[0],
            copyright_holder="Some person",
            extra_fields=None,
        )
        new_obj.save()
        File.objects.create(
            contentnode=new_obj,
            preset_id=format_presets.VIDEO_HIGH_RES,
            checksum=uuid.uuid4().hex,
        )
        try:
            new_obj.mark_complete()
        except AttributeError:
            self.fail("Null extra_fields not handled")
