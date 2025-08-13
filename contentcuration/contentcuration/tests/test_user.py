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
from .testdata import fileobj_video
from contentcuration.models import DEFAULT_CONTENT_DEFAULTS
from contentcuration.models import Invitation
from contentcuration.models import User
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
