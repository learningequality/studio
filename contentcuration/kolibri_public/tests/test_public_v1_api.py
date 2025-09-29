from django.conf import settings
from django.core.cache import cache
from django.urls import reverse

from contentcuration.tests.base import BaseAPITestCase
from contentcuration.tests.testdata import generated_base64encoding


class PublicAPITestCase(BaseAPITestCase):
    """
    IMPORTANT: These tests are to never be changed. They are enforcing a
    public API contract. If the tests fail, then the implementation needs
    to be changed, and not the tests themselves.
    """

    def setUp(self):
        super(PublicAPITestCase, self).setUp()
        self.channel_list_url = reverse(
            "get_public_channel_list", kwargs={"version": "v1"}
        )
        cache.clear()

    def test_info_endpoint(self):
        """
        Test that the public info endpoint returns the correct identifying information
        about Studio.
        """
        response = self.client.get(reverse("info"))
        self.assertEqual(response.data["application"], "studio")
        self.assertEqual(response.data["device_name"], "Kolibri Studio")
        self.assertEqual(
            response.data["instance_id"], "ef896e7b7bbf5a359371e6f7afd28742"
        )

    def test_empty_public_channels(self):
        """
        Ensure that we get a valid, but empty, JSON response when there are no
        public channels.
        """
        response = self.get(self.channel_list_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

        self.assertEqual(
            response["Cache-Control"],
            "max-age={}".format(settings.PUBLIC_CHANNELS_CACHE_DURATION),
        )
        # we can't test the Vary header, because it will not match what we set it to
        # see info in contentcuration.decorators.cache_no_user_data notes.

    def test_public_channels_endpoint(self):
        """
        Test that the public channels endpoint returns information about
        public channels and that this information is correct.
        """

        # call with an empty list first to make sure we get a cached version
        response = self.get(self.channel_list_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

        self.channel.public = True
        self.channel.thumbnail_encoding = {"base64": generated_base64encoding()}
        self.channel.main_tree.published = True
        self.channel.main_tree.save()
        # this will clear the channel cache, so the next call should return the updated version
        self.channel.save()

        response = self.client.get(self.channel_list_url)
        self.assertEqual(response.status_code, 200)

        assert len(response.data) == 1
        first_channel = response.data[0]
        self.assertEqual(first_channel["name"], self.channel.name)
        self.assertEqual(first_channel["id"], self.channel.id)
        self.assertEqual(first_channel["icon_encoding"], generated_base64encoding())
