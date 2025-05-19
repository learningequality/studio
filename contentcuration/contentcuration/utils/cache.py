import functools
import math
import random
import time
from datetime import datetime

from dateutil.parser import isoparse
from django.core.cache import cache as django_cache
from django_redis.client import DefaultClient
from django_redis.client.default import _main_exceptions


DEFERRED_FLAG = "__DEFERRED"


def cache_stampede(expire, beta=1):
    """Cache decorator with cache stampede protection.
    Based on http://www.vldb.org/pvldb/vol8/p886-vattani.pdf (research by
    Vattani, A.; Chierichetti, F.; Lowenstein, K. (2015), Optimal Probabilistic
    Cache Stampede Prevention, VLDB, pp. 886-897, ISSN 2150-8097) and the
    Python implementation at
    https://github.com/grantjenks/python-diskcache/blob/master/diskcache/recipes.py#L315

    The cache stampede problem (also called dog-piling, cache miss storm,
    or cache choking) is a situation that occurs when a popular cache item
    expires, leading to multiple requests seeing a cache miss and
    regenerating that same item at the same time

    This  decorator implements cache stampede protection through
    early recomputation. Early recomputation of function results will occur
    probabilistically before expiration in a background thread of
    execution.

    IMPORTANT:
    The decorated function must have the cache key as its first parameter.

    :param float expire: seconds until arguments expire
    :param int beta: the parameter beta can be set to a value greater than 1 to
                     favor earlier recomputations and further reduce stampedes but
                     the paper authors show that setting beta=1 works well in practice
    :return: callable decorator
    """

    def decorator(func):
        def timer(*args, **kwargs):
            "Time execution of `func` and return result and time delta."
            start = time.time()
            result = func(*args, **kwargs)
            delta = time.time() - start
            # The variable delta represents the time to recompute the value
            # and is used to scale the probability distribution appropriately.
            return result, delta

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            key = args[0]
            cached = django_cache.get(key)
            if cached is not None:
                metadata = cached["METADATA"]
                if cached["CALCULATING"]:
                    return metadata
                expire_time = cached["EXPIRE"]
                now = time.time()
                ttl = expire_time - now
                delta = cached["DELTA"]
                if (-delta * math.log(random.random())) < ttl:
                    return metadata  # Cache hit.
            metadata, delta = timer(*args, *kwargs)
            cached_info = {
                "CALCULATING": False,
                "METADATA": metadata,
                "DELTA": delta,
                "EXPIRE": time.time() + expire,
            }
            django_cache.set(key, cached_info, timeout=None)

        return wrapper

    return decorator


def delete_cache_keys(key_pattern):
    """
    Deletes all cache keys that match key_pattern, if found.

    Note that not all cache backends support wildcards, or have a way to retrieve all keys.
    In this case, this function will just check if the key specified by key_pattern exists,
    and delete it if so.

    :param key_pattern: A string with a key name, can contain wildcard (*) characters
    :param for_view:
    :return: Number of keys deleted
    """
    if hasattr(django_cache, "delete_pattern"):
        return django_cache.delete_pattern(key_pattern)
    if django_cache.has_key(key_pattern):  # noqa: W601
        django_cache.delete(key_pattern)
        return 1
    return 0


def delete_public_channel_cache_keys():
    """
    Delete all caches related to the public channel caching.
    """
    from contentcuration.views.base import PUBLIC_CHANNELS_CACHE_KEYS

    delete_cache_keys("*get_public_channel_list*")
    delete_cache_keys("*get_user_public_channels*")
    django_cache.delete_many(list(PUBLIC_CHANNELS_CACHE_KEYS.values()))


def redis_retry(func):
    """
    This decorator wraps a function using the lower level Redis client to mimic functionality
    that occurs in the DefaultClient. It attempts a retry for certain exceptions, which this
    catches and retries once

    @see django_redis.client.default.DefaultClient
    """

    def redis_retry_func(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except _main_exceptions:
            # try one more time
            return func(*args, **kwargs)

    return redis_retry_func


FILE_MODIFIED = -1


class ResourceSizeCache:
    """
    Helper class for managing Resource size cache.

    If the django_cache is Redis, then we use the lower level Redis client to use
    its hash commands, HSET and HGET, to ensure we can store lots of data in performant way
    """

    def __init__(self, node, cache=None):
        self.node = node
        self.cache = cache or django_cache

    @classmethod
    def reset_modified_for_file(cls, file, modified=FILE_MODIFIED):
        """
        :type file: contentcuration.models.File
        :type modified: datetime|None|FILE_MODIFIED
        """
        if not file.contentnode_id:
            return
        cache = ResourceSizeCache(file.contentnode.get_root())
        cache.reset_modified(file.modified if modified == FILE_MODIFIED else modified)

    @property
    def redis_client(self):
        """
        Gets the lower level Redis client, if the cache is a Redis cache

        :rtype: redis.client.StrictRedis
        """
        redis_client = None
        cache_client = getattr(self.cache, "client", None)
        if isinstance(cache_client, DefaultClient):
            redis_client = cache_client.get_client(write=True)
        return redis_client

    @property
    def hash_key(self):
        # only first four characters
        return "resource_size:{}".format(self.node.pk[:4])

    @property
    def size_key(self):
        return "{}:value".format(self.node.pk)

    @property
    def modified_key(self):
        return "{}:modified".format(self.node.pk)

    @redis_retry
    def cache_get(self, key):
        if self.redis_client is not None:
            # notice use of special `HGET`
            # See: https://redis.io/commands/hget
            return self.redis_client.hget(self.hash_key, key)
        return self.cache.get("{}:{}".format(self.hash_key, key))

    @redis_retry
    def cache_set(self, key, val):
        if self.redis_client is not None:
            # notice use of special `HSET` and `HDEL`
            # See: https://redis.io/commands/hset
            # See: https://redis.io/commands/hdel
            if val is None:
                return self.redis_client.hdel(self.hash_key, key)
            return self.redis_client.hset(self.hash_key, key, val)
        return self.cache.set("{}:{}".format(self.hash_key, key), val)

    def get_size(self):
        size = self.cache_get(self.size_key)
        return int(size) if size else size

    def get_modified(self):
        modified = self.cache_get(self.modified_key)
        return isoparse(modified) if modified is not None else modified

    def set_size(self, size):
        return self.cache_set(self.size_key, size)

    def set_modified(self, modified):
        return self.cache_set(
            self.modified_key,
            modified.isoformat() if isinstance(modified, datetime) else modified,
        )

    def reset_modified(self, modified):
        """
        Sets modified if it's less than the existing, otherwise sets None if not a datetime
        :param modified: A datetime or None
        """
        if not isinstance(modified, datetime):
            return self.set_modified(None)

        current_modified = self.get_modified()
        if current_modified and current_modified > modified:
            return self.set_modified(modified)
