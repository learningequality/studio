import json

import mock
from django.urls import reverse_lazy

from .base import BaseAPITestCase
from contentcuration.models import User
from contentcuration.views.settings import DeleteAccountView
from contentcuration.views.settings import UsernameChangeView


class SettingsTestCase(BaseAPITestCase):
    def test_username_change(self):
        data = json.dumps(
            {
                "first_name": "New firstname",
                "last_name": "New lastname",
            }
        )
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
        except Exception:
            self.assertTrue(User.objects.filter(email=self.user.email).exists())

    def test_delete_account(self):
        with mock.patch("contentcuration.views.users.djangologout") as djangologout:
            self.user.delete = mock.Mock()
            data = json.dumps({"email": self.user.email})
            request = self.create_post_request(
                reverse_lazy("delete_user_account"),
                data=data,
                content_type="application/json",
            )
            response = DeleteAccountView.as_view()(request)

            # Ensure successful response.
            self.assertEqual(response.status_code, 200)
            # Ensure user's delete method is called.
            self.user.delete.assert_called_once()
            # Ensure we logout the user.
            djangologout.assert_called_once_with(request)
