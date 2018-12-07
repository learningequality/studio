"""
Simple User model creation tests.
"""
import datetime
import json

from django.core.management import call_command
from django.core.urlresolvers import reverse_lazy
from django.test import TransactionTestCase

from .base import BaseAPITestCase
from contentcuration.models import DEFAULT_CONTENT_DEFAULTS
from contentcuration.models import User
from contentcuration.views.users import send_invitation_email


class UserPoliciesCreationTestCase(TransactionTestCase):

    def setUp(self):
        call_command("loadconstants")

    def create_user(self):
        return User.objects.create(
            email="mrtest@testy.com",
            first_name="Mr.",
            last_name="Test",
            is_admin=False,
            is_staff=False,
            date_joined=datetime.datetime.now(),
            policies=None,
        )

    def test_user_with_empty_policy_is_created_successfully(self):
        """
        This test should not raise any error when creating a user
        with no policy.
        """
        assert self.create_user()

    def test_content_defaults_is_dict(self):
        mrtest = self.create_user()
        mrtest.save()
        assert mrtest.content_defaults == DEFAULT_CONTENT_DEFAULTS

        mrtest2 = User.objects.get(email="mrtest@testy.com")
        assert mrtest2.content_defaults == DEFAULT_CONTENT_DEFAULTS


class UserInvitationTestCase(BaseAPITestCase):
    def test_user_invitation_dedupe(self):
        self.channel.editors.add(self.user)
        data = json.dumps({"user_email": "test@testing.com",
                           "channel_id": self.channel.pk,
                           "share_mode": "edit",
                           })
        request = self.create_post_request(reverse_lazy("send_invitation_email"), data=data, content_type='application/json')
        response = send_invitation_email(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(User.objects.filter(email__iexact="test@testing.com").count(), 1)

        data = json.dumps({"user_email": "TeSt@TeStIng.com",
                           "channel_id": self.channel.pk,
                           "share_mode": "edit",
                           })
        request = self.create_post_request(reverse_lazy("send_invitation_email"), data=data, content_type='application/json')
        response = send_invitation_email(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(User.objects.filter(email__iexact="test@testing.com").count(), 1)
