import uuid
from django.urls import reverse
from rest_framework import status
from contentcuration.models import Channel, SecretToken
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioTestCase

class SupportTokenRedirectTestCase(StudioTestCase):

    @classmethod
    def setUpClass(cls):
        super(SupportTokenRedirectTestCase, cls).setUpClass()

    @property
    def channel_metadata(self):
        return {
            "name": "Test Channel",
            "id": uuid.uuid4().hex,
            "description": "A test channel for support token creation.",
        }

    def setUp(self):
        """
        Set up test data before running each test.
        """
        self.setUpBase()

        self.user.is_admin = True
        self.user.save()

        self.channel = Channel.objects.create(actor_id=self.user.id, **self.channel_metadata)

        self.valid_token_str = "bepud-dibub-dizok"
        self.support_token = SecretToken.objects.create(token=self.valid_token_str)

        self.channel.secret_tokens.add(self.support_token)
        self.channel.support_token = self.support_token
        self.channel.save()
        
        self.client = self.admin_client()

    def test_valid_token_redirects_to_channel(self):
        """
        Test that a valid token redirects to the correct channel page.
        """
        url = reverse("support_token_redirect", kwargs={"token": self.valid_token_str})
        response = self.client.get(url, format="json")

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertEqual(response.url, f"channels/{self.channel.id}")

    def test_invalid_token_format(self):
        """
        Test that an invalid token format returns 400 Bad Request.
        """
        url = reverse("support_token_redirect", kwargs={"token": "invalid_token_123"})
        response = self.client.get(url, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid token format", response.json()["Error"])

    def test_token_not_found(self):
        """
        Test that a non-existent token returns 404 Not Found.
        """
        url = reverse("support_token_redirect", kwargs={"token": "bepud-befud-bidup"})
        response = self.client.get(url, format="json")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("Invalid token", response.json()["Error"])

    
    def test_unauthorized_user_forbidden(self):
        """
        Test that a non-admin user gets 403 Forbidden.
        """
        self.client.logout()
        non_admin_user = testdata.user() 
        non_admin_user.is_admin = False 
        non_admin_user.save()
        self.client.force_login(non_admin_user)

        url = reverse("support_token_redirect", kwargs={"token": self.valid_token_str})
        response = self.client.get(url, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
