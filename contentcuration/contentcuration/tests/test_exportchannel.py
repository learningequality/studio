import json
import os
import random
import string
import tempfile
import uuid

import pytest
from celery import states
from django.core.management import call_command
from django.db import connections
from django_celery_results.models import TaskResult
from kolibri_content import models as kolibri_models
from kolibri_content.router import cleanup_content_database_connection
from kolibri_content.router import get_active_content_database
from kolibri_content.router import set_active_content_database
from le_utils.constants import exercises
from le_utils.constants import format_presets
from le_utils.constants.labels import accessibility_categories
from le_utils.constants.labels import learning_activities
from le_utils.constants.labels import levels
from le_utils.constants.labels import needs
from le_utils.constants.labels import resource_type
from le_utils.constants.labels import subjects
from mock import patch

from .base import StudioTestCase
from .helpers import clear_tasks
from .testdata import channel
from .testdata import create_studio_file
from .testdata import node as create_node
from .testdata import slideshow
from .testdata import thumbnail_bytes
from .testdata import tree
from contentcuration import models as cc
from contentcuration.models import CustomTaskMetadata
from contentcuration.utils.assessment.qti.archive import hex_to_qti_id
from contentcuration.utils.celery.tasks import generate_task_signature
from contentcuration.utils.publish import ChannelIncompleteError
from contentcuration.utils.publish import convert_channel_thumbnail
from contentcuration.utils.publish import create_content_database
from contentcuration.utils.publish import create_slideshow_manifest
from contentcuration.utils.publish import fill_published_fields
from contentcuration.utils.publish import map_prerequisites
from contentcuration.utils.publish import MIN_SCHEMA_VERSION
from contentcuration.utils.publish import NoneContentNodeTreeError
from contentcuration.utils.publish import publish_channel
from contentcuration.utils.publish import set_channel_icon_encoding
from contentcuration.viewsets.base import create_change_tracker

pytestmark = pytest.mark.django_db


def description():
    return "".join(random.sample(string.printable, 20))


