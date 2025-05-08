import datetime
from time import sleep

import mock
import pytest
from dateutil.parser import isoparse
from django.db.models import F
from django.db.models import Max
from django.test import SimpleTestCase

from ..base import StudioTestCase
from contentcuration.tests.helpers import mock_class_instance
from contentcuration.utils.nodes import calculate_resource_size
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
