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
    #

class ChannelTokenTestCase(StudioTestCase):

    def setUp(self):
        super(ChannelTokenTestCase, self).setUp()

        self.channel = channel()

    def test_make_token_creates_human_token(self):
        """
        Test that we create a new primary token for a channel.
        """
        token = self.channel.make_token()

        # test that the new token is a string
        assert isinstance(token.token, str)
        # this string should not be empty
        assert token.token
        # this string should be equivalent to the human token
        assert self.channel.get_human_token().token == token.token

    def test_make_token_creates_channel_id_token(self):
        """
        Check that we create a new token with the channel's id as the token string.
        """
        self.channel.make_token()

        assert self.channel.get_channel_id_token().token == self.channel.id
