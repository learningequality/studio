from __future__ import absolute_import

import datetime
import json

import pytz
from django.conf import settings
from django.core.cache import cache
from mock import patch
from rest_framework.reverse import reverse

from .base import BaseAPITestCase
from .testdata import tree
from contentcuration.models import Channel


class NodeViewsUtilityTestCase(BaseAPITestCase):
    def test_get_channel_details(self):
        url = reverse('get_channel_details', [self.channel.id])
        response = self.get(url)

        details = json.loads(response.content)
        assert details['resource_count'] > 0
        assert details['resource_size'] > 0
        assert len(details['kind_count']) > 0

    def test_get_channel_details_cached(self):
        cache_key = "details_{}".format(self.channel.main_tree.id)

        # force the cache to update by adding a very old cache entry. Since Celery tasks run sync in the test suite,
        # get_channel_details will return an updated cache value rather than generate it async.
        data = {"last_update": pytz.utc.localize(datetime.datetime(1990, 1, 1)).strftime(settings.DATE_TIME_FORMAT)}
        cache.set(cache_key, json.dumps(data))

        with patch("contentcuration.views.nodes.getnodedetails_task") as task_mock:
            url = reverse('get_channel_details', [self.channel.id])
            self.get(url)
            # Check that the outdated cache prompts an asynchronous cache update
            task_mock.apply_async.assert_called_once_with((self.channel.main_tree.id,))


class GetTopicDetailsEndpointTestCase(BaseAPITestCase):
    def test_200_post(self):
        response = self.get(
            reverse("get_channel_details", kwargs={"channel_id": self.channel.id})
        )
        self.assertEqual(response.status_code, 200)

    def test_404_no_permission(self):
        new_channel = Channel.objects.create()
        new_channel.main_tree = tree()
        new_channel.save()
        response = self.get(
            reverse("get_channel_details", kwargs={"channel_id": new_channel.id}),
        )
        self.assertEqual(response.status_code, 404)
