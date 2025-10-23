from unittest import mock

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from contentcuration.constants import community_library_submission as constants
from contentcuration.models import Channel
from contentcuration.models import CommunityLibrarySubmission
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.tests.base import StudioTestCase
from contentcuration.viewsets.channel import AdminChannelSerializer


User = get_user_model()


class ChannelMutualExclusivityTestCase(StudioTestCase):
    def setUp(self):
        self.user = testdata.user()
        self.channel = Channel.objects.create(
            actor_id=self.user.id,
            name="Test Channel",
            description="Test Description",
            version=0,
        )
        self.channel.version = 1
        self.channel.save()
        self.channel.editors.add(self.user)

    def test_public_channel_cannot_be_submitted_to_community_library(self):
        """Test that a public channel cannot be submitted to community library."""
        self.channel.public = True
        self.channel.save()

        with self.assertRaises(ValidationError) as context:
            CommunityLibrarySubmission.objects.create(
                channel=self.channel,
                channel_version=1,
                author=self.user,
                description="Test submission",
            )

        self.assertIn(
            "Cannot create a community library submission for a public channel",
            str(context.exception),
        )

    def test_community_channel_cannot_be_marked_public(self):
        """Test that a community channel cannot be marked public."""
        CommunityLibrarySubmission.objects.create(
            channel=self.channel,
            channel_version=1,
            author=self.user,
            description="Test submission",
            status=constants.STATUS_APPROVED,
        )

        self.channel.public = True
        with self.assertRaises(ValidationError) as context:
            self.channel.clean()

        self.assertIn(
            "This channel has been added to the Community Library and cannot be marked public",
            str(context.exception),
        )

    def test_is_community_channel_method(self):
        """Test the is_community_channel method."""
        self.assertFalse(self.channel.is_community_channel())

        CommunityLibrarySubmission.objects.create(
            channel=self.channel,
            channel_version=1,
            author=self.user,
            description="Test submission",
            status=constants.STATUS_APPROVED,
        )
        self.assertTrue(self.channel.is_community_channel())

        self.channel.version = 2
        self.channel.save()
        CommunityLibrarySubmission.objects.create(
            channel=self.channel,
            channel_version=2,
            author=self.user,
            description="Test submission 2",
            status=constants.STATUS_LIVE,
        )
        self.assertTrue(self.channel.is_community_channel())

        self.channel.version = 3
        self.channel.save()
        CommunityLibrarySubmission.objects.create(
            channel=self.channel,
            channel_version=3,
            author=self.user,
            description="Test submission 3",
            status=constants.STATUS_PENDING,
        )
        self.assertTrue(self.channel.is_community_channel())

    def test_non_community_channel_can_be_marked_public(self):
        """Test that a non-community channel can be marked public."""
        self.channel.public = True
        self.channel.clean()
        self.channel.save()
        self.assertTrue(self.channel.public)

    def test_non_public_channel_can_be_submitted_to_community_library(self):
        """Test that a non-public channel can be submitted to community library."""
        submission = CommunityLibrarySubmission.objects.create(
            channel=self.channel,
            channel_version=1,
            author=self.user,
            description="Test submission",
        )
        self.assertEqual(submission.channel, self.channel)


class AdminChannelSerializerMutualExclusivityTestCase(StudioTestCase):
    """Test mutual exclusivity rules for AdminChannelSerializer."""

    def setUp(self):
        self.user = testdata.user()
        self.channel = Channel.objects.create(
            actor_id=self.user.id,
            name="Test Channel",
            description="Test Description",
            version=0,
        )

        self.channel.version = 1
        self.channel.save()
        self.channel.editors.add(self.user)

    def test_serializer_validates_community_channel_cannot_be_public(self):
        """Test that serializer prevents marking community channel as public."""
        CommunityLibrarySubmission.objects.create(
            channel=self.channel,
            channel_version=1,
            author=self.user,
            description="Test submission",
            status=constants.STATUS_APPROVED,
        )

        serializer = AdminChannelSerializer(
            instance=self.channel, data={"public": True}, partial=True
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn(
            "This channel has been added to the Community Library and cannot be marked public",
            str(serializer.errors),
        )

    def test_serializer_allows_non_community_channel_to_be_public(self):
        """Test that serializer allows non-community channel to be public."""
        serializer = AdminChannelSerializer(
            instance=self.channel, data={"public": True}, partial=True
        )

        self.assertTrue(serializer.is_valid())
        serializer.save()
        self.channel.refresh_from_db()
        self.assertTrue(self.channel.public)

    def test_serializer_allows_community_channel_to_remain_non_public(self):
        """Test that serializer allows community channel to remain non-public."""
        CommunityLibrarySubmission.objects.create(
            channel=self.channel,
            channel_version=1,
            author=self.user,
            description="Test submission",
            status=constants.STATUS_APPROVED,
        )

        serializer = AdminChannelSerializer(
            instance=self.channel,
            data={"source_url": "https://example.com"},
            partial=True,
        )

        self.assertTrue(serializer.is_valid())
        serializer.save()
        self.channel.refresh_from_db()
        self.assertEqual(self.channel.source_url, "https://example.com")
        self.assertFalse(self.channel.public)


class CommunityLibrarySubmissionMutualExclusivityAPITestCase(StudioAPITestCase):
    """Test mutual exclusivity rules via API endpoints."""

    def setUp(self):
        super().setUp()

        self.ensure_db_exists_patcher = mock.patch(
            "contentcuration.utils.publish.ensure_versioned_database_exists"
        )
        self.ensure_db_exists_patcher.start()

        self.user = testdata.user()
        self.channel = testdata.channel()
        self.channel.public = False
        self.channel.version = 1
        self.channel.editors.add(self.user)
        self.channel.save()

    def tearDown(self):
        self.ensure_db_exists_patcher.stop()
        super().tearDown()

    def test_api_prevents_public_channel_submission_to_community_library(self):
        """Test that API prevents submitting public channel to community library."""
        self.channel.public = True
        self.channel.save()

        self.client.force_authenticate(user=self.user)

        url = reverse("community-library-submission-list")
        data = {
            "channel": self.channel.id,
            "description": "Test submission",
            "countries": [],
        }

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(
            "Cannot create a community library submission for a public channel",
            str(response.data),
        )

    def test_api_prevents_approving_submission_for_public_channel(self):
        """Test that API prevents approving submission for channel that became public."""
        submission = CommunityLibrarySubmission.objects.create(
            channel=self.channel,
            channel_version=self.channel.version,
            description="Test submission",
            status=constants.STATUS_PENDING,
            author=self.user,
        )

        self.channel.public = True
        self.channel.save()

        self.client.force_authenticate(user=self.admin_user)

        url = reverse(
            "admin-community-library-submission-resolve", kwargs={"pk": submission.id}
        )
        data = {
            "status": constants.STATUS_APPROVED,
        }

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(
            "Cannot approve a community library submission for a channel that has been marked public",
            str(response.data),
        )