class ExportChannelTestCase(StudioTestCase):
    @classmethod
    def setUpClass(cls):
        super(ExportChannelTestCase, cls).setUpClass()
        cls.patch_copy_db = patch("contentcuration.utils.publish.save_export_database")
        cls.patch_copy_db.start()

    @classmethod
    def tearDownClass(cls):
        super(ExportChannelTestCase, cls).tearDownClass()
        cls.patch_copy_db.stop()

    def setUp(self):
        super(ExportChannelTestCase, self).setUp()
        self.content_channel = channel()

        # Make a ricecooker channel to test inheritance behaviour
        self.content_channel.ricecooker_version = "0.7.1"
        self.content_channel.save()

        # Add some incomplete nodes to ensure they don't get published.
        new_node = create_node(
            {"kind_id": "topic", "title": "Incomplete topic", "children": []}
        )
        new_node.complete = False
        new_node.parent = self.content_channel.main_tree
        new_node.save()

        new_video = create_node(
            {"kind_id": "video", "title": "Incomplete video", "children": []}
        )
        new_video.complete = False
        new_video.parent = new_node
        new_video.save()

        # Add a complete node within an incomplete node to ensure it's excluded.
        new_video = create_node(
            {"kind_id": "video", "title": "Complete video", "children": []}
        )
        new_video.complete = True
        new_video.parent = new_node
        new_video.save()

        # Add a node with tags greater than 30 chars to ensure they get excluded.
        new_video = create_node(
            {
                "kind_id": "video",
                "tags": [
                    {"tag_name": "kolbasdasdasrissadasdwzxcztudio"},
                    {"tag_name": "kolbasdasdasrissadasdwzxcztudi"},
                    {"tag_name": "kolbasdasdasrissadasdwzxc"},
                ],
                "title": "kolibri tag test",
                "children": [],
            }
        )
        new_video.complete = True
        new_video.parent = self.content_channel.main_tree
        new_video.save()

        # Add a node to test completion criteria.
        extra_fields = {
            "options": {"completion_criteria": {"model": "time", "threshold": 20}}
        }
        new_video = create_node(
            {
                "kind_id": "video",
                "title": "Completion criteria test",
                "extra_fields": extra_fields,
                "children": [],
            }
        )
        new_video.complete = True
        new_video.parent = self.content_channel.main_tree
        new_video.save()

        # Add a node to test new style mastery models.
        extra_fields = {
            "options": {
                "completion_criteria": {
                    "model": "mastery",
                    "threshold": {
                        "m": 1,
                        "n": 2,
                        "mastery_model": exercises.M_OF_N,
                    },
                }
            }
        }
        current_exercise = cc.ContentNode.objects.filter(kind_id="exercise").first()

        new_exercise = create_node(
            {
                "kind_id": "exercise",
                "title": "Mastery test",
                "extra_fields": extra_fields,
            }
        )
        new_exercise.complete = True
        new_exercise.parent = current_exercise.parent
        new_exercise.save()

        bad_container = create_node(
            {"kind_id": "topic", "title": "Bad topic container", "children": []}
        )
        bad_container.complete = True
        bad_container.parent = self.content_channel.main_tree
        bad_container.save()

        # exercise without mastery model, but marked as complete
        broken_exercise = create_node(
            {"kind_id": "exercise", "title": "Bad mastery test", "extra_fields": {}}
        )
        broken_exercise.complete = True
        broken_exercise.parent = bad_container
        broken_exercise.save()

        thumbnail_data = create_studio_file(
            thumbnail_bytes, preset="exercise_thumbnail", ext="png"
        )
        file_obj = thumbnail_data["db_file"]
        file_obj.contentnode = new_exercise
        file_obj.save()
        for ai in current_exercise.assessment_items.all():
            ai.id = None
            ai.contentnode = new_exercise
            ai.save()

        legacy_extra_fields = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "m": 1,
            "n": 2,
        }

        legacy_exercise = create_node(
            {
                "kind_id": "exercise",
                "title": "Legacy Mastery test",
                "extra_fields": legacy_extra_fields,
            }
        )
        legacy_exercise.complete = True
        legacy_exercise.parent = current_exercise.parent
        legacy_exercise.save()
        thumbnail_data = create_studio_file(
            thumbnail_bytes, preset="exercise_thumbnail", ext="png"
        )
        file_obj = thumbnail_data["db_file"]
        file_obj.contentnode = legacy_exercise
        file_obj.save()
        for ai in current_exercise.assessment_items.all():
            ai.id = None
            ai.contentnode = legacy_exercise
            ai.save()

        # Add an exercise with free response question to test QTI generation
        qti_extra_fields = {
            "options": {
                "completion_criteria": {
                    "model": "mastery",
                    "threshold": {
                        "m": 1,
                        "n": 2,
                        "mastery_model": exercises.M_OF_N,
                    },
                }
            }
        }
        qti_exercise = create_node(
            {
                "kind_id": "exercise",
                "title": "QTI Free Response Exercise",
                "extra_fields": qti_extra_fields,
            }
        )
        qti_exercise.complete = True
        qti_exercise.parent = current_exercise.parent
        qti_exercise.save()

        # Create a free response assessment item
        cc.AssessmentItem.objects.create(
            contentnode=qti_exercise,
            assessment_id=uuid.uuid4().hex,
            type=exercises.FREE_RESPONSE,
            question="What is the capital of France?",
            answers=json.dumps([{"answer": "Paris", "correct": True}]),
            hints=json.dumps([]),
            raw_data="{}",
            order=4,
            randomize=False,
        )

        for ai in current_exercise.assessment_items.all()[:2]:
            ai.id = None
            ai.contentnode = qti_exercise
            ai.save()

        first_topic = self.content_channel.main_tree.get_descendants().first()

        # Add a publishable topic to ensure it does not inherit but that its children do
        new_node = create_node({"kind_id": "topic", "title": "Disinherited topic"})
        new_node.complete = True
        new_node.parent = first_topic
        new_node.save()

        new_video = create_node({"kind_id": "video", "title": "Inheriting video"})
        new_video.complete = True
        new_video.parent = new_node
        new_video.save()

        first_topic.language_id = "fr"

        first_topic.accessibility_labels = {
            accessibility_categories.AUDIO_DESCRIPTION: True,
        }
        first_topic.learning_activities = {
            learning_activities.WATCH: True,
        }
        first_topic.grade_levels = {
            levels.LOWER_SECONDARY: True,
        }
        first_topic.learner_needs = {
            needs.PRIOR_KNOWLEDGE: True,
        }
        first_topic.resource_types = {
            resource_type.LESSON_PLAN: True,
        }
        first_topic.categories = {
            subjects.MATHEMATICS: True,
        }
        first_topic.save()

        first_topic_first_child = first_topic.children.first()
        first_topic_first_child.language_id = "sw"
        first_topic_first_child.accessibility_labels = {
            accessibility_categories.CAPTIONS_SUBTITLES: True,
        }
        first_topic_first_child.categories = {
            subjects.ALGEBRA: True,
        }
        first_topic_first_child.learner_needs = {
            needs.FOR_BEGINNERS: True,
        }
        first_topic_first_child.learning_activities = {
            learning_activities.LISTEN: True,
        }
        first_topic_first_child.save()

        set_channel_icon_encoding(self.content_channel)
        self.tempdb = create_content_database(
            self.content_channel, True, self.admin_user.id, True
        )

        set_active_content_database(self.tempdb)

    def tearDown(self):
        # Clean up datbase connection after the test
        cleanup_content_database_connection(self.tempdb)
        super(ExportChannelTestCase, self).tearDown()
        set_active_content_database(None)
        if os.path.exists(self.tempdb):
            os.remove(self.tempdb)

    def test_channel_rootnode_data(self):
        channel = kolibri_models.ChannelMetadata.objects.first()
        self.assertEqual(channel.root_pk, channel.root_id)

    def test_channel_version_data(self):
        channel = kolibri_models.ChannelMetadata.objects.first()
        self.assertEqual(channel.min_schema_version, MIN_SCHEMA_VERSION)

    def test_contentnode_license_data(self):
        nodes = kolibri_models.ContentNode.objects.all()
        assert nodes.count() > 0
        for node in nodes:
            if node.license:
                self.assertEqual(node.license_name, node.license.license_name)
                self.assertEqual(
                    node.license_description, node.license.license_description
                )

    def test_contentnode_incomplete_not_published(self):
        kolibri_nodes = kolibri_models.ContentNode.objects.all()
        assert kolibri_nodes.count() > 0
        channel_nodes = self.content_channel.main_tree.get_descendants()
        complete_nodes = channel_nodes.filter(complete=True)
        incomplete_nodes = channel_nodes.filter(complete=False)

        assert complete_nodes.count() > 0
        assert incomplete_nodes.count() > 0

        for node in complete_nodes:
            # if a parent node is incomplete, this node is excluded as well.
            if node.get_ancestors().filter(complete=False).count() == 0:
                assert kolibri_nodes.filter(pk=node.node_id).count() == 1
            else:
                assert kolibri_nodes.filter(pk=node.node_id).count() == 0

        for node in incomplete_nodes:
            assert kolibri_nodes.filter(pk=node.node_id).count() == 0

        # bad exercise node should not be published (technically incomplete)
        assert (
            kolibri_models.ContentNode.objects.filter(title="Bad mastery test").count()
            == 0
        )

    def test_tags_greater_than_30_excluded(self):
        tag_node = kolibri_models.ContentNode.objects.filter(
            title="kolibri tag test"
        ).first()
        published_tags = tag_node.tags.all()

        assert published_tags.count() == 2
        for t in published_tags:
            assert len(t.tag_name) <= 30

    def test_duration_override_on_completion_criteria_time(self):
        completion_criteria_node = kolibri_models.ContentNode.objects.filter(
            title="Completion criteria test"
        ).first()
        non_completion_criteria_node = kolibri_models.ContentNode.objects.filter(
            title="kolibri tag test"
        ).first()

        assert completion_criteria_node.duration == 20
        assert non_completion_criteria_node.duration == 100

    def test_completion_criteria_set(self):
        completion_criteria_node = kolibri_models.ContentNode.objects.filter(
            title="Completion criteria test"
        ).first()

        self.assertEqual(
            completion_criteria_node.options["completion_criteria"],
            {"model": "time", "threshold": 20},
        )

    def test_contentnode_channel_id_data(self):
        channel = kolibri_models.ChannelMetadata.objects.first()
        nodes = kolibri_models.ContentNode.objects.all()
        assert nodes.count() > 0
        for node in nodes:
            self.assertEqual(node.channel_id, channel.id)

    def test_contentnode_file_checksum_data(self):
        files = kolibri_models.File.objects.all()
        assert files.count() > 0
        for file in files:
            self.assertEqual(file.checksum, file.local_file_id)

    def test_contentnode_file_extension_data(self):
        files = kolibri_models.File.objects.all()
        assert files.count() > 0
        for file in files.prefetch_related("local_file"):
            self.assertEqual(file.extension, file.local_file.extension)

    def test_contentnode_file_size_data(self):
        files = kolibri_models.File.objects.all()
        assert files.count() > 0
        for file in files.prefetch_related("local_file"):
            self.assertEqual(file.file_size, file.local_file.file_size)

    def test_channel_icon_encoding(self):
        self.assertIsNotNone(self.content_channel.icon_encoding)

    def test_assessment_metadata(self):
        for i, exercise in enumerate(
            kolibri_models.ContentNode.objects.filter(kind="exercise")
        ):
            asm = exercise.assessmentmetadata.first()
            self.assertTrue(isinstance(asm.assessment_item_ids, list))
            mastery = asm.mastery_model
            self.assertTrue(isinstance(mastery, dict))
            self.assertEqual(
                mastery["type"], exercises.DO_ALL if i == 0 else exercises.M_OF_N
            )
            self.assertEqual(mastery["m"], 3 if i == 0 else 1)
            self.assertEqual(mastery["n"], 3 if i == 0 else 2)

    def test_inherited_language(self):
        first_topic_node_id = (
            self.content_channel.main_tree.get_descendants().first().node_id
        )
        for child in kolibri_models.ContentNode.objects.filter(
            parent_id=first_topic_node_id
        )[1:]:
            if child.kind == "topic":
                self.assertEqual(child.lang_id, self.content_channel.language_id)
                self.assertEqual(child.children.first().lang_id, "fr")
            else:
                self.assertEqual(child.lang_id, "fr")

    def test_inherited_language_no_overwrite(self):
        first_topic_node_id = (
            self.content_channel.main_tree.get_descendants().first().node_id
        )
        first_child = kolibri_models.ContentNode.objects.filter(
            parent_id=first_topic_node_id
        ).first()
        self.assertEqual(first_child.lang_id, "sw")

    def test_inherited_category(self):
        first_topic_node_id = (
            self.content_channel.main_tree.get_descendants().first().node_id
        )
        for child in kolibri_models.ContentNode.objects.filter(
            parent_id=first_topic_node_id
        )[1:]:
            if child.kind == "topic":
                self.assertIsNone(child.categories)
                self.assertEqual(
                    child.children.first().categories, subjects.MATHEMATICS
                )
            else:
                self.assertEqual(child.categories, subjects.MATHEMATICS)

    def test_inherited_category_no_overwrite(self):
        first_topic_node_id = (
            self.content_channel.main_tree.get_descendants().first().node_id
        )
        first_child = kolibri_models.ContentNode.objects.filter(
            parent_id=first_topic_node_id
        ).first()
        self.assertEqual(first_child.categories, subjects.ALGEBRA)

    def test_inherited_needs(self):
        first_topic_node_id = (
            self.content_channel.main_tree.get_descendants().first().node_id
        )
        for child in kolibri_models.ContentNode.objects.filter(
            parent_id=first_topic_node_id
        )[1:]:
            if child.kind == "topic":
                self.assertIsNone(child.learner_needs)
                self.assertEqual(
                    child.children.first().learner_needs, needs.PRIOR_KNOWLEDGE
                )
            else:
                self.assertEqual(child.learner_needs, needs.PRIOR_KNOWLEDGE)

    def test_inherited_needs_no_overwrite(self):
        first_topic_node_id = (
            self.content_channel.main_tree.get_descendants().first().node_id
        )
        first_child = kolibri_models.ContentNode.objects.filter(
            parent_id=first_topic_node_id
        ).first()
        self.assertEqual(first_child.learner_needs, needs.FOR_BEGINNERS)

    def test_topics_no_accessibility_label(self):
        first_topic_node_id = (
            self.content_channel.main_tree.get_descendants().first().node_id
        )
        topic = kolibri_models.ContentNode.objects.get(id=first_topic_node_id)
        self.assertIsNone(topic.accessibility_labels)

    def test_child_no_inherit_accessibility_label(self):
        first_topic_node_id = (
            self.content_channel.main_tree.get_descendants().first().node_id
        )
        first_child = kolibri_models.ContentNode.objects.filter(
            parent_id=first_topic_node_id
        ).first()
        # Should only be the learning activities we set on the child directly, not any parent ones.
        self.assertEqual(
            first_child.accessibility_labels,
            accessibility_categories.CAPTIONS_SUBTITLES,
        )

    def test_inherited_grade_levels(self):
        first_topic_node_id = (
            self.content_channel.main_tree.get_descendants().first().node_id
        )
        for child in kolibri_models.ContentNode.objects.filter(
            parent_id=first_topic_node_id
        ):
            if child.kind == "topic":
                self.assertIsNone(child.grade_levels)
                self.assertEqual(
                    child.children.first().grade_levels, levels.LOWER_SECONDARY
                )
            else:
                self.assertEqual(child.grade_levels, levels.LOWER_SECONDARY)

    def test_inherited_resource_types(self):
        first_topic_node_id = (
            self.content_channel.main_tree.get_descendants().first().node_id
        )
        for child in kolibri_models.ContentNode.objects.filter(
            parent_id=first_topic_node_id
        ):
            if child.kind == "topic":
                self.assertIsNone(child.resource_types)
                self.assertEqual(
                    child.children.first().resource_types, resource_type.LESSON_PLAN
                )
            else:
                self.assertEqual(child.resource_types, resource_type.LESSON_PLAN)

    def test_topics_no_learning_activity(self):
        first_topic_node_id = (
            self.content_channel.main_tree.get_descendants().first().node_id
        )
        topic = kolibri_models.ContentNode.objects.get(id=first_topic_node_id)
        self.assertIsNone(topic.learning_activities)

    def test_child_no_inherit_learning_activity(self):
        first_topic_node_id = (
            self.content_channel.main_tree.get_descendants().first().node_id
        )
        first_child = kolibri_models.ContentNode.objects.filter(
            parent_id=first_topic_node_id
        ).first()
        # Should only be the learning activities we set on the child directly, not any parent ones.
        self.assertEqual(first_child.learning_activities, learning_activities.LISTEN)

    def test_publish_no_modify_exercise_extra_fields(self):
        exercise = cc.ContentNode.objects.get(title="Mastery test")
        self.assertEqual(
            exercise.extra_fields["options"]["completion_criteria"]["threshold"],
            {
                "m": 1,
                "n": 2,
                "mastery_model": exercises.M_OF_N,
            },
        )
        published_exercise = kolibri_models.ContentNode.objects.get(
            title="Mastery test"
        )
        self.assertEqual(
            published_exercise.options["completion_criteria"]["threshold"],
            {
                "m": 1,
                "n": 2,
                "mastery_model": exercises.M_OF_N,
            },
        )

    def test_publish_no_modify_legacy_exercise_extra_fields(self):
        current_exercise = cc.ContentNode.objects.get(title="Legacy Mastery test")
        self.assertEqual(
            current_exercise.extra_fields,
            {"mastery_model": exercises.M_OF_N, "randomize": True, "m": 1, "n": 2},
        )

    def test_qti_exercise_generates_qti_archive(self):
        """Test that exercises with free response questions generate QTI archive files."""
        qti_exercise = cc.ContentNode.objects.get(title="QTI Free Response Exercise")

        # Check that a QTI archive file was created
        qti_files = qti_exercise.files.filter(preset_id=format_presets.QTI_ZIP)
        self.assertEqual(
            qti_files.count(),
            1,
            "QTI exercise should have exactly one QTI archive file",
        )

        qti_file = qti_files.first()
        self.assertIsNotNone(
            qti_file.file_on_disk, "QTI file should have file_on_disk content"
        )
        self.assertTrue(
            qti_file.original_filename.endswith(".zip"),
            "QTI file should be a zip archive",
        )

    def test_qti_archive_contains_manifest_and_assessment_ids(self):

        published_qti_exercise = kolibri_models.ContentNode.objects.get(
            title="QTI Free Response Exercise"
        )
        assessment_ids = (
            published_qti_exercise.assessmentmetadata.first().assessment_item_ids
        )

        # Should have exactly one assessment ID corresponding to our free response question
        self.assertEqual(
            len(assessment_ids), 3, "Should have exactly three assessment IDs"
        )

        # The assessment ID should match the one from our assessment item
        qti_exercise = cc.ContentNode.objects.get(title="QTI Free Response Exercise")
        for i, ai in enumerate(qti_exercise.assessment_items.order_by("order")):
            self.assertEqual(assessment_ids[i], hex_to_qti_id(ai.assessment_id))


