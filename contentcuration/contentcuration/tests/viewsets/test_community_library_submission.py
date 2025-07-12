from urllib.parse import urlencode

from django.urls import reverse

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
        self.assertEqual(result["author_first_name"], self.author_user.first_name)
        self.assertEqual(result["author_last_name"], self.author_user.last_name)

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
