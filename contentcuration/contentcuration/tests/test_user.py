"""
Simple User model creation tests.
"""
import datetime

from django.test import TransactionTestCase
from django.core.management import call_command
from contentcuration.models import User


class UserPoliciesCreationTestCase(TransactionTestCase):

    def setUp(self):
        call_command("loadconstants")

    def test_user_with_empty_policy_is_created_successfully(self):
        """
        This test should not raise any error when creating a user
        with no policy.
        """
        User.objects.create(
            email="mrtest@testy.com",
            first_name="Mr.",
            last_name="Test",
            is_admin=False,
            is_staff=False,
            date_joined=datetime.datetime.now(),
            policies=None,
        )
