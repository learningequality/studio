#!/usr/bin/env python
#
# Utilities related to caching expensive endpoints.
#

from django.core.cache import cache

from contentcuration.models import Channel

class ChannelCacher(object):
    """
    A proxy to the Channel object that caches return values for
    expensive queries.
    """

    PUBLIC_CHANNEL_CACHE_KEY = "public_channel_cache"
    PUBLIC_CHANNEL_CACHE_TIMEOUT = 60 # seconds

    @classmethod
    def get_public_channels(cls):
        return cache.get_or_set(
            cls.PUBLIC_CHANNEL_CACHE_KEY,
            cls.regenerate_public_channel_cache,
            cls.PUBLIC_CHANNEL_CACHE_TIMEOUT
        )

    @classmethod
    def regenerate_public_channel_cache(cls):
        """
        Invalidate and recalculate the list of public channels and their attributes.
        Returns the new list of public channels.

        """
        channels = list(Channel.get_public_channels())
        cache.set(cls.PUBLIC_CHANNEL_CACHE_KEY, channels)

        return channels
