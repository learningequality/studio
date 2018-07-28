"""
Simple User model creation tests.
"""
import datetime

from django.test import TransactionTestCase
from django.core.management import call_command
from contentcuration.models import DEFAULT_CONTENT_DEFAULTS, User


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
