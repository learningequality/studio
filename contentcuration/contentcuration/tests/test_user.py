"""
Simple User model creation tests.
"""
import csv
import datetime
import io
import json
import sys
import tempfile

from django.core.management import call_command
from django.test import TransactionTestCase
from django.urls import reverse_lazy

from .base import BaseAPITestCase
from .base import StudioTestCase
from .testdata import fileobj_video
from contentcuration.models import DEFAULT_CONTENT_DEFAULTS
from contentcuration.models import File
from contentcuration.models import Invitation
from contentcuration.models import Language
from contentcuration.models import User
from contentcuration.models import UserSubscription
from contentcuration.tests import testdata
from contentcuration.tests.utils import mixer
from contentcuration.utils.csv_writer import _format_size
from contentcuration.utils.csv_writer import write_user_csv
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
    def test_user_invitation_case_insensitivity(self):
        self.channel.editors.add(self.user)
        User.objects.create(
            email="mrtest@testy.com",
            first_name="Mr.",
            last_name="Test",
            is_admin=False,
            is_staff=False,
            date_joined=datetime.datetime.now(),
            policies=None,
        )
        data = json.dumps(
            {
                "user_email": "MRtest@testy.com",
                "channel_id": self.channel.pk,
                "share_mode": "edit",
            }
        )
        request = self.create_post_request(
            reverse_lazy("send_invitation_email"),
            data=data,
            content_type="application/json",
        )
        response = send_invitation_email(request)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(User.objects.filter(email="mrtest@testy.com").exists())

    def test_editors_can_access_invitations(self):
        """
        This checks that editors for a channel can still access invitations for the same channel
        even if they weren't the ones who sent them
        """
        guestuser = User.objects.create(email="guest@test.com")
        testuser = User.objects.create(email="testuser@test.com")
        testviewonlyuser = User.objects.create(email="testviewonlyuser@test.com")
        invitation = mixer.blend(
            Invitation, channel=self.channel, sender=self.user, invited=guestuser
        )
        self.channel.editors.add(testuser)
        self.channel.viewers.add(testviewonlyuser)

        # Editors should have access
        self.client.force_authenticate(testuser)
        response = self.get("/api/invitation/{}".format(invitation.pk))
        self.assertEqual(response.status_code, 200)

        # Viewers shoudl have access
        self.client.force_authenticate(testviewonlyuser)
        response = self.get("/api/invitation/{}".format(invitation.pk))
        self.assertEqual(response.status_code, 200)


