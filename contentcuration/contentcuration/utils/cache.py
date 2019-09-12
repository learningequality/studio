from django.core.cache import cache


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
    if hasattr(cache, 'delete_pattern'):
        return cache.delete_pattern(key_pattern)
    elif cache.has_key(key_pattern):
        cache.delete(key_pattern)
        return 1
    return 0


def delete_public_channel_cache_keys():
    """
    Delete all caches related to the public channel caching.
    """
    delete_cache_keys('*get_public_channel_list*')
    delete_cache_keys('*get_user_public_channels*')
