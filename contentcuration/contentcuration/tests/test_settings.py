import json

from django.urls import reverse_lazy

from .base import BaseAPITestCase
from contentcuration.models import User
from contentcuration.views.settings import DeleteAccountView
from contentcuration.views.settings import UsernameChangeView


class SettingsTestCase(BaseAPITestCase):
    def test_username_change(self):
        data = json.dumps({"first_name": "New firstname", "last_name": "New lastname",})
        request = self.create_post_request(
            reverse_lazy("update_user_full_name"),
            data=data,
            content_type="application/json",
        )
        response = UsernameChangeView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            User.objects.filter(
                email=self.user.email,
                first_name="New firstname",
                last_name="New lastname",
            ).exists()
        )

    def test_delete_account_invalid(self):
        data = json.dumps({"email": "not the right email"})
        request = self.create_post_request(
            reverse_lazy("delete_user_account"),
            data=data,
            content_type="application/json",
        )
        try:
            DeleteAccountView.as_view()(request)
            self.assertTrue(False)
        except UserWarning:
            self.assertTrue(User.objects.filter(email=self.user.email).exists())

    def test_delete_account(self):
        # TODO: send_email causes connection errors
        data = json.dumps({"email": self.user.email})
        self.create_post_request(
            reverse_lazy("delete_user_account"),
            data=data,
            content_type="application/json",
        )
        # response = DeleteAccountView.as_view()(request)
        # self.assertEqual(response.status_code, 200)
        # self.assertFalse(User.objects.filter(email=self.user.email).exists())