class EmptyChannelTestCase(StudioTestCase):
    @classmethod
    def setUpClass(cls):
        super(EmptyChannelTestCase, cls).setUpClass()
        cls.patch_copy_db = patch("contentcuration.utils.publish.save_export_database")
        cls.patch_copy_db.start()

    @classmethod
    def tearDownClass(cls):
        super(EmptyChannelTestCase, cls).tearDownClass()
        cls.patch_copy_db.stop()

    def test_publish_empty_channel(self):
        content_channel = channel()
        set_channel_icon_encoding(content_channel)
        content_channel.main_tree.complete = True
        content_channel.main_tree.save()
        content_channel.main_tree.get_descendants().exclude(kind_id="topic").delete()
        with self.assertRaises(ChannelIncompleteError):
            create_content_database(content_channel, True, self.admin_user.id, True)


class ChannelExportUtilityFunctionTestCase(StudioTestCase):
    @classmethod
    def setUpClass(cls):
        super(ChannelExportUtilityFunctionTestCase, cls).setUpClass()
        cls.patch_copy_db = patch("contentcuration.utils.publish.save_export_database")
        cls.patch_copy_db.start()

    @classmethod
    def tearDownClass(cls):
        super(ChannelExportUtilityFunctionTestCase, cls).tearDownClass()
        cls.patch_copy_db.stop()

    def setUp(self):
        super(ChannelExportUtilityFunctionTestCase, self).setUp()
        fh, output_db = tempfile.mkstemp(suffix=".sqlite3")
        self.output_db = output_db
        set_active_content_database(self.output_db)
        call_command(
            "migrate", "content", database=get_active_content_database(), no_input=True
        )

    def tearDown(self):
        # Clean up datbase connection after the test
        connections[self.output_db].close()
        del connections.databases[self.output_db]
        super(ChannelExportUtilityFunctionTestCase, self).tearDown()
        set_active_content_database(None)
        if os.path.exists(self.output_db):
            os.remove(self.output_db)
        clear_tasks()

    def test_convert_channel_thumbnail_empty_thumbnail(self):
        channel = cc.Channel.objects.create(actor_id=self.admin_user.id)
        self.assertEqual("", convert_channel_thumbnail(channel))

    def test_convert_channel_thumbnail_static_thumbnail(self):
        channel = cc.Channel.objects.create(
            thumbnail="/static/kolibri_flapping_bird.png", actor_id=self.admin_user.id
        )
        self.assertEqual("", convert_channel_thumbnail(channel))

    def test_convert_channel_thumbnail_encoding_valid(self):
        channel = cc.Channel.objects.create(
            thumbnail="/content/kolibri_flapping_bird.png",
            thumbnail_encoding={"base64": "flappy_bird"},
            actor_id=self.admin_user.id,
        )
        self.assertEqual("flappy_bird", convert_channel_thumbnail(channel))

    def test_convert_channel_thumbnail_encoding_invalid(self):
        with patch(
            "contentcuration.utils.publish.get_thumbnail_encoding",
            return_value="this is a test",
        ):
            channel = cc.Channel.objects.create(
                thumbnail="/content/kolibri_flapping_bird.png",
                thumbnail_encoding={},
                actor_id=self.admin_user.id,
            )
            self.assertEqual("this is a test", convert_channel_thumbnail(channel))

    def test_create_slideshow_manifest(self):
        ccnode = cc.ContentNode.objects.create(
            kind_id=slideshow(), extra_fields={}, complete=True
        )
        create_slideshow_manifest(ccnode)
        manifest_collection = cc.File.objects.filter(
            contentnode=ccnode, preset_id=u"slideshow_manifest"
        )
        assert len(manifest_collection) == 1


