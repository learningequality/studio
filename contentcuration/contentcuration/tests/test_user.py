"""
Simple User model creation tests.
"""
import datetime

from django.core.management import call_command
from contentcuration.models import DEFAULT_CONTENT_DEFAULTS, User
from contentcuration.utils.policies import check_policies, POLICIES

from base import StudioTestCase

class UserPoliciesCreationTestCase(StudioTestCase):

    def create_user(self, email="mrtest@testy.com"):
        return User.objects.create(
            email=email,
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
        mrtest = self.create_user("mrtest2@testy.com")
        mrtest.save()
        assert mrtest.content_defaults == DEFAULT_CONTENT_DEFAULTS

        mrtest2 = User.objects.get(email="mrtest2@testy.com")
        assert mrtest2.content_defaults == DEFAULT_CONTENT_DEFAULTS

    def test_check_policies_handles_user_with_null_policy(self):
        """
        Check that check_policies doesn't raise any error when we
        give a user with a policy value of None.

        Also make sure that we return the latest policy as what the user
        needs to sign.
        """
        unsaved_user = User(
            email="mrtest3@testy.com",
            first_name="Mr.",
            last_name="Test",
            is_admin=False,
            is_staff=False,
            date_joined=datetime.datetime.now(),
            policies=None,
        )

        # shouldn't raise any error
        policies_to_accept = check_policies(unsaved_user)
        assert ("privacy_policy_{}".format(POLICIES["privacy_policy"]["latest"])
                in policies_to_accept)
