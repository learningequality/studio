import uuid
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from contentcuration.models import Channel, SecretToken
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase

class SupportTokenRedirectTestCase(StudioAPITestCase):

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
        super(SupportTokenRedirectTestCase, self).setUp()
        
        self.user = testdata.user()
        self.user.is_admin = True
        self.user.save()

        self.channel = Channel.objects.create(actor_id=self.user.id, **self.channel_metadata)

        self.valid_token_str = "bepud-dibub-dizok"
        self.support_token = SecretToken.objects.create(token=self.valid_token_str)
        
        self.channel.secret_tokens.add(self.support_token)
        self.channel.support_token = self.support_token
        self.channel.save()
        
        self.client.force_authenticate(user=self.user)

    def test_valid_token_redirects_to_channel(self):
        """
        Test that a valid token redirects to the correct channel page.
        """
        url = reverse("support_token_redirect", kwargs={"token": self.valid_token_str})
        response = self.client.get(url, format="json")


        self.assertEqual(response.status_code, status.HTTP_302_FOUND)  # 302 Redirect
        self.assertEqual(response.url, f"/channels/{self.channel.id}")
