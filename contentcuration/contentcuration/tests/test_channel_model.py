#!/usr/bin/env python

from django.test import TestCase

from contentcuration.models import Channel
from .base import StudioTestCase
from .testdata import channel


class PublicChannelsTestCase(StudioTestCase):

    def test_channel_get_public_channels_only_returns_public_channels(self):
        """
        Check that Channel.get_public_channels() only returns public channels.
        """
        for c in Channel.get_public_channels():
            assert c.public

    def test_channel_make_public_makes_the_current_channel_public(self):
        c = channel()
        c.make_public()
        assert c.public
    # TODO(aron): test the bypass_signals arg to make_public
