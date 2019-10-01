from base import BaseAPITestCase
from django.core.urlresolvers import reverse
from testdata import generated_base64encoding


class PublicAPITestCase(BaseAPITestCase):
    """
    IMPORTANT: These tests are to never be changed. They are enforcing a
    public API contract. If the tests fail, then the implementation needs
    to be changed, and not the tests themselves.
    """

    def setUp(self):
        super(PublicAPITestCase, self).setUp()
        self.channel_list_url = reverse('get_public_channel_list', kwargs={'version': 'v1'})

    def test_info_endpoint(self):
        """
        Test that the public info endpoint returns the correct identifying information
        about Studio.
        """
        response = self.client.get(reverse('info'))
        self.assertEqual(response.data['application'], 'studio')
        self.assertEqual(response.data['device_name'], 'Kolibri Studio')

    def test_empty_public_channels(self):
        """
        Ensure that we get a valid, but empty, JSON response when there are no
        public channels.
        """
        response = self.get(self.channel_list_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_public_channels_endpoint(self):
        """
        Test that the public channels endpoint returns information about
        public channels and that this information is correct.
        """
        self.channel.public = True
        self.channel.thumbnail_encoding = {'base64': generated_base64encoding()}
        self.channel.main_tree.published = True
        self.channel.main_tree.save()
        self.channel.save()

        response = self.client.get(self.channel_list_url)
        self.assertEqual(response.status_code, 200)

        assert len(response.data) == 1
        first_channel = response.data[0]
        self.assertEqual(first_channel['name'], self.channel.name)
        self.assertEqual(first_channel['id'], self.channel.id)
        self.assertEqual(first_channel['icon_encoding'], generated_base64encoding())
