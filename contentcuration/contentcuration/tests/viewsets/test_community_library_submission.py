import datetime
from unittest import mock
from urllib.parse import urlencode

import pytz
from django.urls import reverse

from contentcuration.constants import (
    community_library_submission as community_library_submission_constants,
)
from contentcuration.models import CommunityLibrarySubmission
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase


def reverse_with_query(
    viewname, urlconf=None, args=None, kwargs=None, current_app=None, query=None
):
    """
    This helper wraps the Django `reverse` function to support the `query` argument.
    This argument is supported natively since Django 5.2, so when Django is updated
    above this version, this helper can be removed.
    """
    url = reverse(
        viewname, urlconf=urlconf, args=args, kwargs=kwargs, current_app=current_app
    )
    if query:
        return f"{url}?{urlencode(query)}"
    return url


class CRUDTestCase(StudioAPITestCase):
    @property
    def new_submission_metadata(self):
        return {
            "channel": self.channel_without_submission.id,
            "countries": [self.country1.code],
        }

    @property
    def updated_submission_metadata(self):
        return {
            "countries": [
                "C2",
            ],
            "channel": self.channel_with_submission1.id,
        }

    def setUp(self):
        super().setUp()
        self.author_user = testdata.user(email="author@user.com")
        self.editor_user = testdata.user(email="editor@user.com")
        self.forbidden_user = testdata.user(email="forbidden@user.com")
        self.admin_user = testdata.user(email="admin@user.com")
        self.admin_user.is_admin = True
        self.admin_user.save()

        self.country1 = testdata.country(name="Country 1", code="C1")
        self.country2 = testdata.country(name="Country 2", code="C2")

        self.channel_with_submission1 = testdata.channel()
        self.channel_with_submission1.public = True
        self.channel_with_submission1.version = 1
        self.channel_with_submission1.editors.add(self.author_user)
        self.channel_with_submission1.editors.add(self.editor_user)
        self.channel_with_submission1.save()

        self.channel_with_submission2 = testdata.channel()
        self.channel_with_submission2.public = True
        self.channel_with_submission2.version = 1
        self.channel_with_submission2.editors.add(self.author_user)
        self.channel_with_submission2.editors.add(self.editor_user)
        self.channel_with_submission2.save()

        self.channel_without_submission = testdata.channel()
        self.channel_without_submission.public = True
        self.channel_without_submission.version = 1
        self.channel_without_submission.editors.add(self.author_user)
        self.channel_without_submission.editors.add(self.editor_user)
        self.channel_without_submission.save()

        self.unpublished_channel = testdata.channel()
        self.unpublished_channel.public = False
        self.unpublished_channel.version = 0
        self.unpublished_channel.editors.add(self.author_user)
        self.unpublished_channel.editors.add(self.editor_user)
        self.unpublished_channel.save()

        self.existing_submission1 = testdata.community_library_submission()
        self.existing_submission1.channel = self.channel_with_submission1
        self.existing_submission1.author = self.author_user
        self.existing_submission1.save()
        self.existing_submission1.countries.add(self.country1)
        self.existing_submission1.save()

        self.existing_submission2 = testdata.community_library_submission()
        self.existing_submission2.channel = self.channel_with_submission2
        self.existing_submission2.author = self.author_user
        self.existing_submission2.save()
        self.existing_submission2.countries.add(self.country1)
        self.existing_submission2.save()

    def test_create_submission__is_editor(self):
        self.client.force_authenticate(user=self.editor_user)
        submission = self.new_submission_metadata
        response = self.client.post(
            reverse("community-library-submission-list"),
            submission,
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)

    def test_create_submission__is_forbidden(self):
        self.client.force_authenticate(user=self.forbidden_user)
        submission = self.new_submission_metadata
        response = self.client.post(
            reverse("community-library-submission-list"),
            submission,
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)

    def test_create_submission__unpublished_channel(self):
        self.client.force_authenticate(user=self.editor_user)
        submission = self.new_submission_metadata
        submission["channel"] = self.unpublished_channel.id

        response = self.client.post(
            reverse("community-library-submission-list"),
            submission,
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)

    def test_create_submission__explicit_channel_version(self):
        self.client.force_authenticate(user=self.editor_user)
        submission_metadata = self.new_submission_metadata
        submission_metadata["channel_version"] = 2
        response = self.client.post(
            reverse("community-library-submission-list"),
            submission_metadata,
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)

        created_submission_id = response.data["id"]
        created_submission = CommunityLibrarySubmission.objects.get(
            id=created_submission_id
        )

        # The explicitly set channel version should be ignored by the serializer
        self.assertEqual(created_submission.channel_version, 1)

    def test_list_submissions__is_editor(self):
        self.client.force_authenticate(user=self.editor_user)
        response = self.client.get(
            reverse(
                "community-library-submission-list",
            )
        )
        self.assertEqual(response.status_code, 200, response.content)

        results = response.data
        self.assertEqual(len(results), 2)

    def test_list_submissions__is_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(
            reverse(
                "community-library-submission-list",
            )
        )
        self.assertEqual(response.status_code, 200, response.content)

        results = response.data
        self.assertEqual(len(results), 2)

    def test_list_submissions__is_forbidden(self):
        self.client.force_authenticate(user=self.forbidden_user)
        response = self.client.get(
            reverse(
                "community-library-submission-list",
            )
        )
        self.assertEqual(response.status_code, 200, response.content)

        results = response.data
        self.assertEqual(len(results), 0)

    def test_list_submissions__filter_by_channel(self):
        self.client.force_authenticate(user=self.editor_user)
        response = self.client.get(
            reverse_with_query(
                "community-library-submission-list",
                query={"channel": self.channel_with_submission1.id},
            )
        )
        self.assertEqual(response.status_code, 200, response.content)

        results = response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["channel_id"], self.channel_with_submission1.id)

    def test_list_submissions__pagination(self):
        self.client.force_authenticate(user=self.author_user)
        response = self.client.get(
            reverse_with_query(
                "community-library-submission-list",
                query={"max_results": 1},
            )
        )
        self.assertEqual(response.status_code, 200, response.content)

        results = response.data["results"]
        more = response.data["more"]

        self.assertEqual(len(results), 1)
        self.assertIsNotNone(more)

        response = self.client.get(
            reverse_with_query(
                "community-library-submission-list",
                query=more,
            )
        )
        self.assertEqual(response.status_code, 200, response.content)

        results = response.data["results"]
        more = response.data["more"]

        self.assertEqual(len(results), 1)
        self.assertIsNone(more)

    def test_get_single_submission__is_editor(self):
        self.client.force_authenticate(user=self.editor_user)
        response = self.client.get(
            reverse(
                "community-library-submission-detail",
                args=[self.existing_submission1.id],
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

        result = response.data
        self.assertEqual(result["id"], self.existing_submission1.id)

    def test_get_single_submission__is_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(
            reverse(
                "community-library-submission-detail",
                args=[self.existing_submission1.id],
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

        result = response.data
        self.assertEqual(result["id"], self.existing_submission1.id)

    def test_get_single_submission__is_forbidden(self):
        self.client.force_authenticate(user=self.forbidden_user)
        response = self.client.get(
            reverse(
                "community-library-submission-detail",
                args=[self.existing_submission1.id],
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 404, response.content)

    def test_get_single_submission__author_name(self):
        self.client.force_authenticate(user=self.author_user)
        response = self.client.get(
            reverse(
                "community-library-submission-detail",
                args=[self.existing_submission1.id],
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

        result = response.data
        self.assertEqual(
            result["author_name"],
            f"{self.author_user.first_name} {self.author_user.last_name}",
        )

    def test_update_submission__is_author(self):
        self.client.force_authenticate(user=self.author_user)
        response = self.client.put(
            reverse(
                "community-library-submission-detail",
                args=[self.existing_submission1.id],
            ),
            self.updated_submission_metadata,
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

        updated_submission = CommunityLibrarySubmission.objects.get(
            id=self.existing_submission1.id
        )
        self.assertEqual(updated_submission.countries.count(), 1)
        self.assertEqual(updated_submission.countries.first().code, "C2")

    def test_update_submission__is_editor(self):
        self.client.force_authenticate(user=self.editor_user)
        response = self.client.put(
            reverse(
                "community-library-submission-detail",
                args=[self.existing_submission1.id],
            ),
            self.updated_submission_metadata,
            format="json",
        )
        self.assertEqual(response.status_code, 404, response.content)

    def test_update_submission__is_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.put(
            reverse(
                "community-library-submission-detail",
                args=[self.existing_submission1.id],
            ),
            self.updated_submission_metadata,
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

        updated_submission = CommunityLibrarySubmission.objects.get(
            id=self.existing_submission1.id
        )
        self.assertEqual(updated_submission.countries.count(), 1)
        self.assertEqual(updated_submission.countries.first().code, "C2")

    def test_update_submission__change_channel(self):
        self.client.force_authenticate(user=self.admin_user)
        submission_metadata = self.updated_submission_metadata
        submission_metadata["channel"] = self.channel_without_submission.id
        response = self.client.put(
            reverse(
                "community-library-submission-detail",
                args=[self.existing_submission1.id],
            ),
            submission_metadata,
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)

    def test_partial_update_submission__missing_channel(self):
        self.client.force_authenticate(user=self.admin_user)
        submission_metadata = self.updated_submission_metadata
        del submission_metadata["channel"]
        response = self.client.patch(
            reverse(
                "community-library-submission-detail",
                args=[self.existing_submission1.id],
            ),
            submission_metadata,
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        updated_submission = CommunityLibrarySubmission.objects.get(
            id=self.existing_submission1.id
        )
        self.assertEqual(updated_submission.channel, self.channel_with_submission1)

    def test_delete_submission__is_author(self):
        self.client.force_authenticate(user=self.author_user)
        response = self.client.delete(
            reverse(
                "community-library-submission-detail",
                args=[self.existing_submission1.id],
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 204, response.content)
        self.assertFalse(
            CommunityLibrarySubmission.objects.filter(
                id=self.existing_submission1.id
            ).exists()
        )

    def test_delete_submission__is_editor(self):
        self.client.force_authenticate(user=self.editor_user)
        response = self.client.delete(
            reverse(
                "community-library-submission-detail",
                args=[self.existing_submission1.id],
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 404, response.content)
        self.assertTrue(
            CommunityLibrarySubmission.objects.filter(
                id=self.existing_submission1.id
            ).exists()
        )

    def test_delete_submission__is_admin(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(
            reverse(
                "community-library-submission-detail",
                args=[self.existing_submission1.id],
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 204, response.content)
        self.assertFalse(
            CommunityLibrarySubmission.objects.filter(
                id=self.existing_submission1.id
            ).exists()
        )

    def test_delete_submission__is_forbidden(self):
        self.client.force_authenticate(user=self.forbidden_user)
        response = self.client.delete(
            reverse(
                "community-library-submission-detail",
                args=[self.existing_submission1.id],
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 404, response.content)
        self.assertTrue(
            CommunityLibrarySubmission.objects.filter(
                id=self.existing_submission1.id
            ).exists()
        )


class AdminViewSetTestCase(StudioAPITestCase):
    def setUp(self):
        super().setUp()

        self.submission = testdata.community_library_submission()
        self.submission.channel.version = 3
        self.submission.channel.save()
        self.submission.channel_version = 2
        self.submission.save()

        self.editor_user = self.submission.channel.editors.first()

        self.superseded_submission = CommunityLibrarySubmission.objects.create(
            channel=self.submission.channel,
            author=self.editor_user,
            status=community_library_submission_constants.STATUS_PENDING,
            date_created=datetime.datetime(2023, 1, 1, tzinfo=pytz.utc),
            channel_version=1,
        )
        self.not_superseded_submission = CommunityLibrarySubmission.objects.create(
            channel=self.submission.channel,
            author=self.editor_user,
            status=community_library_submission_constants.STATUS_PENDING,
            date_created=datetime.datetime(2024, 1, 1, tzinfo=pytz.utc),
            channel_version=3,
        )
        self.submission_for_other_channel = testdata.community_library_submission()
        self.submission_for_other_channel.channel_version = 1
        self.submission_for_other_channel.save()

        self.feedback_notes = "Feedback"
        self.internal_notes = "Internal notes"

        self.resolve_approve_metadata = {
            "status": community_library_submission_constants.STATUS_APPROVED,
            "feedback_notes": self.feedback_notes,
            "internal_notes": self.internal_notes,
        }
        self.resolve_reject_metadata = {
            "status": community_library_submission_constants.STATUS_REJECTED,
            "resolution_reason": community_library_submission_constants.REASON_INVALID_METADATA,
            "feedback_notes": self.feedback_notes,
            "internal_notes": self.internal_notes,
        }

        self.resolved_time = datetime.datetime(2023, 10, 1, tzinfo=pytz.utc)
        self.patcher = mock.patch(
            "contentcuration.viewsets.community_library_submission.timezone.now",
            return_value=self.resolved_time,
        )
        self.mock_datetime = self.patcher.start()

    def tearDown(self):
        self.patcher.stop()
        super().tearDown()

    def _manually_reject_submission(self):
        self.submission.status = community_library_submission_constants.STATUS_REJECTED
        self.submission.resolved_by = self.admin_user
        self.submission.resolution_reason = (
            community_library_submission_constants.REASON_INVALID_METADATA
        )
        self.submission.feedback_notes = self.feedback_notes
        self.submission.internal_notes = self.internal_notes
        self.submission.date_resolved = self.resolved_time
        self.submission.save()

    def _refresh_submissions_from_db(self):
        self.submission.refresh_from_db()
        self.superseded_submission.refresh_from_db()
        self.not_superseded_submission.refresh_from_db()
        self.submission_for_other_channel.refresh_from_db()

    def test_list_submissions__admin(self):
        self.client.force_authenticate(user=self.admin_user)

        self._manually_reject_submission()

        response = self.client.get(
            reverse("admin-community-library-submission-list"),
        )
        self.assertEqual(response.status_code, 200, response.content)

        results = response.data
        self.assertEqual(len(results), 4)
        rejected_results = [
            result
            for result in results
            if result["status"]
            == community_library_submission_constants.STATUS_REJECTED
        ]
        self.assertEqual(len(rejected_results), 1)
        result = rejected_results[0]

        self.assertEqual(result["resolved_by_id"], self.admin_user.id)
        self.assertEqual(
            result["resolved_by_name"],
            f"{self.admin_user.first_name} {self.admin_user.last_name}",
        )
        self.assertEqual(result["internal_notes"], self.internal_notes)

    def test_list_submissions__editor(self):
        self.client.force_authenticate(user=self.editor_user)

        self._manually_reject_submission()

        response = self.client.get(
            reverse("admin-community-library-submission-list"),
        )
        self.assertEqual(response.status_code, 403, response.content)

    def test_submission_detail__admin(self):
        self.client.force_authenticate(user=self.admin_user)

        self._manually_reject_submission()

        response = self.client.get(
            reverse(
                "admin-community-library-submission-detail",
                args=[self.submission.id],
            ),
        )
        self.assertEqual(response.status_code, 200, response.content)

        result = response.data
        self.assertEqual(result["id"], self.submission.id)
        self.assertEqual(result["resolved_by_id"], self.admin_user.id)
        self.assertEqual(
            result["resolved_by_name"],
            f"{self.admin_user.first_name} {self.admin_user.last_name}",
        )
        self.assertEqual(result["internal_notes"], self.internal_notes)

    def test_submission_detail__editor(self):
        self.client.force_authenticate(user=self.editor_user)

        self._manually_reject_submission()

        response = self.client.get(
            reverse(
                "admin-community-library-submission-detail",
                args=[self.submission.id],
            ),
        )
        self.assertEqual(response.status_code, 403, response.content)

    def test_update_submission(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.put(
            reverse(
                "admin-community-library-submission-detail",
                args=[self.submission.id],
            ),
            {},
            format="json",
        )
        self.assertEqual(response.status_code, 405, response.content)

    def test_partial_update_submission(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.patch(
            reverse(
                "admin-community-library-submission-detail",
                args=[self.submission.id],
            ),
            {},
            format="json",
        )
        self.assertEqual(response.status_code, 405, response.content)

    def test_destroy_submission(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.delete(
            reverse(
                "admin-community-library-submission-detail",
                args=[self.submission.id],
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 405, response.content)

    def test_resolve_submission__editor(self):
        self.client.force_authenticate(user=self.editor_user)
        response = self.client.post(
            reverse(
                "admin-community-library-submission-resolve",
                args=[self.submission.id],
            ),
            self.resolve_approve_metadata,
            format="json",
        )
        self.assertEqual(response.status_code, 403, response.content)

    def test_resolve_submission__accept_correct(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            reverse(
                "admin-community-library-submission-resolve",
                args=[self.submission.id],
            ),
            self.resolve_approve_metadata,
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

        resolved_submission = CommunityLibrarySubmission.objects.get(
            id=self.submission.id
        )
        self.assertEqual(
            resolved_submission.status,
            community_library_submission_constants.STATUS_APPROVED,
        )
        self.assertEqual(resolved_submission.feedback_notes, self.feedback_notes)
        self.assertEqual(resolved_submission.internal_notes, self.internal_notes)
        self.assertEqual(resolved_submission.resolved_by, self.admin_user)
        self.assertEqual(resolved_submission.date_resolved, self.resolved_time)

    def test_resolve_submission__reject_correct(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            reverse(
                "admin-community-library-submission-resolve",
                args=[self.submission.id],
            ),
            self.resolve_reject_metadata,
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

        resolved_submission = CommunityLibrarySubmission.objects.get(
            id=self.submission.id
        )
        self.assertEqual(
            resolved_submission.status,
            community_library_submission_constants.STATUS_REJECTED,
        )
        self.assertEqual(
            resolved_submission.resolution_reason,
            community_library_submission_constants.REASON_INVALID_METADATA,
        )
        self.assertEqual(resolved_submission.feedback_notes, self.feedback_notes)
        self.assertEqual(resolved_submission.internal_notes, self.internal_notes)
        self.assertEqual(resolved_submission.resolved_by, self.admin_user)
        self.assertEqual(resolved_submission.date_resolved, self.resolved_time)

    def test_resolve_submission__reject_missing_resolution_reason(self):
        self.client.force_authenticate(user=self.admin_user)
        metadata = self.resolve_reject_metadata.copy()
        del metadata["resolution_reason"]
        response = self.client.post(
            reverse(
                "admin-community-library-submission-resolve",
                args=[self.submission.id],
            ),
            metadata,
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)

    def test_resolve_submission__reject_missing_feedback_notes(self):
        self.client.force_authenticate(user=self.admin_user)
        metadata = self.resolve_reject_metadata.copy()
        del metadata["feedback_notes"]
        response = self.client.post(
            reverse(
                "admin-community-library-submission-resolve",
                args=[self.submission.id],
            ),
            metadata,
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)

    def test_resolve_submission__invalid_status(self):
        self.client.force_authenticate(user=self.admin_user)
        metadata = self.resolve_approve_metadata.copy()
        metadata["status"] = (community_library_submission_constants.STATUS_PENDING,)
        response = self.client.post(
            reverse(
                "admin-community-library-submission-resolve",
                args=[self.submission.id],
            ),
            metadata,
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)

    def test_resolve_submission__not_pending(self):
        self.client.force_authenticate(user=self.admin_user)
        self.submission.status = community_library_submission_constants.STATUS_APPROVED
        self.submission.save()

        response = self.client.post(
            reverse(
                "admin-community-library-submission-resolve",
                args=[self.submission.id],
            ),
            self.resolve_approve_metadata,
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)

    def test_resolve_submission__overrite_categories(self):
        self.client.force_authenticate(user=self.admin_user)
        categories = ["Category 1"]
        self.resolve_approve_metadata["categories"] = categories

        response = self.client.post(
            reverse(
                "admin-community-library-submission-resolve",
                args=[self.submission.id],
            ),
            self.resolve_approve_metadata,
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

        resolved_submission = CommunityLibrarySubmission.objects.get(
            id=self.submission.id
        )
        self.assertListEqual(resolved_submission.categories, categories)

    def test_resolve_submission__accept_mark_superseded(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(
            reverse(
                "admin-community-library-submission-resolve",
                args=[self.submission.id],
            ),
            self.resolve_approve_metadata,
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

        self._refresh_submissions_from_db()

        self.assertEqual(
            self.superseded_submission.status,
            community_library_submission_constants.STATUS_SUPERSEDED,
        )
        self.assertEqual(
            self.not_superseded_submission.status,
            community_library_submission_constants.STATUS_PENDING,
        )
        self.assertEqual(
            self.submission_for_other_channel.status,
            community_library_submission_constants.STATUS_PENDING,
        )

    def test_resolve_submission__reject_do_not_mark_superseded(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.post(
            reverse(
                "admin-community-library-submission-resolve",
                args=[self.submission.id],
            ),
            self.resolve_reject_metadata,
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

        self._refresh_submissions_from_db()

        self.assertEqual(
            self.superseded_submission.status,
            community_library_submission_constants.STATUS_PENDING,
        )
        self.assertEqual(
            self.not_superseded_submission.status,
            community_library_submission_constants.STATUS_PENDING,
        )
        self.assertEqual(
            self.submission_for_other_channel.status,
            community_library_submission_constants.STATUS_PENDING,
        )