class ChannelExportPrerequisiteTestCase(StudioTestCase):
    @classmethod
    def setUpClass(cls):
        super(ChannelExportPrerequisiteTestCase, cls).setUpClass()
        cls.patch_copy_db = patch("contentcuration.utils.publish.save_export_database")
        cls.patch_copy_db.start()

    def setUp(self):
        super(ChannelExportPrerequisiteTestCase, self).setUp()
        fh, output_db = tempfile.mkstemp(suffix=".sqlite3")
        self.output_db = output_db
        set_active_content_database(self.output_db)
        call_command(
            "migrate", "content", database=get_active_content_database(), no_input=True
        )

    def tearDown(self):
        # Clean up datbase connection after the test
        connections[self.output_db].close()
        del connections.databases[self.output_db]
        super(ChannelExportPrerequisiteTestCase, self).tearDown()
        set_active_content_database(None)
        if os.path.exists(self.output_db):
            os.remove(self.output_db)

    def test_nonexistent_prerequisites(self):
        channel = cc.Channel.objects.create(actor_id=self.admin_user.id)
        node1 = cc.ContentNode.objects.create(
            kind_id="exercise", parent_id=channel.main_tree.pk, complete=True
        )
        exercise = cc.ContentNode.objects.create(kind_id="exercise", complete=True)

        cc.PrerequisiteContentRelationship.objects.create(
            target_node=exercise, prerequisite=node1
        )
        map_prerequisites(node1)


