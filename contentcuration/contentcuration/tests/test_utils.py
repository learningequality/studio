import datetime
from cStringIO import StringIO
from unittest import TestCase

from base import StudioTestCase
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from contentcuration.models import File
from contentcuration.models import generate_object_storage_name
from contentcuration.models import User
from contentcuration.utils.files import get_file_diff
from contentcuration.utils.policies import check_policies
from contentcuration.utils.policies import POLICIES


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


class FileFormatsTestCase(StudioTestCase):
    """
    Ensure that unsupported files aren't saved.
    """

    def test_unsupported_files_raise_error(self):
        unsupported_file = File.objects.create(
            file_on_disk=ContentFile("test"),
            checksum='aaa'
        )

        with self.assertRaises(Exception):
            unsupported_file.file_on_disk.save("aaa.wtf", ContentFile("aaa"))

    def test_guess_format_from_extension(self):
        """
        Make sure that we can guess file types listed in le_utils.file_formats.choices.
        Note: if this test fails, it's likely because le_utils file formats aren't synced.
        """
        from le_utils.constants import file_formats
        known_extensions = dict(file_formats.choices).keys()

        for ext in known_extensions:
            file_with_ext = File.objects.create(
                file_on_disk=ContentFile("test"),
                checksum="aaa"
            )

            try:
                file_with_ext.file_on_disk.save("aaa.{}".format(ext), ContentFile("aaa"))
            except Exception as e:
                raise type(e)(e.message + " ... (hint: make sure that the version of le-utils you're using has its file formats synced).")
