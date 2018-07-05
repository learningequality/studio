import datetime

from unittest import TestCase
from contentcuration.models import User
from contentcuration.utils.policies import check_policies, POLICIES


class CheckPoliciesTestCase(TestCase):

    def setUp(self):
        self.unsaved_user = User(
            email="mrtest@testy.com",
            first_name="Mr.",
            last_name="Test",
            is_admin=False,
            is_staff=False,
            date_joined=datetime.datetime.now(),
            policies=None,
        )

        super(CheckPoliciesTestCase, self).setUp()

    def test_check_policies_handles_user_with_null_policy(self):
        """
        Check that check_policies doesn't raise any error when we
        give a user with a policy value of None.

        Also make sure that we return the latest policy as what the user
        needs to sign.
        """

        # shouldn't raise any error
        policies_to_accept = check_policies(self.unsaved_user)
        assert ("privacy_policy_{}".format(POLICIES["privacy_policy"]["latest"])
                in policies_to_accept)
