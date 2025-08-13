#!/usr/bin/env python
import json
from datetime import datetime

from django.urls import reverse_lazy

from .base import BaseAPITestCase
from .base import StudioTestCase
from .testdata import base64encoding
from .testdata import channel
from .testdata import node
from contentcuration.models import Channel
from contentcuration.models import ChannelSet
from contentcuration.models import generate_storage_url
from contentcuration.models import SecretToken
from contentcuration.tests.utils import mixer


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
            data={"title": "New cat video", "kind_id": "video", "node_id": "nice"},
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
            },
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
            data={"node_id": "nodez", "title": "new child", "kind_id": "video"},
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
        self.channels = [
            Channel.objects.create(actor_id=self.admin_user.id) for _ in range(10)
        ]

    def test_returns_all_channels_in_the_db(self):
        """
        Check that all channels in self.channels are also created.
        """
        returned_channel_ids = [c.id for c in Channel.get_all_channels()]
        for c in self.channels:
            assert c.id in returned_channel_ids


class ChannelSetTestCase(BaseAPITestCase):
    """
    Tests for ChannelSet functions.
    """

    def setUp(self):
        super(ChannelSetTestCase, self).setUp()
        self.channelset = mixer.blend(ChannelSet, editors=[self.user])
        self.channels = [
            Channel.objects.create(actor_id=self.user.id) for _ in range(10)
        ]
        for chann in self.channels:
            chann.secret_tokens.add(self.channelset.secret_token)
            chann.editors.add(self.user)

    def test_get_user_channel_sets(self):
        """ Make sure get_user_channel_sets returns the correct sets """
        other_channelset = mixer.blend(ChannelSet)
        response = self.get(reverse_lazy("channelset-list"))
        self.assertEqual(response.status_code, 200)
        channelsets = json.loads(response.content)
        self.assertTrue(any(c["id"] == self.channelset.pk for c in channelsets))
        self.assertFalse(any(c["id"] == other_channelset.pk for c in channelsets))

    def test_token_created_on_save(self):
        """ Make sure tokens are created on save only if the channel set is new """
        self.assertIsNotNone(self.channelset.secret_token)

        token = self.channelset.secret_token.token
        self.channelset.save()
        self.assertEqual(token, self.channelset.secret_token.token)

    def test_channelset_deletion(self):
        """ Make sure channels are preserved and tokens are deleted """
        token = self.channelset.secret_token.token
        channels = list(
            self.channelset.secret_token.channels.values_list("pk", flat=True)
        )
        self.channelset.delete()
        self.assertFalse(SecretToken.objects.filter(token=token).exists())
        self.assertTrue(
            Channel.objects.filter(pk__in=channels).count() == len(channels)
        )

    def test_save_channels_to_token(self):
        """ Check endpoint will assign token to channels """
        token = self.channelset.secret_token
        channels = [Channel.objects.create(actor_id=self.user.id) for _ in range(5)]
        channels = Channel.objects.filter(
            pk__in=[c.pk for c in channels]
        )  # Make this a queryset
        token.channels.set(channels)

        # Old channels should not be included here
        for c in self.channels:
            c.refresh_from_db()
            self.assertFalse(c.secret_tokens.filter(token=token.token).exists())

        # New channels should be included here
        for c in channels:
            c.refresh_from_db()
            self.assertTrue(c.secret_tokens.filter(token=token.token).exists())

    def test_public_endpoint(self):
        """ Make sure public endpoint returns all the channels under the token """
        published_channel_count = int(len(self.channels) // 2)
        for c in self.channels[:published_channel_count]:
            c.main_tree.published = True
            c.main_tree.save()

        token = self.channelset.secret_token.token
        response = self.get(
            reverse_lazy(
                "get_public_channel_lookup",
                kwargs={"version": "v1", "identifier": token},
            )
        )
        self.assertEqual(response.status_code, 200)
        channels = json.loads(response.content)
        self.assertEqual(len(channels), published_channel_count)

    def test_get_channels(self):
        """ Check channel set's get_channel method """
        channels = self.channelset.get_channels()
        channel_ids = [c.pk for c in self.channels]
        self.assertEqual(len(self.channels), channels.count())
        self.assertEqual(channels.exclude(pk__in=channel_ids).count(), 0)

    def test_channel_deletion(self):
        """ Check channel deletion doesn't delete collection """
        channel_id = self.channels[0].pk
        total_channels = len(self.channels)
        self.channels[0].delete()

        channels = self.channelset.get_channels()
        self.assertFalse(channels.filter(pk=channel_id).exists())
        self.assertEqual(channels.count(), total_channels - 1)


class ChannelMetadataSaveTestCase(StudioTestCase):
    """
    Tests for Channel.save functions.
    """

    def setUp(self):
        super(ChannelMetadataSaveTestCase, self).setUp()
        self.channels = [
            Channel.objects.create(actor_id=self.admin_user.id) for _ in range(5)
        ]
        for c in self.channels:
            c.main_tree.changed = False
            c.main_tree.save()

    def test_change_name(self):
        for c in self.channels:
            c.name = c.name + " - updated"
            c.save()

            c.main_tree.refresh_from_db()
            self.assertTrue(c.main_tree.changed)

    def test_change_description(self):
        for c in self.channels:
            c.description = c.description + " - updated"
            c.save()

            c.main_tree.refresh_from_db()
            self.assertTrue(c.main_tree.changed)

    def test_change_thumbnail(self):
        for c in self.channels:
            c.description = c.description + " - updated"
            c.save()

            c.main_tree.refresh_from_db()
            self.assertTrue(c.main_tree.changed)

    def test_change_thumbnail_encoding(self):
        for c in self.channels:
            c.thumbnail_encoding = {"new": "test"}
            c.save()

            c.main_tree.refresh_from_db()
            self.assertTrue(c.main_tree.changed)

    def test_change_language(self):
        for c in self.channels:
            c.language_id = "en"
            c.save()

            c.main_tree.refresh_from_db()
            self.assertTrue(c.main_tree.changed)

    def test_change_public(self):
        # Anything other than name, description, language, thumbnail, and thumbnail encoding should not set changed
        for c in self.channels:
            c.public = not c.public
            c.save()

            c.main_tree.refresh_from_db()
            self.assertFalse(c.main_tree.changed)


class ChannelGettersTestCase(BaseAPITestCase):
    def test_get_channel_thumbnail_default(self):
        default_thumbnail = "/static/img/kolibri_placeholder.png"
        thumbnail = self.channel.get_thumbnail()
        assert thumbnail == default_thumbnail

    def test_get_channel_thumbnail_base64(self):
        self.channel.thumbnail_encoding = {"base64": base64encoding()}

        assert self.channel.get_thumbnail() == base64encoding()

    def test_get_channel_thumbnail_file(self):
        thumbnail_url = "/path/to/thumbnail.png"
        self.channel.thumbnail = thumbnail_url

        assert self.channel.get_thumbnail() == generate_storage_url(thumbnail_url)