class ChannelExportPublishedData(StudioTestCase):
    def setUp(self):
        super().setUpBase()

        self.license1 = cc.License.objects.create(
            id=100,
            license_name="License 1",
            license_description="Description 1",
            license_url="http://example.com/license1",
        )
        self.license2 = cc.License.objects.create(
            id=101,
            license_name="License 2",
            license_description="Description 2",
            license_url="http://example.com/license2",
        )

        self.category1 = "Category 1"
        self.category2 = "Category 2"

        self.node1 = self.channel.main_tree.get_root()
        self.node2 = self.channel.main_tree.get_children().first()
        self.node3 = self.node2.get_children().first()
        self.node4 = self.node3.get_next_sibling()

        self.node1.license = self.license1
        self.node1.categories = {self.category1: True}
        self.node1.published = True
        self.node1.save()

        self.node2.license = self.license2
        self.node2.categories = {self.category2: True}
        self.node2.published = True
        self.node2.save()

        self.node3.license = self.license1
        self.node3.categories = {self.category1: True}
        self.node3.published = True
        self.node3.save()

        self.node4.license = None
        self.node4.categories = None
        self.node4.published = True
        self.node4.save()

    def test_fill_published_fields__version_notes(self):
        version_notes = description()
        self.channel.last_published
        fill_published_fields(self.channel, version_notes)
        self.assertTrue(self.channel.published_data)
        self.assertIsNotNone(self.channel.published_data.get(0))
        self.assertEqual(self.channel.published_data[0]["version_notes"], version_notes)

    def test_fill_published_fields__included_licenses(self):
        version_notes = description()
        fill_published_fields(self.channel, version_notes)

        returned_license_ids = self.channel.published_data[0]["included_licenses"]
        expected_license_ids = [self.license1.id, self.license2.id]

        self.assertEqual(len(returned_license_ids), len(expected_license_ids))
        self.assertSetEqual(set(returned_license_ids), set(expected_license_ids))

    def test_fill_published_fields__included_categories(self):
        version_notes = description()
        fill_published_fields(self.channel, version_notes)

        expected_categories = [self.category1, self.category2]
        returned_categories = self.channel.published_data[0]["included_categories"]

        self.assertEqual(len(returned_categories), len(expected_categories))
        self.assertSetEqual(set(returned_categories), set(expected_categories))


