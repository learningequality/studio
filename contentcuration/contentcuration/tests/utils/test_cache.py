import mock
from django.test import SimpleTestCase

from ..helpers import mock_class_instance
from contentcuration.utils.cache import ResourceSizeCache


class ResourceSizeCacheTestCase(SimpleTestCase):
    def setUp(self):
        super(ResourceSizeCacheTestCase, self).setUp()
        self.node = mock_class_instance("contentcuration.models.ContentNode")
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
        self.assertEqual(
            "abcdefghijklmnopqrstuvwxyz:modified", self.helper.modified_key
        )

    def test_cache_get(self):
        self.redis_client.hget.return_value = 123
        self.assertEqual(123, self.helper.cache_get("test_key"))
        self.redis_client.hget.assert_called_once_with(self.helper.hash_key, "test_key")

    def test_cache_get__not_redis(self):
        self.cache.client = mock.Mock()
        self.cache.get.return_value = 123
        self.assertEqual(123, self.helper.cache_get("test_key"))
        self.cache.get.assert_called_once_with(
            "{}:{}".format(self.helper.hash_key, "test_key")
        )

    def test_cache_set(self):
        self.helper.cache_set("test_key", 123)
        self.redis_client.hset.assert_called_once_with(
            self.helper.hash_key, "test_key", 123
        )

    def test_cache_set__delete(self):
        self.helper.cache_set("test_key", None)
        self.redis_client.hdel.assert_called_once_with(self.helper.hash_key, "test_key")

    def test_cache_set__not_redis(self):
        self.cache.client = mock.Mock()
        self.helper.cache_set("test_key", 123)
        self.cache.set.assert_called_once_with(
            "{}:{}".format(self.helper.hash_key, "test_key"), 123
        )

    def test_get_size(self):
        with mock.patch.object(self.helper, "cache_get") as cache_get:
            cache_get.return_value = 123
            self.assertEqual(123, self.helper.get_size())
            cache_get.assert_called_once_with(self.helper.size_key)

    def test_set_size(self):
        with mock.patch.object(self.helper, "cache_set") as cache_set:
            self.helper.set_size(123)
            cache_set.assert_called_once_with(self.helper.size_key, 123)

    def test_get_modified(self):
        with mock.patch.object(self.helper, "cache_get") as cache_get:
            cache_get.return_value = "2021-01-01 00:00:00"
            modified = self.helper.get_modified()
            self.assertIsNotNone(modified)
            self.assertEqual("2021-01-01T00:00:00", modified.isoformat())
            cache_get.assert_called_once_with(self.helper.modified_key)

    def test_set_modified(self):
        with mock.patch.object(self.helper, "cache_set") as cache_set:
            self.helper.set_modified("2021-01-01 00:00:00")
            cache_set.assert_called_once_with(
                self.helper.modified_key, "2021-01-01 00:00:00"
            )
