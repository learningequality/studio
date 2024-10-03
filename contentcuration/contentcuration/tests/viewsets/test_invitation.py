from __future__ import absolute_import

import uuid

from django.urls import reverse

from contentcuration import models
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.tests.viewsets.base import generate_create_event
from contentcuration.tests.viewsets.base import generate_delete_event
from contentcuration.tests.viewsets.base import generate_update_event
from contentcuration.tests.viewsets.base import SyncTestMixin
from contentcuration.viewsets.sync.constants import INVITATION


class SyncTestCase(SyncTestMixin, StudioAPITestCase):

    @property
    def invitation_metadata(self):
        return {
            "id": uuid.uuid4().hex,
            "channel": self.channel.id,
            "email": self.invited_user.email,
        }

    @property
    def invitation_db_metadata(self):
        return {
            "id": uuid.uuid4().hex,
            "channel_id": self.channel.id,
            "email": self.invited_user.email,
            "invited": self.invited_user,
            "sender": self.user,
        }

    def setUp(self):
        super(SyncTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)
        self.invited_user = testdata.user("inv@inc.com")
        self.client.force_authenticate(user=self.user)

    def test_create_invitation(self):
        invitation = self.invitation_metadata
        response = self.sync_changes(
            [generate_create_event(invitation["id"], INVITATION, invitation, channel_id=self.channel.id, user_id=self.invited_user.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.Invitation.objects.get(id=invitation["id"])
        except models.Invitation.DoesNotExist:
            self.fail("Invitation was not created")

    def test_create_invitations(self):
        invitation1 = self.invitation_metadata
        invitation2 = self.invitation_metadata
        response = self.sync_changes(
            [
                generate_create_event(invitation1["id"], INVITATION, invitation1, channel_id=self.channel.id, user_id=self.invited_user.id),
                generate_create_event(invitation2["id"], INVITATION, invitation2, channel_id=self.channel.id, user_id=self.invited_user.id),
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.Invitation.objects.get(id=invitation1["id"])
        except models.Invitation.DoesNotExist:
            self.fail("Invitation 1 was not created")

        try:
            models.Invitation.objects.get(id=invitation2["id"])
        except models.Invitation.DoesNotExist:
            self.fail("Invitation 2 was not created")

    def test_create_invitation_no_channel_permission(self):
        self.client.force_authenticate(user=self.user)
        new_channel = testdata.channel()
        invitation = self.invitation_metadata
        invitation["channel"] = new_channel.id
        response = self.sync_changes(
            [generate_create_event(invitation["id"], INVITATION, invitation, channel_id=self.channel.id, user_id=self.invited_user.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.Invitation.objects.get(id=invitation["id"])
            self.fail("Invitation was created")
        except models.Invitation.DoesNotExist:
            pass

    def test_update_invitation_accept(self):

        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)

        self.client.force_authenticate(user=self.invited_user)
        response = self.sync_changes(
            [generate_update_event(invitation.id, INVITATION, {"accepted": True}, user_id=self.invited_user.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.Invitation.objects.get(id=invitation.id)
        except models.Invitation.DoesNotExist:
            self.fail("Invitation was deleted")
        self.assertTrue(self.channel.editors.filter(pk=self.invited_user.id).exists())
        self.assertTrue(
            models.Invitation.objects.filter(
                email=self.invited_user.email, channel=self.channel
            ).exists()
        )
        self.assertTrue(models.Change.objects.filter(channel=self.channel).exists())

    def test_update_invitation_revoke(self):

        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)

        response = self.sync_changes(
            [generate_update_event(invitation.id, INVITATION, {"revoked": True}, channel_id=self.channel.id, user_id=self.invited_user.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            invitation = models.Invitation.objects.get(id=invitation.id)
        except models.Invitation.DoesNotExist:
            self.fail("Invitation was deleted")
        self.assertFalse(self.channel.editors.filter(pk=self.invited_user.id).exists())
        self.assertTrue(
            models.Invitation.objects.filter(
                email=self.invited_user.email, channel=self.channel
            ).exists()
        )
        self.assertTrue(invitation.revoked)

    def test_update_invitation_invited_user_cannot_revoke(self):

        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)

        self.client.force_authenticate(user=self.invited_user)
        response = self.sync_changes(
            [generate_update_event(invitation.id, INVITATION, {"revoked": True}, channel_id=self.channel.id, user_id=self.invited_user.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        invitation = models.Invitation.objects.get(id=invitation.id)
        self.assertFalse(invitation.revoked)

    def test_update_invitation_invited_user_cannot_accept_revoked_invitation(self):

        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)
        invitation.revoked = True
        invitation.save()

        self.client.force_authenticate(user=self.invited_user)
        response = self.sync_changes(
            [generate_update_event(invitation.id, INVITATION, {"accepted": True}, channel_id=self.channel.id, user_id=self.invited_user.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        invitation = models.Invitation.objects.get(id=invitation.id)
        self.assertFalse(invitation.accepted)

    def test_update_invitation_sender_cannot_modify_invited_user_fields(self):

        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)

        response = self.sync_changes(
            [generate_update_event(invitation.id, INVITATION, {"accepted": True, "declined": True}, channel_id=self.channel.id, user_id=self.invited_user.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        invitation = models.Invitation.objects.get(id=invitation.id)
        self.assertFalse(invitation.accepted)
        self.assertFalse(invitation.declined)

    def test_update_invitation_decline(self):

        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)

        response = self.sync_changes(
            [generate_update_event(invitation.id, INVITATION, {"declined": True}, channel_id=self.channel.id, user_id=self.invited_user.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.Invitation.objects.get(id=invitation.id)
        except models.Invitation.DoesNotExist:
            self.fail("Invitation was deleted")
        self.assertFalse(self.channel.editors.filter(pk=self.invited_user.id).exists())
        self.assertTrue(
            models.Invitation.objects.filter(
                email=self.invited_user.email, channel=self.channel
            ).exists()
        )

    def test_update_invitation_empty(self):

        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)
        response = self.sync_changes(
            [generate_update_event(invitation.id, INVITATION, {}, channel_id=self.channel.id, user_id=self.invited_user.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_update_invitation_unwriteable_fields(self):

        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)
        response = self.sync_changes(
            [
                generate_update_event(
                    invitation.id, INVITATION, {"not_a_field": "not_a_value"}, channel_id=self.channel.id, user_id=self.invited_user.id
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_delete_invitation(self):

        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)

        response = self.sync_changes(
            [generate_delete_event(invitation.id, INVITATION, channel_id=self.channel.id, user_id=self.invited_user.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.Invitation.objects.get(id=invitation.id)
            self.fail("Invitation was not deleted")
        except models.Invitation.DoesNotExist:
            pass

    def test_delete_invitations(self):
        invitation1 = models.Invitation.objects.create(**self.invitation_db_metadata)

        invitation2 = models.Invitation.objects.create(**self.invitation_db_metadata)

        response = self.sync_changes(
            [
                generate_delete_event(invitation1.id, INVITATION, channel_id=self.channel.id, user_id=self.invited_user.id),
                generate_delete_event(invitation2.id, INVITATION, channel_id=self.channel.id, user_id=self.invited_user.id),
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.Invitation.objects.get(id=invitation1.id)
            self.fail("Invitation 1 was not deleted")
        except models.Invitation.DoesNotExist:
            pass

        try:
            models.Invitation.objects.get(id=invitation2.id)
            self.fail("Invitation 2 was not deleted")
        except models.Invitation.DoesNotExist:
            pass


class CRUDTestCase(StudioAPITestCase):
    @property
    def invitation_metadata(self):
        return {
            "id": uuid.uuid4().hex,
            "channel": self.channel.id,
            "email": self.invited_user.email,
        }

    @property
    def invitation_db_metadata(self):
        return {
            "id": uuid.uuid4().hex,
            "channel_id": self.channel.id,
            "email": self.invited_user.email,
            "invited": self.invited_user,
            "sender": self.user,
        }

    def setUp(self):
        super(CRUDTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)
        self.invited_user = testdata.user("inv@inc.com")

    def test_create_invitation(self):
        self.client.force_authenticate(user=self.user)
        invitation = self.invitation_metadata
        response = self.client.post(
            reverse("invitation-list"), invitation, format="json",
        )
        self.assertEqual(response.status_code, 405, response.content)

    def test_update_invitation_accept(self):
        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)

        self.client.force_authenticate(user=self.invited_user)
        response = self.client.post(reverse("invitation-accept", kwargs={"pk": invitation.id}))
        self.assertEqual(response.status_code, 200, response.content)
        try:
            invitation = models.Invitation.objects.get(id=invitation.id)
        except models.Invitation.DoesNotExist:
            self.fail("Invitation was deleted")

        self.assertTrue(invitation.accepted)
        self.assertTrue(self.channel.editors.filter(pk=self.invited_user.id).exists())
        self.assertTrue(
            models.Invitation.objects.filter(
                email=self.invited_user.email, channel=self.channel
            ).exists()
        )
        self.assertTrue(models.Change.objects.filter(channel=self.channel).exists())

    def test_update_invitation(self):

        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)

        self.client.force_authenticate(user=self.invited_user)
        response = self.client.patch(
            reverse("invitation-detail", kwargs={"pk": invitation.id}),
            {"declined": True},
            format="json",
        )
        self.assertEqual(response.status_code, 405, response.content)

    def test_delete_invitation(self):
        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)

        self.client.force_authenticate(user=self.user)
        response = self.client.delete(
            reverse("invitation-detail", kwargs={"pk": invitation.id})
        )
        self.assertEqual(response.status_code, 405, response.content)

    def test_update_invitation_decline(self):
        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)

        self.client.force_authenticate(user=self.invited_user)
        response = self.client.post(reverse("invitation-decline", kwargs={"pk": invitation.id}))
        self.assertEqual(response.status_code, 200, response.content)
        try:
            invitation = models.Invitation.objects.get(id=invitation.id)
        except models.Invitation.DoesNotExist:
            self.fail("Invitation was deleted")

        self.assertTrue(invitation.declined)
        self.assertFalse(self.channel.editors.filter(pk=self.invited_user.id).exists())
        self.assertTrue(
            models.Invitation.objects.filter(
                email=self.invited_user.email, channel=self.channel
            ).exists()
        )
        self.assertTrue(models.Change.objects.filter(channel=self.channel).exists())
