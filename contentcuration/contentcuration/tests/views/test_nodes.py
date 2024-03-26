import datetime
import json

import pytz
from django.conf import settings
from django.core.cache import cache
from django.urls import reverse
from mock import Mock
from mock import patch

from contentcuration.tasks import generatenodediff_task
from contentcuration.tests.base import BaseAPITestCase


class NodesViewsTestCase(BaseAPITestCase):
    def test_get_node_diff__missing_contentnode(self):
        response = self.get(reverse("get_node_diff", kwargs=dict(updated_id="abc123", original_id="def456")))
        self.assertEqual(response.status_code, 404)

    def test_get_node_diff__no_task_processing(self):
        pk = self.channel.main_tree.pk
        response = self.get(reverse("get_node_diff", kwargs=dict(updated_id=pk, original_id=pk)))
        self.assertEqual(response.status_code, 404)

    @patch.object(generatenodediff_task, 'find_incomplete_ids')
    def test_get_node_diff__task_processing(self, mock_find_incomplete_ids):
        qs = Mock(spec="django.db.models.query.QuerySet")
        mock_find_incomplete_ids.return_value = qs()
        mock_find_incomplete_ids.return_value.exists.return_value = True

        pk = self.channel.main_tree.pk
        response = self.get(reverse("get_node_diff", kwargs=dict(updated_id=pk, original_id=pk)))
        self.assertEqual(response.status_code, 302)

    def test_get_channel_details(self):
        url = reverse('get_channel_details', kwargs={"channel_id": self.channel.id})
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
            url = reverse('get_channel_details', kwargs={"channel_id": self.channel.id})
            self.get(url)
            # Check that the outdated cache prompts an asynchronous cache update
            task_mock.enqueue.assert_called_once_with(self.user, node_id=self.channel.main_tree.id)


class ChannelDetailsEndpointTestCase(BaseAPITestCase):
    def test_200_post(self):
        response = self.get(
            reverse("get_channel_details", kwargs={"channel_id": self.channel.id})
        )
        self.assertEqual(response.status_code, 200)

    def test_404_no_permission(self):
        self.channel.editors.remove(self.user)
        response = self.get(
            reverse("get_channel_details", kwargs={"channel_id": self.channel.id}),
        )
        self.assertEqual(response.status_code, 404)
