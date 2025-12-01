import datetime
from unittest import mock

import pytz
from django.urls import reverse

from contentcuration.constants import (
    community_library_submission as community_library_submission_constants,
)
from contentcuration.models import Change
from contentcuration.models import CommunityLibrarySubmission
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.tests.helpers import reverse_with_query
from contentcuration.viewsets.sync.constants import ADDED_TO_COMMUNITY_LIBRARY


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

        # Mock to allow creating submissions without having to set up content databases
        self.ensure_db_exists_patcher = mock.patch(
            "contentcuration.utils.publish.ensure_versioned_database_exists"
        )
        self.ensure_db_exists_patcher.start()

        self.channel_with_submission1 = testdata.channel()
        self.channel_with_submission1.public = False
        self.channel_with_submission1.version = 1
        self.channel_with_submission1.editors.add(self.author_user)
        self.channel_with_submission1.editors.add(self.editor_user)
        self.channel_with_submission1.save()

        self.channel_with_submission2 = testdata.channel()
        self.channel_with_submission2.public = False
        self.channel_with_submission2.version = 1
        self.channel_with_submission2.editors.add(self.author_user)
        self.channel_with_submission2.editors.add(self.editor_user)
        self.channel_with_submission2.save()

        self.channel_without_submission = testdata.channel()
        self.channel_without_submission.public = False
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

        self.public_channel = testdata.channel()
        self.public_channel.public = True
        self.public_channel.version = 1
        self.public_channel.editors.add(self.author_user)
        self.public_channel.editors.add(self.editor_user)
        self.public_channel.save()

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

    def tearDown(self):
        self.ensure_db_exists_patcher.stop()
        super().tearDown()

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

    def test_create_submission__public_channel(self):
        self.client.force_authenticate(user=self.editor_user)
        submission = self.new_submission_metadata
        submission["channel"] = self.public_channel.id

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

    def test_create_submission__publishing_channel(self):
        self.client.force_authenticate(user=self.editor_user)

        submission_metadata = self.new_submission_metadata

        # Mark the channel referenced by the metadata as publishing
        from contentcuration.models import Channel
        from contentcuration.models import ContentNode

        channel = Channel.objects.get(id=submission_metadata["channel"])
        # Ensure main_tree exists; mark its publishing flag
        main_tree = channel.main_tree or ContentNode.objects.get(
            id=channel.main_tree_id
        )
        main_tree.publishing = True
        main_tree.save()

        response = self.client.post(
            reverse("community-library-submission-list"),
            submission_metadata,
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)

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

    def test_update_submission__is_admin__change_countries(self):
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

    def test_update_submission__is_admin__keep_countries(self):
        self.client.force_authenticate(user=self.admin_user)

        updated_submission_metadata = self.updated_submission_metadata.copy()
        updated_submission_metadata.pop("countries")

        response = self.client.put(
            reverse(
                "community-library-submission-detail",
                args=[self.existing_submission1.id],
            ),
            updated_submission_metadata,
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

        updated_submission = CommunityLibrarySubmission.objects.get(
            id=self.existing_submission1.id
        )
        self.assertEqual(updated_submission.countries.count(), 1)
        self.assertEqual(updated_submission.countries.first().code, "C1")

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

        self.resolved_time = datetime.datetime(2023, 10, 1, tzinfo=pytz.utc)

        # Mock django.utils.timezone.now for auto_now field updates
        self.django_timezone_patcher = mock.patch(
            "django.utils.timezone.now",
            return_value=self.resolved_time,
        )
        self.django_timezone_patcher.start()

        # Mock to allow creating submissions without having to set up content databases
        self.ensure_db_exists_patcher = mock.patch(
            "contentcuration.utils.publish.ensure_versioned_database_exists"
        )
        self.ensure_db_exists_patcher.start()

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


    def tearDown(self):
        self.django_timezone_patcher.stop()
        self.ensure_db_exists_patcher.stop()
        super().tearDown()

    def _manually_reject_submission(self):
        self.submission.status = community_library_submission_constants.STATUS_REJECTED
        self.submission.resolved_by = self.admin_user
        self.submission.resolution_reason = (
            community_library_submission_constants.REASON_INVALID_METADATA
        )
        self.submission.feedback_notes = self.feedback_notes
        self.submission.internal_notes = self.internal_notes
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

    @mock.patch(
        "contentcuration.viewsets.community_library_submission.apply_channel_changes_task"
    )
    def test_resolve_submission__accept_correct(self, apply_task_mock):
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
        self.assertEqual(resolved_submission.date_updated, self.resolved_time)

        self.assertTrue(
            Change.objects.filter(
                channel=self.submission.channel,
                change_type=ADDED_TO_COMMUNITY_LIBRARY,
            ).exists()
        )
        apply_task_mock.fetch_or_enqueue.assert_called_once_with(
            self.admin_user,
            channel_id=self.submission.channel.id,
        )

    @mock.patch(
        "contentcuration.viewsets.community_library_submission.apply_channel_changes_task"
    )
    def test_resolve_submission__reject_correct(self, apply_task_mock):
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
        self.assertEqual(resolved_submission.date_updated, self.resolved_time)

        self.assertFalse(
            Change.objects.filter(
                channel=self.submission.channel,
                change_type=ADDED_TO_COMMUNITY_LIBRARY,
            ).exists()
        )
        apply_task_mock.fetch_or_enqueue.assert_not_called()

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


class FilteringAndSearchTestCase(StudioAPITestCase):
    """
    Test cases for the new filtering and search functionality added for the notifications page.
    Tests date_updated filters, status__in filter, and channel name search.
    """

    def setUp(self):
        super().setUp()
        self.editor_user = testdata.user(email="editor@user.com")
        self.admin_user = testdata.user(email="admin@user.com")
        self.admin_user.is_admin = True
        self.admin_user.first_name = "Admin"
        self.admin_user.last_name = "User"
        self.admin_user.save()

        self.ensure_db_exists_patcher = mock.patch(
            "contentcuration.utils.publish.ensure_versioned_database_exists"
        )
        self.ensure_db_exists_patcher.start()

        self.math_channel = testdata.channel(name="Math Basics")
        self.math_channel.public = False
        self.math_channel.version = 1
        self.math_channel.editors.add(self.editor_user)
        self.math_channel.save()

        self.science_channel = testdata.channel(name="Science Fundamentals")
        self.science_channel.public = False
        self.science_channel.version = 1
        self.science_channel.editors.add(self.editor_user)
        self.science_channel.save()

        self.history_channel = testdata.channel(name="World History")
        self.history_channel.public = False
        self.history_channel.version = 1
        self.history_channel.editors.add(self.editor_user)
        self.history_channel.save()

        self.math_advanced_channel = testdata.channel(name="Advanced Math")
        self.math_advanced_channel.public = False
        self.math_advanced_channel.version = 1
        self.math_advanced_channel.editors.add(self.editor_user)
        self.math_advanced_channel.save()

        with mock.patch(
            "django.utils.timezone.now",
            return_value=datetime.datetime(2023, 1, 1, tzinfo=pytz.utc),
        ):
            self.old_pending_submission = CommunityLibrarySubmission.objects.create(
                channel=self.math_channel,
                author=self.editor_user,
                channel_version=1,
                status=community_library_submission_constants.STATUS_PENDING,
                date_created=datetime.datetime(2023, 1, 1, tzinfo=pytz.utc),
            )

        with mock.patch(
            "django.utils.timezone.now",
            return_value=datetime.datetime(2024, 6, 15, tzinfo=pytz.utc),
        ):
            self.recent_approved_submission = CommunityLibrarySubmission.objects.create(
                channel=self.science_channel,
                author=self.editor_user,
                channel_version=1,
                status=community_library_submission_constants.STATUS_APPROVED,
                date_created=datetime.datetime(2024, 6, 1, tzinfo=pytz.utc),
                resolved_by=self.admin_user,
            )

        with mock.patch(
            "django.utils.timezone.now",
            return_value=datetime.datetime(2024, 7, 10, tzinfo=pytz.utc),
        ):
            self.recent_rejected_submission = CommunityLibrarySubmission.objects.create(
                channel=self.history_channel,
                author=self.editor_user,
                channel_version=1,
                status=community_library_submission_constants.STATUS_REJECTED,
                date_created=datetime.datetime(2024, 7, 1, tzinfo=pytz.utc),
                resolved_by=self.admin_user,
            )

        with mock.patch(
            "django.utils.timezone.now",
            return_value=datetime.datetime(2024, 12, 1, tzinfo=pytz.utc),
        ):
            self.very_recent_pending_submission = (
                CommunityLibrarySubmission.objects.create(
                    channel=self.math_advanced_channel,
                    author=self.editor_user,
                    channel_version=1,
                    status=community_library_submission_constants.STATUS_PENDING,
                    date_created=datetime.datetime(2024, 12, 1, tzinfo=pytz.utc),
                )
            )

    def tearDown(self):
        self.ensure_db_exists_patcher.stop()
        super().tearDown()

    def test_filter_by_date_updated_gte(self):
        """Test filtering submissions updated on or after a specific date"""
        self.client.force_authenticate(user=self.editor_user)
        response = self.client.get(
            reverse_with_query(
                "community-library-submission-list",
                query={"date_updated__gte": "2024-06-01"},
            )
        )
        self.assertEqual(response.status_code, 200, response.content)

        results = response.data
        self.assertEqual(len(results), 3)
        submission_ids = [r["id"] for r in results]
        self.assertNotIn(self.old_pending_submission.id, submission_ids)

    def test_filter_by_date_updated_lte(self):
        """Test filtering submissions updated on or before a specific date"""
        self.client.force_authenticate(user=self.editor_user)
        response = self.client.get(
            reverse_with_query(
                "community-library-submission-list",
                query={"date_updated__lte": "2024-06-30"},
            )
        )
        self.assertEqual(response.status_code, 200, response.content)

        results = response.data
        self.assertEqual(len(results), 2)
        submission_ids = [r["id"] for r in results]
        self.assertIn(self.old_pending_submission.id, submission_ids)
        self.assertIn(self.recent_approved_submission.id, submission_ids)

    def test_filter_by_date_updated_range(self):
        """Test filtering submissions within a date range"""
        self.client.force_authenticate(user=self.editor_user)
        response = self.client.get(
            reverse_with_query(
                "community-library-submission-list",
                query={
                    "date_updated__gte": "2024-06-01",
                    "date_updated__lte": "2024-07-31",
                },
            )
        )
        self.assertEqual(response.status_code, 200, response.content)

        results = response.data
        self.assertEqual(len(results), 2)
        submission_ids = [r["id"] for r in results]
        self.assertIn(self.recent_approved_submission.id, submission_ids)
        self.assertIn(self.recent_rejected_submission.id, submission_ids)

    def test_filter_by_status_in_single(self):
        """Test filtering by a single status"""
        self.client.force_authenticate(user=self.editor_user)
        response = self.client.get(
            reverse_with_query(
                "community-library-submission-list",
                query={
                    "status__in": community_library_submission_constants.STATUS_APPROVED
                },
            )
        )
        self.assertEqual(response.status_code, 200, response.content)

        results = response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], self.recent_approved_submission.id)
        self.assertEqual(
            results[0]["status"],
            community_library_submission_constants.STATUS_APPROVED,
        )

    def test_filter_by_status_in_multiple(self):
        """Test filtering by multiple statuses"""
        self.client.force_authenticate(user=self.editor_user)
        url = reverse("community-library-submission-list")
        response = self.client.get(
            f"{url}?status__in={community_library_submission_constants.STATUS_APPROVED},{community_library_submission_constants.STATUS_REJECTED}"
        )
        self.assertEqual(response.status_code, 200, response.content)

        results = response.data
        self.assertEqual(len(results), 2)
        statuses = [r["status"] for r in results]
        self.assertIn(community_library_submission_constants.STATUS_APPROVED, statuses)
        self.assertIn(community_library_submission_constants.STATUS_REJECTED, statuses)
        self.assertNotIn(
            community_library_submission_constants.STATUS_PENDING, statuses
        )

    def test_search_by_channel_name(self):
        """Test searching submissions by channel name"""
        self.client.force_authenticate(user=self.editor_user)
        response = self.client.get(
            reverse_with_query(
                "community-library-submission-list",
                query={"search": "Math"},
            )
        )
        self.assertEqual(response.status_code, 200, response.content)

        results = response.data
        self.assertEqual(len(results), 2)
        channel_ids = [r["channel_id"] for r in results]
        self.assertIn(self.math_channel.id, channel_ids)
        self.assertIn(self.math_advanced_channel.id, channel_ids)

    def test_search_by_channel_name_partial(self):
        """Test searching with partial channel name"""
        self.client.force_authenticate(user=self.editor_user)
        response = self.client.get(
            reverse_with_query(
                "community-library-submission-list",
                query={"search": "Science"},
            )
        )
        self.assertEqual(response.status_code, 200, response.content)

        results = response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["channel_id"], self.science_channel.id)

    def test_combined_filters(self):
        """Test combining multiple filters together"""
        self.client.force_authenticate(user=self.editor_user)
        response = self.client.get(
            reverse_with_query(
                "community-library-submission-list",
                query={
                    "date_updated__gte": "2024-01-01",
                    "status__in": community_library_submission_constants.STATUS_PENDING,
                    "search": "Math",
                },
            )
        )
        self.assertEqual(response.status_code, 200, response.content)

        results = response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], self.very_recent_pending_submission.id)
        self.assertEqual(
            results[0]["status"],
            community_library_submission_constants.STATUS_PENDING,
        )
        self.assertEqual(results[0]["channel_id"], self.math_advanced_channel.id)

    def test_resolved_by_name_visible_to_editor(self):
        """Test that editors can now see who resolved their submissions"""
        self.client.force_authenticate(user=self.editor_user)
        response = self.client.get(
            reverse(
                "community-library-submission-detail",
                args=[self.recent_approved_submission.id],
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

        result = response.data
        self.assertIn("resolved_by_id", result)
        self.assertIn("resolved_by_name", result)
        self.assertEqual(result["resolved_by_id"], self.admin_user.id)
        self.assertEqual(
            result["resolved_by_name"],
            f"{self.admin_user.first_name} {self.admin_user.last_name}",
        )

    def test_resolved_by_name_null_for_unresolved(self):
        """Test that resolved_by_name is None for unresolved submissions"""
        self.client.force_authenticate(user=self.editor_user)
        response = self.client.get(
            reverse(
                "community-library-submission-detail",
                args=[self.old_pending_submission.id],
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

        result = response.data
        self.assertIsNone(result.get("resolved_by_id"))
        self.assertIsNone(result.get("resolved_by_name"))

    def test_pagination_ordering_by_date_updated(self):
        """Test that results are ordered by -date_updated (most recent first)"""
        self.client.force_authenticate(user=self.editor_user)
        response = self.client.get(
            reverse("community-library-submission-list"),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

        results = response.data
        self.assertEqual(len(results), 4)
        self.assertEqual(results[0]["id"], self.very_recent_pending_submission.id)
        self.assertEqual(results[3]["id"], self.old_pending_submission.id)

    def test_admin_can_use_filters(self):
        """Test that admin users can also use the new filters"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(
            reverse_with_query(
                "admin-community-library-submission-list",
                query={
                    "date_updated__gte": "2024-06-01",
                    "status__in": community_library_submission_constants.STATUS_APPROVED,
                },
            )
        )
        self.assertEqual(response.status_code, 200, response.content)

        results = response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], self.recent_approved_submission.id)
