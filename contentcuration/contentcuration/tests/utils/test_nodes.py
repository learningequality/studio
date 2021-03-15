import datetime

import mock
from dateutil.parser import isoparse
from django.db.models import F
from django.db.models import Max
from django.test import SimpleTestCase

from ..base import BaseTestCase
from ..base import mock_class_instance
from contentcuration.models import ContentNode
from contentcuration.utils.nodes import calculate_resource_size
from contentcuration.utils.nodes import ResourceSizeCache
from contentcuration.utils.nodes import ResourceSizeHelper
from contentcuration.utils.nodes import STALE_MAX_CALCULATION_SIZE


class ResourceSizeCacheTestCase(SimpleTestCase):
    def setUp(self):
        super(ResourceSizeCacheTestCase, self).setUp()
        self.node = mock.Mock(spec_set=ContentNode())
        self.node.pk = "abcdefghijklmnopqrstuvwxyz"
        self.redis_client = mock_class_instance("redis.client.StrictRedis")
        self.cache_client = mock_class_instance("django_redis.client.DefaultClient")
        self.cache_client.get_client.return_value = self.redis_client
        self.cache = mock.Mock(client=self.cache_client)
        self.helper = ResourceSizeCache(self.node, self.cache)

    def test_redis_client(self):
        self.assertEqual(self.helper.redis_client, self.redis_client)
        self.cache_client.get_client.assert_called_once_with(write=True)

    def test_redis_client__not_redis(self):
        self.cache.client = mock.Mock()
        self.assertIsNone(self.helper.redis_client)

    def test_hash_key(self):
        self.assertEqual("resource_size:abcd", self.helper.hash_key)

    def test_size_key(self):
        self.assertEqual("abcdefghijklmnopqrstuvwxyz:value", self.helper.size_key)

    def test_modified_key(self):
        self.assertEqual("abcdefghijklmnopqrstuvwxyz:modified", self.helper.modified_key)

    def test_cache_get(self):
        self.redis_client.hget.return_value = 123
        self.assertEqual(123, self.helper.cache_get("test_key"))
        self.redis_client.hget.assert_called_once_with(self.helper.hash_key, "test_key")

    def test_cache_get__not_redis(self):
        self.cache.client = mock.Mock()
        self.cache.get.return_value = 123
        self.assertEqual(123, self.helper.cache_get("test_key"))
        self.cache.get.assert_called_once_with("{}:{}".format(self.helper.hash_key, "test_key"))

    def test_cache_set(self):
        self.helper.cache_set("test_key", 123)
        self.redis_client.hset.assert_called_once_with(self.helper.hash_key, "test_key", 123)

    def test_cache_set__not_redis(self):
        self.cache.client = mock.Mock()
        self.helper.cache_set("test_key", 123)
        self.cache.set.assert_called_once_with("{}:{}".format(self.helper.hash_key, "test_key"), 123)

    def test_get_size(self):
        with mock.patch.object(self.helper, 'cache_get') as cache_get:
            cache_get.return_value = 123
            self.assertEqual(123, self.helper.get_size())
            cache_get.assert_called_once_with(self.helper.size_key)

    def test_set_size(self):
        with mock.patch.object(self.helper, 'cache_set') as cache_set:
            self.helper.set_size(123)
            cache_set.assert_called_once_with(self.helper.size_key, 123)

    def test_get_modified(self):
        with mock.patch.object(self.helper, 'cache_get') as cache_get:
            cache_get.return_value = '2021-01-01 00:00:00'
            modified = self.helper.get_modified()
            self.assertIsNotNone(modified)
            self.assertEqual('2021-01-01T00:00:00', modified.isoformat())
            cache_get.assert_called_once_with(self.helper.modified_key)

    def test_set_modified(self):
        with mock.patch.object(self.helper, 'cache_set') as cache_set:
            self.helper.set_modified('2021-01-01 00:00:00')
            cache_set.assert_called_once_with(self.helper.modified_key, '2021-01-01 00:00:00')


