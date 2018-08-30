#!/usr/bin/env python
#
# These are tests for the ChannelCache class.
#

from django.test import TestCase

from contentcuration.utils.channelcache import ChannelCacher
from contentcuration.models import Channel

from .base import StudioTestCase
from .testdata import channel


class ChannelCacherTestCase(StudioTestCase):

    NUM_INITIAL_PUBLIC_CHANNELS = 2

    def setUp(self):
        super(ChannelCacherTestCase, self).setUp()

        self.channels = []
        for _ in range(self.NUM_INITIAL_PUBLIC_CHANNELS):
            c = channel().make_public(bypass_signals=True)
            self.channels.append(c)


    def test_returns_public_channels(self):
        """
        Returns the list of public channels.
        """

        channels = ChannelCacher.get_public_channels()

        assert (self.channels   # the channels we know are public...
                == channels)    # ...should be present in get_public_channels

    def test_new_public_channel_not_in_cache(self):
        """
        Check that our cache is indeed a cache by not returning any new public
        channels created after regenerating our cache.
        """

        # force fill our public channel cache
        ChannelCacher.regenerate_public_channel_cache()
        # create our new channel and bypass signals when creating it
        new_public_channel = channel()
        new_public_channel.make_public(bypass_signals=True)
        # fetch our cached channel list
        cached_channels = ChannelCacher.get_public_channels()
        # make sure our new public channel isn't in the cache
        assert new_public_channel not in cached_channels


class ChannelTokenCacheTestCase(StudioTestCase):
    """
    Tests for caching tokens using the ChannelSpecificCacher proxy object.
    """

    def setUp(self):
        super(ChannelTokenCacheTestCase, self).setUp()
        self.channel = channel()

    def test_channel_get_human_token_returns_token_if_present(self):
        """
        Check that cache.get_human_token() returns the same thing as
        the real channel.get_human_token().
        """
        c = self.channel
        c.make_token()

        ccache = ChannelCacher.for_channel(c)

        assert ccache.get_human_token() == c.get_human_token()

    def test_channel_get_channel_id_token_returns_channel_id_token(self):
        """
        Check that cache.get_channel_id_token() returns the same thing as
        the real channel.get_channel_id_token().
        """
        c = self.channel
        c.make_token()

        ccache = ChannelCacher.for_channel(c)

        assert ccache.get_channel_id_token() == c.get_channel_id_token()


class ChannelResourceCountCacheTestCase(StudioTestCase):
    pass
