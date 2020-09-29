import functools
import math
import random
import time

from django.core.cache import cache
from django.db.models import Count
from django.db.models import Sum
from django_cte import With

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import FileCTE
from contentcuration.models import User

CACHE_CHANNEL_KEY = "channel_metadata_{}"


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

    If name is set to None (default), the callable name will be determined
    automatically.
    The original underlying function is accessible through the `__wrapped__`
    attribute. This is useful for introspection, for bypassing the cache, or
    for rewrapping the function with a different cache.
    :param str key: key used to store the value in the cache
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
            channel_id = args[0]
            key = CACHE_CHANNEL_KEY.format(channel_id)
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


@cache_stampede(expire=3600)
def calculate_channel_metadata(channel_id=None, tree_id=None):
    if channel_id is None and tree_id is None:
        return  # this is an error, it should not happen, but just in case

    if channel_id is None:
        channel_id = Channel.objects.filter(main_tree__tree_id=tree_id).values_list(
            "id", flat=True
        )[0]

    key = CACHE_CHANNEL_KEY.format(channel_id)
    cached_info = cache.get(key)
    if cached_info is not None:
        if cached_info["CALCULATING"]:
            return  # the task is already queued
    # the key will expire if the task is not achieved in one hour
    cache.set(key, {"CALCULATING": True}, timeout=3600)

    if tree_id is None:
        tree_id = Channel.objects.get(id=channel_id).main_tree.id

    nodes = With(
        ContentNode.objects.values("id", "tree_id").filter(tree_id=tree_id).order_by(),
        name="nodes",
    )
    size_sum = (
        nodes.join(FileCTE, contentnode_id=nodes.col.id)
        .values("checksum", "file_size")
        .with_cte(nodes)
        .distinct()
        .aggregate(Sum("file_size"))
    )
    size = size_sum["file_size__sum"] or 0

    editors = (
        User.objects.filter(editable_channels__id=channel_id)
        .values_list("id", flat=True)
        .distinct()
        .aggregate(Count("id"))
    )
    editors_count = editors["id__count"] or 0

    viewers = (
        User.objects.filter(view_only_channels__id=channel_id)
        .values_list("id", flat=True)
        .distinct()
        .aggregate(Count("id"))
    )
    viewers_count = viewers["id__count"] or 0

    # 1 day timeout, pending to review, maybe 0 (forever):
    metadata = {
        "size": size,
        "editors_count": editors_count,
        "viewers_count": viewers_count,
    }
    return metadata