class ResourceSizeHelperTestCase(BaseTestCase):
    def setUp(self):
        super(ResourceSizeHelperTestCase, self).setUp()
        self.root = self.channel.main_tree
        self.helper = ResourceSizeHelper(self.root)

    def test_get_size(self):
        self.assertEqual(10, self.helper.get_size())

    def test_get_size__root_node_simplification(self):
        self.assertEqual(10, self.helper.get_size())
        with mock.patch.object(self.root, 'is_root_node') as is_root_node:
            is_root_node.return_value = False
            self.assertEqual(10, self.helper.get_size())

    def test_modified_since(self):
        max_modified = self.helper.queryset.aggregate(max_modified=Max(F('modified')))['max_modified']
        before_max = max_modified - datetime.timedelta(seconds=1)
        after_max = max_modified + datetime.timedelta(seconds=1)
        self.assertTrue(self.helper.modified_since(before_max.isoformat()))
        self.assertFalse(self.helper.modified_since(after_max.isoformat()))


@mock.patch("contentcuration.utils.nodes.ResourceSizeHelper")
@mock.patch("contentcuration.utils.nodes.ResourceSizeCache")
class CalculateResourceSizeTestCase(SimpleTestCase):
    def setUp(self):
        super(CalculateResourceSizeTestCase, self).setUp()
        self.node = mock.Mock(spec_set=ContentNode())

    def assertCalculation(self, cache, helper, force=False):
        helper().get_size.return_value = 456
        now_val = isoparse('2021-01-01T00:00:00')
        with mock.patch("contentcuration.utils.nodes.timezone.now") as now:
            now.return_value = now_val
            size, stale = calculate_resource_size(self.node, force=force)
        self.assertEqual(456, size)
        self.assertFalse(stale)
        cache().set_size.assert_called_once_with(456)
        cache().set_modified.assert_called_once_with(now_val)

    def test_cached(self, cache, helper):
        cache().get_size.return_value = 123
        cache().get_modified.return_value = '2021-01-01 00:00:00'
        helper().modified_since.return_value = False
        size, stale = calculate_resource_size(self.node)
        self.assertEqual(123, size)
        self.assertFalse(stale)

    def test_stale__too_big__no_force(self, cache, helper):
        self.node.rght = STALE_MAX_CALCULATION_SIZE + 1
        cache().get_size.return_value = 123
        cache().get_modified.return_value = '2021-01-01 00:00:00'
        helper().modified_since.return_value = True
        size, stale = calculate_resource_size(self.node)
        self.assertEqual(123, size)
        self.assertTrue(stale)

    def test_stale__too_big__forced(self, cache, helper):
        self.node.rght = STALE_MAX_CALCULATION_SIZE + 1
        helper().modified_since.return_value = True
        self.assertCalculation(cache, helper, force=True)

    def test_missing__too_big__no_force(self, cache, helper):
        self.node.rght = STALE_MAX_CALCULATION_SIZE + 1
        cache().get_size.return_value = None
        cache().get_modified.return_value = None
        size, stale = calculate_resource_size(self.node)
        self.assertIsNone(size)
        self.assertTrue(stale)

    def test_missing__too_big__forced(self, cache, helper):
        self.node.rght = STALE_MAX_CALCULATION_SIZE + 1
        self.assertCalculation(cache, helper, force=True)

    def test_missing__small(self, cache, helper):
        self.node.rght = 1
        cache().get_size.return_value = None
        cache().get_modified.return_value = None
        self.assertCalculation(cache, helper)


class CalculateResourceSizeIntegrationTestCase(BaseTestCase):
    """
    Integration test case
    """
    def setUp(self):
        super(CalculateResourceSizeIntegrationTestCase, self).setUp()
        self.root = self.channel.main_tree

    def test_small(self):
        size, stale = calculate_resource_size(self.root)
        self.assertEqual(10, size)
        self.assertFalse(stale)

        # again, should be cached
        size, stale = calculate_resource_size(self.root)
        self.assertEqual(10, size)
        self.assertFalse(stale)
