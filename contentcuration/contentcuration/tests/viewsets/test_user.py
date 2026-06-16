from datetime import timedelta

from django.urls import reverse
from django.utils import timezone

from contentcuration.models import Change
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.tests.helpers import reverse_with_query
from contentcuration.tests.viewsets.base import generate_create_event
from contentcuration.tests.viewsets.base import generate_delete_event
from contentcuration.tests.viewsets.base import SyncTestMixin
from contentcuration.viewsets.sync.constants import CHANNEL
from contentcuration.viewsets.sync.constants import EDITOR_M2M
from contentcuration.viewsets.sync.constants import UPDATED
from contentcuration.viewsets.sync.constants import VIEWER_M2M


class SyncTestCase(SyncTestMixin, StudioAPITestCase):
    def setUp(self):
        super(SyncTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)

    def test_create_editor_and_viewer(self):
        editor = testdata.user(email="editor@e.com")
        viewer = testdata.user(email="viewer@v.com")
        self.client.force_authenticate(user=self.user)
        response = self.sync_changes(
            [
                generate_create_event(
                    [editor.id, self.channel.id],
                    EDITOR_M2M,
                    {},
                    channel_id=self.channel.id,
                    user_id=editor.id,
                ),
                generate_create_event(
                    [viewer.id, self.channel.id],
                    VIEWER_M2M,
                    {},
                    channel_id=self.channel.id,
                    user_id=viewer.id,
                ),
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(self.channel.editors.filter(id=editor.id).exists())
        self.assertTrue(self.channel.viewers.filter(id=viewer.id).exists())

    def test_delete_editor_and_viewer(self):
        editor = testdata.user(email="editor@e.com")
        self.channel.editors.add(editor)
        viewer = testdata.user(email="viewer@v.com")
        self.channel.viewers.add(viewer)
        self.client.force_authenticate(user=self.user)
        response = self.sync_changes(
            [
                generate_delete_event(
                    [editor.id, self.channel.id],
                    EDITOR_M2M,
                    channel_id=self.channel.id,
                    user_id=editor.id,
                ),
                generate_delete_event(
                    [viewer.id, self.channel.id],
                    VIEWER_M2M,
                    channel_id=self.channel.id,
                    user_id=viewer.id,
                ),
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(self.channel.editors.filter(id=editor.id).exists())
        self.assertFalse(self.channel.viewers.filter(id=viewer.id).exists())


class CRUDTestCase(StudioAPITestCase):
    def setUp(self):
        super(CRUDTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)

    def test_fetch_user(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(
            reverse("user-detail", kwargs={"pk": self.user.id}),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_no_create_user(self):
        self.client.force_authenticate(user=self.user)
        user = {}
        response = self.client.post(
            reverse("user-list"),
            user,
            format="json",
        )
        self.assertEqual(response.status_code, 405, response.content)

    def test_admin_no_create_user(self):
        self.user.is_admin = True
        self.user.save()
        self.client.force_authenticate(user=self.user)
        user = {}
        response = self.client.post(
            reverse("admin-users-list"),
            user,
            format="json",
        )
        self.assertEqual(response.status_code, 405, response.content)

    def test_no_update_user(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            reverse("user-detail", kwargs={"pk": self.user.id}),
            {"first_name": "janine"},
            format="json",
        )
        self.assertEqual(response.status_code, 405, response.content)

    def test_admin_update_user(self):
        self.user.is_admin = True
        self.user.save()
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            reverse("admin-users-detail", kwargs={"pk": self.user.id}),
            {"is_active": False},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

    def test_no_delete_user(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(
            reverse("user-detail", kwargs={"pk": self.user.id})
        )
        self.assertEqual(response.status_code, 405, response.content)

    def test_admin_delete_user(self):
        self.user.is_admin = True
        self.user.save()
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(
            reverse("admin-users-detail", kwargs={"pk": self.user.id})
        )
        self.assertEqual(response.status_code, 204, response.content)
        self.user.refresh_from_db()
        self.assertTrue(self.user.deleted)

    # --- Helpers for Kolibri-usage filter tests ---

    def _list_as_admin(self, **params):
        self.user.is_admin = True
        self.user.save()
        self.client.force_authenticate(user=self.user)
        return self.client.get(reverse("admin-users-list"), params, format="json")

    def _ids(self, response):
        # AdminUserViewSet's paginator returns a plain list when no page_size
        # is supplied; with page_size it returns the standard paginated shape.
        results = (
            response.data["results"]
            if isinstance(response.data, dict)
            else response.data
        )
        return {str(r["id"]) for r in results}

    def test_admin_users_published_channel_filter_returns_only_publishers(self):
        publisher = testdata.user(email="publisher@e.com")
        non_publisher = testdata.user(email="nonpub@e.com")

        published_channel = testdata.channel()
        published_channel.editors.add(publisher)
        published_channel.last_published = timezone.now()
        published_channel.save()

        draft_channel = testdata.channel()
        draft_channel.editors.add(non_publisher)

        response = self._list_as_admin(published_channel="true")
        self.assertEqual(response.status_code, 200, response.content)

        ids = self._ids(response)
        self.assertIn(str(publisher.id), ids)
        self.assertNotIn(str(non_publisher.id), ids)

    def test_admin_users_has_edits_filter_returns_only_users_with_change_rows(self):
        active_editor = testdata.user(email="editor@e.com")
        passive_user = testdata.user(email="passive@e.com")

        Change.objects.create(
            created_by=active_editor,
            channel=self.channel,
            table=CHANNEL,
            change_type=UPDATED,
            kwargs={},
            applied=False,
        )

        response = self._list_as_admin(has_edits="true")
        self.assertEqual(response.status_code, 200, response.content)

        ids = self._ids(response)
        self.assertIn(str(active_editor.id), ids)
        self.assertNotIn(str(passive_user.id), ids)

    def test_admin_users_joined_since_filter_excludes_older_users(self):
        recent_user = testdata.user(email="recent@e.com")
        recent_user.date_joined = timezone.now() - timedelta(days=10)
        recent_user.save()

        old_user = testdata.user(email="old@e.com")
        old_user.date_joined = timezone.now() - timedelta(days=365)
        old_user.save()

        cutoff = (timezone.now() - timedelta(days=30)).date().isoformat()
        response = self._list_as_admin(joined_since=cutoff)
        self.assertEqual(response.status_code, 200, response.content)

        ids = self._ids(response)
        self.assertIn(str(recent_user.id), ids)
        self.assertNotIn(str(old_user.id), ids)

    def test_admin_users_active_since_filter_excludes_dormant_users(self):
        recently_active = testdata.user(email="active@e.com")
        recently_active.last_login = timezone.now() - timedelta(days=5)
        recently_active.save()

        dormant = testdata.user(email="dormant@e.com")
        dormant.last_login = timezone.now() - timedelta(days=365)
        dormant.save()

        cutoff = (timezone.now() - timedelta(days=30)).date().isoformat()
        response = self._list_as_admin(active_since=cutoff)
        self.assertEqual(response.status_code, 200, response.content)

        ids = self._ids(response)
        self.assertIn(str(recently_active.id), ids)
        self.assertNotIn(str(dormant.id), ids)

    # --- Helpers for CSV download tests ---

    def _csv_url(self):
        return reverse("admin-users-download-csv")

    def _csv_body(self, response):
        return b"".join(response.streaming_content).decode("utf-8")

    def test_admin_users_download_csv_denied_for_non_admin(self):
        # self.user is not an admin (test_admin_update_user explicitly flips
        # the flag, so the baseline is non-admin).
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self._csv_url())
        self.assertEqual(response.status_code, 403, response.content)

    def test_admin_users_download_csv_requires_at_least_one_filter(self):
        # MissingRequiredParamsException returns 412 (matches existing
        # RequiredFilterSet convention used by ChannelUserViewSet).
        self.user.is_admin = True
        self.user.save()
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self._csv_url())
        self.assertEqual(response.status_code, 412, response.content)

    def test_admin_users_download_csv_streams_filtered_users(self):
        target = testdata.user(email="csv-target@e.com")
        target.first_name = "Csv"
        target.last_name = "Target"
        target.information = {
            "locations": ["US", "MX"],
            "space_needed": "10GB",
            "heard_from": "newsletter",
        }
        target.save()

        self.user.is_admin = True
        self.user.save()
        self.client.force_authenticate(user=self.user)

        response = self.client.get(self._csv_url() + f"?ids={target.id}")
        # response.content is unavailable on StreamingHttpResponse, so don't
        # pass it as the assertEqual message.
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "text/csv")
        self.assertIn("attachment", response["Content-Disposition"])
        self.assertIn("studio_users_", response["Content-Disposition"])

        body = self._csv_body(response)
        # Header row
        self.assertIn("First name", body)
        self.assertIn("Has published a channel", body)
        self.assertIn("Locations (country names)", body)
        self.assertIn("Heard from", body)
        # Data row
        self.assertIn("Csv", body)
        self.assertIn("Target", body)
        self.assertIn("newsletter", body)
        self.assertIn("10GB", body)
        # Country code -> name translation
        self.assertIn("United States", body)
        self.assertIn("Mexico", body)

    def test_admin_users_download_csv_handles_null_information(self):
        user_no_info = testdata.user(email="no-info@e.com")
        user_no_info.information = None
        user_no_info.save()

        self.user.is_admin = True
        self.user.save()
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self._csv_url() + f"?ids={user_no_info.id}")
        self.assertEqual(response.status_code, 200)
        body = self._csv_body(response)

        lines = body.strip().split("\n")
        self.assertEqual(len(lines), 2)
        self.assertNotIn("None", lines[1])

    def test_admin_users_download_csv_respects_filter_params(self):
        active = testdata.user(email="active-csv@e.com")
        active.is_active = True
        active.save()

        inactive = testdata.user(email="inactive-csv@e.com")
        inactive.is_active = False
        inactive.save()

        self.user.is_admin = True
        self.user.save()
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self._csv_url() + "?is_active=true")
        body = self._csv_body(response)

        self.assertIn("active-csv@e.com", body)
        self.assertNotIn("inactive-csv@e.com", body)


class ChannelUserCRUDTestCase(StudioAPITestCase):
    def setUp(self):
        super(ChannelUserCRUDTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)

    def test_fetch_users(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(
            reverse("user-list"),
            data={"channel": self.channel.id},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_fetch_users_no_permissions(self):
        new_channel = testdata.channel()
        self.client.force_authenticate(user=self.user)
        response = self.client.get(
            reverse("user-list"),
            data={"channel": new_channel.id},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json(), [])

    def test_remove_self_with_invalid_channel_id_returns_bad_request(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(
            reverse_with_query(
                "channeluser-remove-self",
                kwargs={"pk": self.user.id},
                query={"channel_id": "not-a-valid-uuid"},
            )
        )
        self.assertEqual(response.status_code, 400, response.content)

    def test_remove_self_with_missing_channel_returns_not_found(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(
            reverse_with_query(
                "channeluser-remove-self",
                kwargs={"pk": self.user.id},
                query={"channel_id": "00000000-0000-0000-0000-000000000000"},
            )
        )
        self.assertEqual(response.status_code, 404, response.content)


class MarkReadNotificationsTimestampTestCase(StudioAPITestCase):
    def setUp(self):
        super(MarkReadNotificationsTimestampTestCase, self).setUp()
        self.user = testdata.user()

    def test_mark_read_notifications_timestamp_success(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("user-mark-notifications-read"),
            data={"timestamp": "2023-12-16T10:00:00Z"},
            format="json",
        )
        self.assertEqual(response.status_code, 204, response.content)

    def test_mark_read_notifications_timestamp_invalid_format(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("user-mark-notifications-read"),
            data={"timestamp": "invalid-timestamp"},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)

    def test_mark_read_notifications_timestamp_missing_timestamp(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("user-mark-notifications-read"),
            data={},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)

    def test_mark_read_notifications_timestamp_unauthenticated(self):
        response = self.client.post(
            reverse("user-mark-notifications-read"),
            data={"timestamp": "2023-12-16T10:00:00Z"},
            format="json",
        )
        self.assertEqual(response.status_code, 403, response.content)

    def test_mark_read_notifications_timestamp_updates_field(self):
        timestamp = "2023-12-16T10:00:00Z"
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("user-mark-notifications-read"),
            data={"timestamp": timestamp},
            format="json",
        )

        self.assertEqual(response.status_code, 204, response.content)

        # Refresh user from database and check the timestamp was updated
        self.user.refresh_from_db()
        # Check that the last_read_notification_date field was updated
        self.assertIsNotNone(self.user.last_read_notification_date)
        self.assertEqual(
            self.user.last_read_notification_date.isoformat(),
            timestamp.replace("Z", "+00:00"),
        )
