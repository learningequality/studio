#!/usr/bin/env python
from datetime import datetime

from mixer.backend.django import mixer

from .base import StudioTestCase
from .testdata import channel
from .testdata import node
from contentcuration.models import Channel


class PublicChannelsTestCase(StudioTestCase):

    def test_channel_get_public_channels_only_returns_public_channels(self):
        """
        Check that Channel.get_public_channels() only returns public channels.
        """
        for c in Channel.get_public_channels():
            assert c.public

    def test_channel_make_public_makes_the_current_channel_public(self):
        c = channel()
        assert not c.public
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


class ChannelResourceCountTestCase(StudioTestCase):
    """
    Tests for channel.get_resource_count().
    """

    def setUp(self):
        super(ChannelResourceCountTestCase, self).setUp()
        self.channel = channel()

    def test_returns_an_integer(self):
        """
        Check that we return an integer in the happy case.
        """
        assert isinstance(self.channel.get_resource_count(), int)

    def test_increments_when_we_add_a_new_content_node(self):
        """
        Test that we increment our count when we add a new non-topic node.
        """
        count = self.channel.get_resource_count()
        tree = self.channel.main_tree

        # add a new video node
        node(
            parent=tree,
            data={
                "title": "New cat video",
                "kind_id": "video",
                "node_id": "nice"
            }
        )

        assert self.channel.get_resource_count() == count + 1

    def test_does_not_increment_when_we_add_a_topic(self):
        """
        Test that we don't increment our count when we add a topic node.
        """
        count = self.channel.get_resource_count()
        tree = self.channel.main_tree

        # add a new topic node
        node(
            parent=tree,
            data={
                "kind_id": "topic",
                "title": "topic node",
                "node_id": "nice",
                "children": [],
            }
        )

        # should be no difference in count
        assert self.channel.get_resource_count() == count


class ChannelGetDateModifiedTestCase(StudioTestCase):
    """
    Tests for channel.get_date_modified().
    """

    def setUp(self):
        super(ChannelGetDateModifiedTestCase, self).setUp()
        self.channel = channel()

    def test_returns_a_datetime(self):
        """
        Check that we return a datetime object in the ideal case.
        """
        assert isinstance(self.channel.get_date_modified(), datetime)

    def test_returns_date_newer_when_node_modified(self):
        old_date = self.channel.get_date_modified()
        # change the root node's title
        self.channel.main_tree.title = "new title"
        self.channel.main_tree.save()
        # check that the returned date is newer
        assert self.channel.get_date_modified() > old_date

    def test_returns_date_newer_when_node_added(self):
        old_date = self.channel.get_date_modified()
        # add a new node
        node(
            parent=self.channel.main_tree,
            data={
                "node_id": "nodez",
                "title": "new child",
                "kind_id": "video",
            }
        )
        # check that the returned date is newer
        assert self.channel.get_date_modified() > old_date


class GetAllChannelsTestCase(StudioTestCase):
    """
    Tests for Channel.get_all_channels().
    """

    def setUp(self):
        super(GetAllChannelsTestCase, self).setUp()

        # create 10 channels for comparison
        self.channels = mixer.cycle(10).blend(Channel)

    def test_returns_all_channels_in_the_db(self):
        """
        Check that all channels in self.channels are also created.
        """
        returned_channel_ids = [c.id for c in Channel.get_all_channels()]
        for c in self.channels:
            assert c.id in returned_channel_ids
