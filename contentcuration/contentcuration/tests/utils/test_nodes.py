import datetime
import uuid
from time import sleep

import mock
import pytest
from dateutil.parser import isoparse
from django.db.models import F
from django.db.models import Max
from django.test import SimpleTestCase
from le_utils.constants import content_kinds
from le_utils.constants import format_presets

from ..base import StudioTestCase
from contentcuration.models import File
from contentcuration.tests import testdata
from contentcuration.tests.helpers import mock_class_instance
from contentcuration.utils.nodes import calculate_resource_size
from contentcuration.utils.nodes import generate_diff
from contentcuration.utils.nodes import ResourceSizeHelper
from contentcuration.utils.nodes import SlowCalculationError
from contentcuration.utils.nodes import STALE_MAX_CALCULATION_SIZE


class ResourceSizeHelperTestCase(StudioTestCase):
    def setUp(self):
        super(ResourceSizeHelperTestCase, self).setUpBase()
        self.root = self.channel.main_tree
        self.helper = ResourceSizeHelper(self.root)

    def test_get_size(self):
        self.assertEqual(10, self.helper.get_size())

    def test_get_size__root_node_simplification(self):
        self.assertEqual(10, self.helper.get_size())
        with mock.patch.object(self.root, "is_root_node") as is_root_node:
            is_root_node.return_value = False
            self.assertEqual(10, self.helper.get_size())

    @pytest.mark.skip
    def test_modified_since(self):
        max_modified = self.helper.queryset.aggregate(max_modified=Max(F("modified")))[
            "max_modified"
        ]
        before_max = max_modified - datetime.timedelta(seconds=1)
        after_max = max_modified + datetime.timedelta(seconds=1)
        self.assertTrue(self.helper.modified_since(before_max.isoformat()))
        self.assertFalse(self.helper.modified_since(after_max.isoformat()))


@mock.patch("contentcuration.utils.nodes.ResourceSizeHelper")
@mock.patch("contentcuration.utils.nodes.ResourceSizeCache")
class CalculateResourceSizeTestCase(SimpleTestCase):
    def setUp(self):
        super(CalculateResourceSizeTestCase, self).setUp()
        self.node = mock_class_instance("contentcuration.models.ContentNode")

    def assertCalculation(self, cache, helper, force=False):
        helper().get_size.return_value = 456
        now_val = isoparse("2021-01-01T00:00:00")
        with mock.patch("contentcuration.utils.nodes.timezone.now") as now:
            now.return_value = now_val
            size, stale = calculate_resource_size(self.node, force=force)
        self.assertEqual(456, size)
        self.assertFalse(stale)
        cache().set_size.assert_called_once_with(456)
        cache().set_modified.assert_called_once_with(now_val)

    def test_cached(self, cache, helper):
        cache().get_size.return_value = 123
        cache().get_modified.return_value = "2021-01-01 00:00:00"
        helper().modified_since.return_value = False
        size, stale = calculate_resource_size(self.node)
        self.assertEqual(123, size)
        self.assertFalse(stale)

    def test_stale__too_big__no_force(self, cache, helper):
        self.node.get_descendant_count.return_value = STALE_MAX_CALCULATION_SIZE + 1
        cache().get_size.return_value = 123
        cache().get_modified.return_value = "2021-01-01 00:00:00"
        helper().modified_since.return_value = True
        size, stale = calculate_resource_size(self.node)
        self.assertEqual(123, size)
        self.assertTrue(stale)

    def test_stale__too_big__forced(self, cache, helper):
        self.node.get_descendant_count.return_value = STALE_MAX_CALCULATION_SIZE + 1
        helper().modified_since.return_value = True
        self.assertCalculation(cache, helper, force=True)

    def test_missing__too_big__no_force(self, cache, helper):
        self.node.get_descendant_count.return_value = STALE_MAX_CALCULATION_SIZE + 1
        cache().get_size.return_value = None
        cache().get_modified.return_value = None
        size, stale = calculate_resource_size(self.node)
        self.assertIsNone(size)
        self.assertTrue(stale)

    def test_missing__too_big__forced(self, cache, helper):
        self.node.get_descendant_count.return_value = STALE_MAX_CALCULATION_SIZE + 1
        self.assertCalculation(cache, helper, force=True)

    def test_missing__small(self, cache, helper):
        self.node.get_descendant_count.return_value = 1
        cache().get_size.return_value = None
        cache().get_modified.return_value = None
        self.assertCalculation(cache, helper)

    def test_unforced__took_too_long(self, cache, helper):
        self.node.get_descendant_count.return_value = 1
        cache().get_size.return_value = None
        cache().get_modified.return_value = None

        def db_get_size():
            sleep(1.2)
            return 456

        helper().get_size.side_effect = db_get_size

        with mock.patch(
            "contentcuration.utils.nodes.report_exception"
        ) as report_exception, mock.patch(
            "contentcuration.utils.nodes.SLOW_UNFORCED_CALC_THRESHOLD", 1
        ):
            self.assertCalculation(cache, helper)
            self.assertIsInstance(
                report_exception.mock_calls[0][1][0], SlowCalculationError
            )


