import pytest
from django.urls import reverse_lazy

from .base import BaseAPITestCase
from contentcuration.models import User

pytestmark = pytest.mark.django_db


class ChannelTestCase(BaseAPITestCase):
    def setUp(self):
        super(ChannelTestCase, self).setUp()
        self.channel.editors.add(self.user)
        self.channel.save()

    def test_authorized_get(self):
        url = reverse_lazy("channel-list") + "/" + self.channel.pk
        response = self.get(url)
        self.assertEqual(response.status_code, 200)

    def test_unauthorized_get(self):
        newuser = User.objects.create(email="unauthorized@test.com")
        newuser.set_password("password")
        newuser.save()
        self.client.force_authenticate(newuser)
        url = reverse_lazy("channel-list") + "/" + self.channel.pk
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)

    def test_readonly_fields(self):
        original_version = self.channel.version
        url = reverse_lazy("channel-list") + "/" + self.channel.pk
        self.put(
            url,
            {
                "version": original_version + 1,
                "content_defaults": {},
                "pending_editors": [],
            },
        )
        self.channel.refresh_from_db()
        self.assertEqual(original_version, self.channel.version)
