import json
import pytz

import datetime

from django.conf import settings
from django.core.cache import cache

from base import BaseAPITestCase
from mock import patch

from rest_framework.reverse import reverse

from contentcuration.views.nodes import get_topic_details


class NodeViewsUtilityTestCase(BaseAPITestCase):
    def test_get_topic_details(self):
        node_pk = self.channel.main_tree.pk
        url = reverse('get_topic_details', [node_pk])
        request = self.create_get_request(url)
        response = get_topic_details(request, node_pk)

        details = json.loads(response.content)
        assert details['resource_count'] > 0
        assert details['resource_size'] > 0
        assert details['kind_count'] > 0

    def test_get_topic_details_cached(self):
        node = self.channel.main_tree
        node_pk = self.channel.main_tree.pk
        cache_key = "details_{}".format(node.node_id)

        # force the cache to update by adding a very old cache entry. Since Celery tasks run sync in the test suite,
        # get_topic_details will return an updated cache value rather than generate it async.
        data = {"last_update": pytz.utc.localize(datetime.datetime(1990, 1, 1)).strftime(settings.DATE_TIME_FORMAT)}
        cache.set(cache_key, json.dumps(data))

        url = reverse('get_topic_details', [node_pk])
        request = self.create_get_request(url)
        response = get_topic_details(request, node_pk)

        # the response will contain the invalid cache entry that we set above, but if we retrieve the cache
        # now it will be updated with the correct values.
        cache_details = json.loads(cache.get(cache_key))
        assert cache_details['resource_count'] > 0
        assert cache_details['resource_size'] > 0
        assert cache_details['kind_count'] > 0
