#!/usr/bin/env python

from django.test import TestCase

from contentcuration.models import Channel


class PublicChannelsTestCase(TestCase):

    def test_channel_get_public_channels_only_returns_public_channels(self):
        """
        Check that Channel.get_public_channels() only returns public channels.
        """
        for c in Channel.get_public_channels():
            assert c.public