class PublishFailCleansUpTaskObjects(StudioTestCase):
    def setUp(self):
        super(PublishFailCleansUpTaskObjects, self).setUpBase()

    def test_failed_task_objects_cleaned_up_when_publishing(self):
        channel_id = self.channel.id
        task_name = "export-channel"
        task_id = uuid.uuid4().hex
        pk = "ab684452f2ad4ba6a1426d6410139f60"
        table = "channel"
        task_kwargs = json.dumps({"pk": pk, "table": table})
        signature = generate_task_signature(
            task_name, task_kwargs=task_kwargs, channel_id=channel_id
        )

        TaskResult.objects.create(
            task_id=task_id,
            status=states.FAILURE,
            task_name=task_name,
        )

        CustomTaskMetadata.objects.create(
            task_id=task_id, channel_id=channel_id, user=self.user, signature=signature
        )

        assert TaskResult.objects.filter(task_id=task_id).exists()
        assert CustomTaskMetadata.objects.filter(task_id=task_id).exists()

        with create_change_tracker(pk, table, channel_id, self.user, task_name):
            assert not TaskResult.objects.filter(task_id=task_id).exists()
            assert not CustomTaskMetadata.objects.filter(task_id=task_id).exists()
            new_task_result = TaskResult.objects.filter(
                task_name=task_name, status=states.STARTED
            ).first()
            new_custom_task_metadata = CustomTaskMetadata.objects.get(
                channel_id=channel_id, user=self.user, signature=signature
            )
            assert new_custom_task_metadata.task_id == new_task_result.task_id


