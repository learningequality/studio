from django.urls import reverse

from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.tests.viewsets.base import generate_create_event
from contentcuration.tests.viewsets.base import generate_delete_event
from contentcuration.tests.viewsets.base import SyncTestMixin
from contentcuration.viewsets.sync.constants import EDITOR_M2M
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
