import datetime
import json
from contextlib import contextmanager

import pytz
from django.conf import settings
from django.core.cache import cache
from django.urls import reverse
from mock import Mock
from mock import patch

from contentcuration.models import ContentNode
from contentcuration.tasks import generatenodediff_task
from contentcuration.tests.base import BaseAPITestCase


class NodesViewsTestCase(BaseAPITestCase):
    def tearDown(self):
        super().tearDown()
        cache.clear()

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


class DetailsTestCase(BaseAPITestCase):
    def setUp(self):
        super().setUp()
        self.default_details = {
            "resource_count": 5,
            "resource_size": 100,
            "kind_count": {"document": 3, "video": 2}
        }
        # see tree.json for where this comes from
        self.node = ContentNode.objects.get(node_id="00000000000000000000000000000001")
        # required by get_node_details
        self.channel.make_public()

    def tearDown(self):
        super().tearDown()
        cache.clear()

    def _set_cache(self, node, last_update=None):
        data = self.default_details.copy()
        if last_update is not None:
            data.update(last_update=pytz.utc.localize(last_update).strftime(settings.DATE_TIME_FORMAT))

        cache_key = "details_{}".format(node.node_id)
        cache.set(cache_key, json.dumps(data))

    @contextmanager
    def _check_details(self, node=None):
        endpoint = "get_channel_details" if node is None else "get_node_details"
        param = {"channel_id": self.channel.id} \
            if endpoint == "get_channel_details" \
            else {"node_id": node.id}
        url = reverse(endpoint, kwargs=param)
        response = self.get(url)
        print(response.content)
        details = json.loads(response.content)
        yield details

    def assertDetailsEqual(self, details, expected):
        self.assertEqual(details['resource_count'], expected['resource_count'])
        self.assertEqual(details['resource_size'], expected['resource_size'])
        self.assertEqual(details['kind_count'], expected['kind_count'])

    @patch("contentcuration.models.ContentNode.get_details")
    def test_get_channel_details__uncached(self, mock_get_details):
        mock_get_details.return_value = {
            "resource_count": 7,
            "resource_size": 200,
            "kind_count": {"document": 33, "video": 22}
        }
        with self._check_details() as details:
            self.assertDetailsEqual(details, mock_get_details.return_value)

        mock_get_details.assert_called_once_with(channel=self.channel)

    @patch("contentcuration.views.nodes.getnodedetails_task")
    def test_get_channel_details__cached(self, task_mock):
        # force the cache to update by adding a very old cache entry. Since Celery tasks run sync in the test suite,
        # get_channel_details will return an updated cache value rather than generate it async.
        self._set_cache(self.channel.main_tree, last_update=datetime.datetime(1990, 1, 1))

        with self._check_details() as details:
            # check cache was returned
            self.assertDetailsEqual(details, self.default_details)
            # Check that the outdated cache prompts an asynchronous cache update
            task_mock.enqueue.assert_called_once_with(self.user, node_id=self.channel.main_tree.id)

    @patch("contentcuration.views.nodes.getnodedetails_task")
    def test_get_channel_details__cached__not_updated__no_enqueue(self, task_mock):
        # nothing changed,
        self.channel.main_tree.get_descendants(include_self=False).update(changed=False)
        self._set_cache(self.channel.main_tree, last_update=datetime.datetime(1990, 1, 1))

        with self._check_details() as details:
            # check cache was returned
            self.assertDetailsEqual(details, self.default_details)
            task_mock.enqueue.assert_not_called()

    @patch("contentcuration.views.nodes.getnodedetails_task")
    def test_get_channel_details__cached__no_enqueue(self, task_mock):
        # test last update handling
        self._set_cache(self.channel.main_tree, last_update=datetime.datetime(2099, 1, 1))

        with self._check_details() as details:
            # check cache was returned
            self.assertDetailsEqual(details, self.default_details)
            task_mock.enqueue.assert_not_called()

    @patch("contentcuration.models.ContentNode.get_details")
    def test_get_node_details__uncached(self, mock_get_details):
        mock_get_details.return_value = {
            "resource_count": 7,
            "resource_size": 200,
            "kind_count": {"document": 33, "video": 22}
        }
        with self._check_details(node=self.node) as details:
            self.assertDetailsEqual(details, mock_get_details.return_value)

        mock_get_details.assert_called_once_with(channel=self.channel)

    @patch("contentcuration.views.nodes.getnodedetails_task")
    def test_get_node_details__cached(self, task_mock):
        # force the cache to update by adding a very old cache entry. Since Celery tasks run sync in the test suite,
        # get_channel_details will return an updated cache value rather than generate it async.
        self._set_cache(self.node, last_update=datetime.datetime(1990, 1, 1))

        with self._check_details(node=self.node) as details:
            # check cache was returned
            self.assertDetailsEqual(details, self.default_details)
            # Check that the outdated cache prompts an asynchronous cache update
            task_mock.enqueue.assert_called_once_with(self.user, node_id=self.node.pk)

    @patch("contentcuration.views.nodes.getnodedetails_task")
    def test_get_node_details__cached__not_updated__no_enqueue(self, task_mock):
        # nothing changed,
        self.channel.main_tree.get_descendants(include_self=False).update(changed=False)
        self._set_cache(self.node, last_update=datetime.datetime(1990, 1, 1))

        with self._check_details(node=self.node) as details:
            # check cache was returned
            self.assertDetailsEqual(details, self.default_details)
            task_mock.enqueue.assert_not_called()

    @patch("contentcuration.views.nodes.getnodedetails_task")
    def test_get_node_details__cached__no_enqueue(self, task_mock):
        # test last update handling
        self._set_cache(self.node, last_update=datetime.datetime(2099, 1, 1))

        with self._check_details(node=self.node) as details:
            # check cache was returned
            self.assertDetailsEqual(details, self.default_details)
            task_mock.enqueue.assert_not_called()


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