class PublishStagingTreeTestCase(StudioTestCase):
    @classmethod
    def setUpClass(cls):
        super(PublishStagingTreeTestCase, cls).setUpClass()
        cls.patch_copy_db = patch("contentcuration.utils.publish.save_export_database")
        cls.mock_save_export = cls.patch_copy_db.start()

    @classmethod
    def tearDownClass(cls):
        super(PublishStagingTreeTestCase, cls).tearDownClass()
        cls.patch_copy_db.stop()

    def setUp(self):
        super(PublishStagingTreeTestCase, self).setUp()

        self.channel_version = 3
        self.incomplete_video_in_staging = "Incomplete video in staging tree"
        self.complete_video_in_staging = "Complete video in staging tree"
        self.incomplete_video_in_main = "Incomplete video in main tree"
        self.complete_video_in_main = "Complete video in main tree"

        self.content_channel = channel()
        self.content_channel.staging_tree = tree()
        self.content_channel.version = self.channel_version
        self.content_channel.save()

        # Incomplete node should be excluded.
        new_node = create_node(
            {
                "kind_id": "video",
                "title": self.incomplete_video_in_staging,
                "children": [],
            }
        )
        new_node.complete = False
        new_node.parent = self.content_channel.staging_tree
        new_node.published = False
        new_node.save()

        # Complete node should be included.
        new_video = create_node(
            {
                "kind_id": "video",
                "title": self.complete_video_in_staging,
                "children": [],
            }
        )
        new_video.complete = True
        new_video.parent = self.content_channel.staging_tree
        new_node.published = False
        new_video.save()

        # Incomplete node in main_tree.
        new_node = create_node(
            {"kind_id": "video", "title": self.incomplete_video_in_main, "children": []}
        )
        new_node.complete = False
        new_node.parent = self.content_channel.main_tree
        new_node.published = False
        new_node.save()

        # Complete node in main_tree.
        new_node = create_node(
            {"kind_id": "video", "title": self.complete_video_in_main, "children": []}
        )
        new_node.complete = True
        new_node.parent = self.content_channel.main_tree
        new_node.published = False
        new_node.save()

    def run_publish_channel(self):
        publish_channel(
            self.admin_user.id,
            self.content_channel.id,
            force=False,
            force_exercises=False,
            send_email=False,
            progress_tracker=None,
            is_draft_version=True,
            use_staging_tree=True,
        )

    def test_none_staging_tree(self):
        self.content_channel.staging_tree = None
        self.content_channel.save()
        with self.assertRaises(NoneContentNodeTreeError):
            self.run_publish_channel()

    def test_staging_tree_not_published_for_draft(self):
        self.run_publish_channel()
        self.assertFalse(self.content_channel.staging_tree.published)

    def test_next_version_exported(self):
        self.run_publish_channel()
        self.mock_save_export.assert_called_with(
            self.content_channel.id,
            "next",
            True,
        )

    def test_main_tree_not_impacted(self):
        self.assertFalse(self.content_channel.main_tree.published)
        self.run_publish_channel()
        self.content_channel.refresh_from_db()
        self.assertFalse(self.content_channel.main_tree.published)

    def test_channel_version_not_incremented(self):
        self.assertEqual(self.content_channel.version, self.channel_version)
        self.run_publish_channel()
        self.content_channel.refresh_from_db()
        self.assertEqual(self.content_channel.version, self.channel_version)

    def test_staging_tree_used_for_publish(self):
        set_channel_icon_encoding(self.content_channel)
        self.tempdb = create_content_database(
            self.content_channel,
            True,
            self.admin_user.id,
            True,
            progress_tracker=None,
            is_draft_version=True,
            use_staging_tree=True,
        )
        set_active_content_database(self.tempdb)

        nodes = kolibri_models.ContentNode.objects.all()
        self.assertEqual(
            nodes.filter(title=self.incomplete_video_in_staging).count(), 0
        )
        self.assertEqual(nodes.filter(title=self.complete_video_in_staging).count(), 1)
        self.assertEqual(nodes.filter(title=self.incomplete_video_in_main).count(), 0)
        self.assertEqual(nodes.filter(title=self.complete_video_in_main).count(), 0)

        cleanup_content_database_connection(self.tempdb)
        set_active_content_database(None)
        if os.path.exists(self.tempdb):
            os.remove(self.tempdb)


