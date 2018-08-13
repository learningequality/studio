import datetime

from cStringIO import StringIO
from django.core.files.storage import default_storage
from django.conf import settings

from unittest import TestCase
from contentcuration.models import User, generate_object_storage_name
from contentcuration.utils.policies import check_policies, POLICIES
from contentcuration.utils.files import get_file_diff

from base import StudioTestCase


class CheckPoliciesTestCase(TestCase):

    def setUp(self):
        super(CheckPoliciesTestCase, self).setUp()

        self.unsaved_user = User(
            email="mrtest@testy.com",
            first_name="Mr.",
            last_name="Test",
            is_admin=False,
            is_staff=False,
            date_joined=datetime.datetime.now(),
            policies=None,
        )

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


class GetFileDiffTestCase(StudioTestCase):
    """
    Tests for contentcuration.utils.get_file_diff.
    """

    def setUp(self):
        super(GetFileDiffTestCase, self).setUp()
        storage = default_storage
        # Upload some pieces of content, as our test data

        self.existing_content = "dowereallyexist.jpg"
        self.existing_content_path = generate_object_storage_name("dowereallyexist", self.existing_content)
        storage.save(self.existing_content_path, StringIO("maybe"))
        pass

    def test_returns_empty_if_content_already_exists(self):
        """Test if get_file_diff returns an empty list if all the files we pass in are
        already present in our storage system.

        We should only have one piece of content in our storage system, so we
        pass a singleton list containing that. get_file_diff should then return an empty list.
        """

        files = [self.existing_content]
        assert get_file_diff(files) == []


    def test_returns_file_not_uploaded_yet(self):
        """

        Test if a list with a nonexistent file passed in to get_file_diff
        would return that file.
        """
        files = [
            self.existing_content,
            "rando"
        ]
        assert get_file_diff(files) == ["rando"]
