from __future__ import absolute_import

from django.urls import reverse

from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase


class SearchViewsetTestCase(StudioAPITestCase):

    def test_filter_exclude_channels(self):
        user = testdata.user()
        self.client.force_authenticate(user=user)
        channel = testdata.channel()
        channel.editors.add(user)
        response = self.client.get(
            reverse("search-list"), data={"exclude_channel": channel.id}, format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["results"], [])

    def test_filter_channels_by_edit(self):
        user = testdata.user()
        self.client.force_authenticate(user=user)
        channel = testdata.channel()
        channel.editors.add(user)
        response = self.client.get(
            reverse("search-list"), data={"channel_list": "edit"}, format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertNotEqual(response.data["results"], [])