class PublishDraftUsingMainTreeTestCase(StudioTestCase):
    @classmethod
    def setUpClass(cls):
        super(PublishDraftUsingMainTreeTestCase, cls).setUpClass()
        cls.patch_copy_db = patch("contentcuration.utils.publish.save_export_database")
        cls.mock_save_export = cls.patch_copy_db.start()

    @classmethod
    def tearDownClass(cls):
        super(PublishDraftUsingMainTreeTestCase, cls).tearDownClass()
        cls.patch_copy_db.stop()

    def setUp(self):
        super(PublishDraftUsingMainTreeTestCase, self).setUp()

        self.channel_version = 3
        self.incomplete_video_in_main = "Incomplete video in main tree"
        self.complete_video_in_main = "Complete video in main tree"

        self.content_channel = channel()
        self.content_channel.version = self.channel_version
        self.content_channel.save()

        # Incomplete node in main_tree should be excluded.
        new_node = create_node(
            {"kind_id": "video", "title": self.incomplete_video_in_main, "children": []}
        )
        new_node.complete = False
        new_node.parent = self.content_channel.main_tree
        new_node.published = False
        new_node.save()

        # Complete node in main_tree should be included.
        new_node = create_node(
            {"kind_id": "video", "title": self.complete_video_in_main, "children": []}
        )
        new_node.complete = True
        new_node.parent = self.content_channel.main_tree
        new_node.published = False
        new_node.save()

    def run_publish_channel(self):
        publish_channel(
            self.admin_user.id,
            self.content_channel.id,
            force=False,
            force_exercises=False,
            send_email=False,
            progress_tracker=None,
            is_draft_version=True,
            use_staging_tree=False,
        )

    def test_next_version_exported(self):
        self.run_publish_channel()
        self.mock_save_export.assert_called_with(
            self.content_channel.id,
            "next",
            True,
        )

    def test_main_tree_not_impacted(self):
        self.assertFalse(self.content_channel.main_tree.published)
        self.run_publish_channel()
        self.content_channel.refresh_from_db()
        self.assertFalse(self.content_channel.main_tree.published)

    def test_channel_version_not_incremented(self):
        self.assertEqual(self.content_channel.version, self.channel_version)
        self.run_publish_channel()
        self.content_channel.refresh_from_db()
        self.assertEqual(self.content_channel.version, self.channel_version)

    def test_main_tree_used_for_publish(self):
        set_channel_icon_encoding(self.content_channel)
        self.tempdb = create_content_database(
            self.content_channel,
            True,
            self.admin_user.id,
            True,
            progress_tracker=None,
            is_draft_version=True,
            use_staging_tree=False,
        )
        set_active_content_database(self.tempdb)

        nodes = kolibri_models.ContentNode.objects.all()
        self.assertEqual(nodes.filter(title=self.incomplete_video_in_main).count(), 0)
        self.assertEqual(nodes.filter(title=self.complete_video_in_main).count(), 1)

        cleanup_content_database_connection(self.tempdb)
        set_active_content_database(None)
        if os.path.exists(self.tempdb):
            os.remove(self.tempdb)

    def test_only_next_file_created(self):
        self.mock_save_export.reset_mock()
        self.run_publish_channel()
        self.assertEqual(self.mock_save_export.call_count, 1)
        call_args = self.mock_save_export.call_args
        self.assertEqual(call_args[0][1], "next")
        self.assertEqual(call_args[0][2], True)