class UserAccountTestCase(BaseAPITestCase):
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

    def test_user_csv_export(self):
        videos = [fileobj_video() for i in range(10)]

        for video in videos:
            video.uploaded_by = self.user
            video.save()

        with tempfile.NamedTemporaryFile(suffix=".csv") as tempf:
            write_user_csv(self.user, path=tempf.name)

            mode = "rb"
            encoding = None
            if sys.version_info.major == 3:
                mode = "r"
                encoding = "utf-8"
            with io.open(tempf.name, mode, encoding=encoding) as csv_file:
                reader = csv.reader(csv_file, delimiter=",")
                for index, row in enumerate(reader):
                    if index == 0:
                        self.assertEqual(
                            row,
                            [
                                "Channel",
                                "Title",
                                "Kind",
                                "Filename",
                                "File Size",
                                "URL",
                                "Description",
                                "Author",
                                "Language",
                                "License",
                                "License Description",
                                "Copyright Holder",
                            ],
                        )
                    else:
                        self.assertIn(videos[index - 1].original_filename, row)
                        self.assertIn(_format_size(videos[index - 1].file_size), row)
            self.assertEqual(index, len(videos))

    def test_user_csv_export_reports_channel_and_content_metadata(self):
        language = Language.objects.create(lang_code="fr", readable_name="French")
        file_record = File.objects.filter(
            contentnode__tree_id=self.channel.main_tree.tree_id
        ).first()
        file_record.uploaded_by = self.user
        file_record.original_filename = "sample-video.mp4"
        file_record.language = None
        file_record.save()

        contentnode = file_record.contentnode
        contentnode.title = "CSV Content Title"
        contentnode.description = "CSV Description"
        contentnode.author = "CSV Author"
        contentnode.language = language
        contentnode.license_description = "CSV License Description"
        contentnode.copyright_holder = "CSV Copyright Holder"
        contentnode.save()

        with tempfile.NamedTemporaryFile(suffix=".csv") as tempf:
            write_user_csv(self.user, path=tempf.name)

            with io.open(tempf.name, "r", encoding="utf-8") as csv_file:
                rows = list(csv.DictReader(csv_file, delimiter=","))

        self.assertTrue(rows)
        row = rows[0]
        self.assertEqual(row["Channel"], self.channel.name)
        self.assertEqual(row["Title"], "CSV Content Title")
        self.assertEqual(row["Filename"], "sample-video.mp4")
        self.assertEqual(row["Description"], "CSV Description")
        self.assertEqual(row["Author"], "CSV Author")
        self.assertEqual(row["Language"], "French")
        self.assertEqual(row["License Description"], "CSV License Description")
        self.assertEqual(row["Copyright Holder"], "CSV Copyright Holder")

    def test_user_csv_export_reports_staged_files(self):
        self.user.staged_files.create(checksum="stagedchecksum", file_size=2048)

        with tempfile.NamedTemporaryFile(suffix=".csv") as tempf:
            write_user_csv(self.user, path=tempf.name)

            with io.open(tempf.name, "r", encoding="utf-8") as csv_file:
                rows = list(csv.DictReader(csv_file, delimiter=","))

        staged_rows = [row for row in rows if row["Filename"] == "Staged File"]
        self.assertEqual(len(staged_rows), 1)
        staged_row = staged_rows[0]
        self.assertEqual(staged_row["Channel"], "No Channel")
        self.assertEqual(staged_row["Title"], "No Resource")
        self.assertEqual(staged_row["File Size"], _format_size(2048))
        self.assertEqual(staged_row["URL"], "")

    def test_user_csv_export_includes_files_without_contentnode(self):
        file_without_contentnode = fileobj_video()
        self.assertIsNone(file_without_contentnode.contentnode_id)
        file_without_contentnode.uploaded_by = self.user
        file_without_contentnode.original_filename = "no-contentnode.mp4"
        file_without_contentnode.save()

        with tempfile.NamedTemporaryFile(suffix=".csv") as tempf:
            write_user_csv(self.user, path=tempf.name)

            with io.open(tempf.name, "r", encoding="utf-8") as csv_file:
                rows = list(csv.DictReader(csv_file, delimiter=","))

        row = next(
            row
            for row in rows
            if row["Filename"] == file_without_contentnode.original_filename
        )
        self.assertEqual(row["Title"], "No resource")
        self.assertEqual(row["Channel"], "No Channel")


class UserEffectiveDiskSpaceTest(StudioTestCase):
    def setUp(self):
        self.user = testdata.user(email="diskspace@test.com")
        # Set a known disk_space value
        self.user.disk_space = 500 * 1024 * 1024  # 500MB
        self.user.save()

    def test_effective_disk_space_without_subscription(self):
        """User without subscription gets base disk_space."""
        self.assertEqual(self.user.get_effective_disk_space(), 500 * 1024 * 1024)

    def test_effective_disk_space_with_active_subscription(self):
        """User with active subscription gets base + subscription space."""
        UserSubscription.objects.create(
            user=self.user,
            stripe_subscription_status="active",
            subscription_disk_space=50 * 1024 * 1024 * 1024,  # 50GB
        )
        expected = 500 * 1024 * 1024 + 50 * 1024 * 1024 * 1024
        self.assertEqual(self.user.get_effective_disk_space(), expected)

    def test_effective_disk_space_with_canceled_subscription(self):
        """User with canceled subscription only gets base space."""
        UserSubscription.objects.create(
            user=self.user,
            stripe_subscription_status="canceled",
            subscription_disk_space=50 * 1024 * 1024 * 1024,
        )
        self.assertEqual(self.user.get_effective_disk_space(), 500 * 1024 * 1024)
