from base import BaseAPITestCase
from django.core.urlresolvers import reverse


class PublicAPITestCase(BaseAPITestCase):
    """
    IMPORTANT: These tests are to never be changed. They are enforcing a
    public API contract. If the tests fail, then the implementation needs
    to be changed, and not the tests themselves.
    """

    def setUp(self):
        super(PublicAPITestCase, self).setUp()

    def test_info_endpoint(self):
        response = self.client.get(reverse('info'))
        self.assertEqual(response.data['application'], 'studio')
        self.assertEqual(response.data['device_name'], 'Kolibri Studio')