class CalculateResourceSizeIntegrationTestCase(StudioTestCase):
    """
    Integration test case
    """

    def setUp(self):
        super(CalculateResourceSizeIntegrationTestCase, self).setUpBase()
        self.root = self.channel.main_tree

    def test_small(self):
        size, stale = calculate_resource_size(self.root)
        self.assertEqual(10, size)
        self.assertFalse(stale)

        # again, should be cached
        size, stale = calculate_resource_size(self.root)
        self.assertEqual(10, size)
        self.assertFalse(stale)


class GenerateTreesDiffTestCase(StudioTestCase):
    def setUp(self):
        super(GenerateTreesDiffTestCase, self).setUpBase()
        self.channel.staging_tree = self.channel.main_tree.copy()
        self.channel.save()

        self.main_tree = self.channel.main_tree
        self.staging_tree = self.channel.staging_tree

    def _get_stat(self, diff, stat_name):
        """
        Helper function to get a specific stat from the diff.
        """
        for stat in diff.get("stats", []):
            if stat.get("field") == stat_name:
                return stat
        raise ValueError(f"Stat '{stat_name}' not found in diff.")

    def _create_dummy_files(
        self,
        contentnode=None,
        assessment_item=None,
        file_size=1000,
        num_files=1,
        preset=None,
    ):
        """
        Helper function to create a file associated with a content node or assessment item.
        """
        for _ in range(num_files):
            file = File.objects.create(
                file_size=file_size,
                preset_id=preset,
                contentnode=contentnode,
                assessment_item=assessment_item,
            )
            file.save()

    def _create_dummy_resources(self, count=1, kind=content_kinds.VIDEO, parent=None):
        """
        Helper function to create dummy resources under a given parent node.
        """
        num_children = parent.get_children().count() if parent else 0
        for i in range(count):
            testdata.node(
                {
                    "kind_id": kind,
                    "title": f"Test {kind.capitalize()} {i}",
                    "sort_order": num_children + i + 1,
                },
                parent=parent,
            )

    def _create_dummy_exercise(self, count=1, parent=None, num_assesments=1):
        """
        Helper function to create dummy exercises with a specified number of assessment items.
        """
        num_children = parent.get_children().count() if parent else 0
        for i in range(count):
            testdata.node(
                {
                    "kind_id": content_kinds.EXERCISE,
                    "mastery_model": "do_all",
                    "title": f"Test Exercise {i}",
                    "sort_order": num_children + i + 1,
                    "assessment_items": [
                        {
                            "type": "single_selection",
                            "question": f"Question {j + 1}?",
                            "assessment_id": uuid.uuid4(),
                            "answers": [
                                {
                                    "answer": f"Answer {k + 1}",
                                    "correct": k == 0,  # First answer is correct
                                    "help_text": "",
                                }
                                for k in range(2)
                            ],
                        }
                        for j in range(num_assesments)
                    ],
                },
                parent=parent,
            )

    def test_generate_diff_for_same_tree(self):
        diff = generate_diff(self.main_tree.id, self.main_tree.id)
        stats = diff.get("stats", [])
        for stat in stats:
            self.assertTrue(stat["original"] == stat["changed"])

    def test_generate_diff_for_equal_trees(self):
        diff = generate_diff(self.main_tree.id, self.staging_tree.id)
        stats = diff.get("stats", [])
        for stat in stats:
            if stat["field"] == "date_created":
                # date_created is not expected to be the same
                continue

            self.assertTrue(stat["original"] == stat["changed"])

    def test_generate_diff_for_resources_files_sizes(self):
        count_new_files = 3
        count_size_per_file = 1000

        staging_video_resource = (
            self.staging_tree.get_descendants().filter(kind=content_kinds.VIDEO).first()
        )
        self._create_dummy_files(
            contentnode=staging_video_resource,
            file_size=count_size_per_file,
            num_files=count_new_files,
        )

        # How many new files were added times the size of each file
        expected_difference = count_new_files * count_size_per_file

        diff = generate_diff(self.staging_tree.id, self.main_tree.id)
        file_size_in_bytes_stat = self._get_stat(diff, "file_size_in_bytes")

        self.assertEqual(file_size_in_bytes_stat.get("difference"), expected_difference)

    def test_generate_diff_for_assesments_files_sizes(self):
        count_new_files = 3
        count_size_per_file = 1000

        staging_exercise_resource = (
            self.staging_tree.get_descendants()
            .filter(kind=content_kinds.EXERCISE)
            .first()
        )
        staging_assessment_item = staging_exercise_resource.assessment_items.first()

        self._create_dummy_files(
            assessment_item=staging_assessment_item,
            file_size=count_size_per_file,
            num_files=count_new_files,
        )

        # How many new files were added times the size of each file
        expected_difference = count_new_files * count_size_per_file

        diff = generate_diff(self.staging_tree.id, self.main_tree.id)
        file_size_in_bytes_stat = self._get_stat(diff, "file_size_in_bytes")

        self.assertEqual(file_size_in_bytes_stat.get("difference"), expected_difference)

    def test_generate_diff_for_all_files_sizes(self):
        count_new_files = 3
        count_size_per_file = 1000

        staging_exercise_resource = (
            self.staging_tree.get_descendants()
            .filter(kind=content_kinds.EXERCISE)
            .first()
        )
        staging_assessment_item = staging_exercise_resource.assessment_items.first()

        self._create_dummy_files(
            contentnode=staging_exercise_resource,
            file_size=count_size_per_file,
            num_files=count_new_files,
        )

        self._create_dummy_files(
            assessment_item=staging_assessment_item,
            file_size=count_size_per_file,
            num_files=count_new_files,
        )

        resource_files_size = count_new_files * count_size_per_file
        assessment_files_size = count_new_files * count_size_per_file

        expected_difference = resource_files_size + assessment_files_size

        diff = generate_diff(self.staging_tree.id, self.main_tree.id)
        file_size_in_bytes_stat = self._get_stat(diff, "file_size_in_bytes")

        self.assertEqual(file_size_in_bytes_stat.get("difference"), expected_difference)

    def test_generate_diff_for_num_resources(self):
        # Creating files just to test that it doesnt affect the num_resources stat
        count_new_files = 4
        staging_exercise_resource = (
            self.staging_tree.get_descendants()
            .filter(kind=content_kinds.EXERCISE)
            .first()
        )
        staging_assessment_item = staging_exercise_resource.assessment_items.first()
        self._create_dummy_files(
            contentnode=staging_exercise_resource,
            file_size=1000,
            num_files=count_new_files,
        )
        self._create_dummy_files(
            assessment_item=staging_assessment_item,
            file_size=1000,
            num_files=count_new_files,
        )

        count_new_resources = 5
        self._create_dummy_resources(
            count=count_new_resources,
            kind=content_kinds.VIDEO,
            parent=self.staging_tree,
        )

        diff = generate_diff(self.staging_tree.id, self.main_tree.id)
        count_resources_stat = self._get_stat(diff, "count_resources")

        self.assertEqual(count_resources_stat.get("difference"), count_new_resources)

    def test_generate_diff_for_num_assessment_items(self):
        count_new_exercises = 3
        count_assessment_items_per_exercise = 2

        self._create_dummy_exercise(
            count=count_new_exercises,
            parent=self.staging_tree,
            num_assesments=count_assessment_items_per_exercise,
        )

        expected_difference = count_new_exercises * count_assessment_items_per_exercise

        diff = generate_diff(self.staging_tree.id, self.main_tree.id)
        count_questions_stat = self._get_stat(diff, "count_questions")
        self.assertEqual(count_questions_stat.get("difference"), expected_difference)

    def test_generate_diff_for_num_subtitle_files(self):
        count_new_subtitle_files = 3
        staging_video_resource = (
            self.staging_tree.get_descendants().filter(kind=content_kinds.VIDEO).first()
        )

        for i in range(count_new_subtitle_files):
            self._create_dummy_files(
                contentnode=staging_video_resource,
                file_size=1000,
                num_files=1,
                preset=format_presets.VIDEO_SUBTITLE,
            )

        diff = generate_diff(self.staging_tree.id, self.main_tree.id)
        count_subtitles_stat = self._get_stat(diff, "count_subtitles")

        self.assertEqual(
            count_subtitles_stat.get("difference"), count_new_subtitle_files
        )

    def test_generate_diff_for_resources_types(self):
        new_resources = {
            content_kinds.VIDEO: 3,
            content_kinds.TOPIC: 2,
            content_kinds.EXERCISE: 1,
        }
        for kind, count in new_resources.items():
            self._create_dummy_resources(
                count=count, kind=kind, parent=self.staging_tree
            )
        diff = generate_diff(self.staging_tree.id, self.main_tree.id)
        for kind, name in content_kinds.choices:
            stat = self._get_stat(diff, f"count_{kind}s")
            expected_count = new_resources.get(kind, 0)
            self.assertEqual(stat.get("difference"), expected_count)
