import functools
import math
import random
import time

from django.core.cache import cache


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
            cached = cache.get(key)
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
            cache.set(key, cached_info, timeout=None)

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
    if hasattr(cache, "delete_pattern"):
        return cache.delete_pattern(key_pattern)
    elif cache.has_key(key_pattern):
        cache.delete(key_pattern)
        return 1
    return 0


def delete_public_channel_cache_keys():
    """
    Delete all caches related to the public channel caching.
    """
    delete_cache_keys("*get_public_channel_list*")
    delete_cache_keys("*get_user_public_channels*")
