import uuid

from django.urls import reverse

from contentcuration import models
from contentcuration.constants.organization_roles import ORGANIZATION_ADMIN
from contentcuration.constants.organization_roles import ORGANIZATION_EDITOR
from contentcuration.constants.organization_roles import (
    ORGANIZATION_ROLE_STATUS_ACTIVE,
)
from contentcuration.models import ADMIN_ACCESS
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
            [
                generate_create_event(
                    invitation["id"],
                    INVITATION,
                    invitation,
                    channel_id=self.channel.id,
                    user_id=self.invited_user.id,
                )
            ],
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
                generate_create_event(
                    invitation1["id"],
                    INVITATION,
                    invitation1,
                    channel_id=self.channel.id,
                    user_id=self.invited_user.id,
                ),
                generate_create_event(
                    invitation2["id"],
                    INVITATION,
                    invitation2,
                    channel_id=self.channel.id,
                    user_id=self.invited_user.id,
                ),
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
            [
                generate_create_event(
                    invitation["id"],
                    INVITATION,
                    invitation,
                    channel_id=self.channel.id,
                    user_id=self.invited_user.id,
                )
            ],
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
            [
                generate_update_event(
                    invitation.id,
                    INVITATION,
                    {"accepted": True},
                    user_id=self.invited_user.id,
                )
            ],
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

    def test_update_invitation_accept_admin_share_mode_grants_editor_access(self):
        invitation = models.Invitation.objects.create(
            share_mode=ADMIN_ACCESS, **self.invitation_db_metadata
        )

        self.client.force_authenticate(user=self.invited_user)
        response = self.sync_changes(
            [
                generate_update_event(
                    invitation.id,
                    INVITATION,
                    {"accepted": True},
                    user_id=self.invited_user.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        invitation.refresh_from_db()
        self.assertTrue(invitation.accepted)
        self.assertTrue(self.channel.editors.filter(pk=self.invited_user.id).exists())

    def test_update_invitation_revoke(self):

        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)

        response = self.sync_changes(
            [
                generate_update_event(
                    invitation.id,
                    INVITATION,
                    {"revoked": True},
                    channel_id=self.channel.id,
                    user_id=self.invited_user.id,
                )
            ],
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
            [
                generate_update_event(
                    invitation.id,
                    INVITATION,
                    {"revoked": True},
                    channel_id=self.channel.id,
                    user_id=self.invited_user.id,
                )
            ],
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
            [
                generate_update_event(
                    invitation.id,
                    INVITATION,
                    {"accepted": True},
                    channel_id=self.channel.id,
                    user_id=self.invited_user.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        invitation = models.Invitation.objects.get(id=invitation.id)
        self.assertFalse(invitation.accepted)

    def test_update_invitation_sender_cannot_modify_invited_user_fields(self):

        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)

        response = self.sync_changes(
            [
                generate_update_event(
                    invitation.id,
                    INVITATION,
                    {"accepted": True, "declined": True},
                    channel_id=self.channel.id,
                    user_id=self.invited_user.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        invitation = models.Invitation.objects.get(id=invitation.id)
        self.assertFalse(invitation.accepted)
        self.assertFalse(invitation.declined)

    def test_update_invitation_cannot_add_organization(self):
        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)
        organization = testdata.organization()
        testdata.organization_role(self.user, organization)

        response = self.sync_changes(
            [
                generate_update_event(
                    invitation.id,
                    INVITATION,
                    {"organization": organization.id},
                    channel_id=self.channel.id,
                    user_id=self.invited_user.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.json()["errors"]), 1)
        invitation.refresh_from_db()
        self.assertIsNone(invitation.organization_id)

    def test_update_invitation_decline(self):

        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)

        response = self.sync_changes(
            [
                generate_update_event(
                    invitation.id,
                    INVITATION,
                    {"declined": True},
                    channel_id=self.channel.id,
                    user_id=self.invited_user.id,
                )
            ],
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
            [
                generate_update_event(
                    invitation.id,
                    INVITATION,
                    {},
                    channel_id=self.channel.id,
                    user_id=self.invited_user.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_update_invitation_unwriteable_fields(self):

        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)
        response = self.sync_changes(
            [
                generate_update_event(
                    invitation.id,
                    INVITATION,
                    {"not_a_field": "not_a_value"},
                    channel_id=self.channel.id,
                    user_id=self.invited_user.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_delete_invitation(self):

        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)

        response = self.sync_changes(
            [
                generate_delete_event(
                    invitation.id,
                    INVITATION,
                    channel_id=self.channel.id,
                    user_id=self.invited_user.id,
                )
            ],
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
                generate_delete_event(
                    invitation1.id,
                    INVITATION,
                    channel_id=self.channel.id,
                    user_id=self.invited_user.id,
                ),
                generate_delete_event(
                    invitation2.id,
                    INVITATION,
                    channel_id=self.channel.id,
                    user_id=self.invited_user.id,
                ),
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


class OrganizationInvitationSyncTestCase(SyncTestMixin, StudioAPITestCase):
    def setUp(self):
        super(OrganizationInvitationSyncTestCase, self).setUp()
        self.organization = testdata.organization()
        self.org_admin = testdata.user("org-admin@inc.com")
        testdata.organization_role(self.org_admin, self.organization)
        self.invited_user = testdata.user("org-invitee@inc.com")
        self.client.force_authenticate(user=self.org_admin)

    def test_accept_organization_invitation_creates_role(self):
        invitation = models.Invitation.objects.create(
            id=uuid.uuid4().hex,
            organization=self.organization,
            email=self.invited_user.email,
            invited=self.invited_user,
            sender=self.org_admin,
        )
        self.client.force_authenticate(user=self.invited_user)
        response = self.sync_changes(
            [
                generate_update_event(
                    invitation.id,
                    INVITATION,
                    {"accepted": True},
                    user_id=self.invited_user.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        invitation.refresh_from_db()
        self.assertTrue(invitation.accepted)
        role = models.OrganizationRole.objects.get(
            user=self.invited_user, organization=self.organization
        )
        self.assertEqual(role.role, ORGANIZATION_EDITOR)
        self.assertEqual(role.status, ORGANIZATION_ROLE_STATUS_ACTIVE)

    def test_revoke_organization_invitation_by_admin(self):
        invitation = models.Invitation.objects.create(
            id=uuid.uuid4().hex,
            organization=self.organization,
            email=self.invited_user.email,
            sender=self.org_admin,
        )
        response = self.sync_changes(
            [
                generate_update_event(
                    invitation.id,
                    INVITATION,
                    {"revoked": True},
                    user_id=self.org_admin.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        invitation.refresh_from_db()
        self.assertTrue(invitation.revoked)

    def test_revoke_organization_invitation_by_non_admin_rejected(self):
        editor = testdata.user("org-editor2@inc.com")
        testdata.organization_role(editor, self.organization, role=ORGANIZATION_EDITOR)
        self.client.force_authenticate(user=editor)

        invitation = models.Invitation.objects.create(
            id=uuid.uuid4().hex,
            organization=self.organization,
            email=self.invited_user.email,
            sender=self.org_admin,
        )
        response = self.sync_changes(
            [
                generate_update_event(
                    invitation.id,
                    INVITATION,
                    {"revoked": True},
                    user_id=editor.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        invitation.refresh_from_db()
        self.assertFalse(invitation.revoked)

    def test_revoke_organization_invitation_by_different_admin(self):
        other_admin = testdata.user("org-admin-3@inc.com")
        testdata.organization_role(other_admin, self.organization)

        invitation = models.Invitation.objects.create(
            id=uuid.uuid4().hex,
            organization=self.organization,
            email=self.invited_user.email,
            sender=self.org_admin,
        )
        self.client.force_authenticate(user=other_admin)
        response = self.sync_changes(
            [
                generate_update_event(
                    invitation.id,
                    INVITATION,
                    {"revoked": True},
                    user_id=other_admin.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        invitation.refresh_from_db()
        self.assertTrue(invitation.revoked)

    def test_admin_cannot_force_accept_on_behalf_of_invitee(self):
        # Org-admin edit rights must not let an admin trigger accept() on
        # someone else's invitation - accepted stays read-only for them.
        invitation = models.Invitation.objects.create(
            id=uuid.uuid4().hex,
            organization=self.organization,
            email=self.invited_user.email,
            sender=self.org_admin,
        )
        response = self.sync_changes(
            [
                generate_update_event(
                    invitation.id,
                    INVITATION,
                    {"accepted": True},
                    user_id=self.org_admin.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        invitation.refresh_from_db()
        self.assertFalse(invitation.accepted)
        self.assertFalse(
            models.OrganizationRole.objects.filter(
                user=self.invited_user, organization=self.organization
            ).exists()
        )

    def test_invitee_cannot_raise_own_share_mode_before_accepting(self):
        # share_mode must be read-only for the invitee, same as
        # accepted/revoked - otherwise they could self-escalate to org
        # admin (which itself grants edit rights over the org's invitations)
        # by requesting "admin" access before accepting.
        invitation = models.Invitation.objects.create(
            id=uuid.uuid4().hex,
            organization=self.organization,
            email=self.invited_user.email,
            sender=self.org_admin,
        )
        self.client.force_authenticate(user=self.invited_user)
        response = self.sync_changes(
            [
                generate_update_event(
                    invitation.id,
                    INVITATION,
                    {"share_mode": ADMIN_ACCESS, "accepted": True},
                    user_id=self.invited_user.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        invitation.refresh_from_db()
        self.assertTrue(invitation.accepted)
        self.assertNotEqual(invitation.share_mode, ADMIN_ACCESS)
        role = models.OrganizationRole.objects.get(
            user=self.invited_user, organization=self.organization
        )
        self.assertNotEqual(role.role, ORGANIZATION_ADMIN)
        self.assertEqual(role.role, ORGANIZATION_EDITOR)

    def test_delete_organization_invitation(self):
        invitation = models.Invitation.objects.create(
            id=uuid.uuid4().hex,
            organization=self.organization,
            email=self.invited_user.email,
            sender=self.org_admin,
        )
        response = self.sync_changes(
            [
                generate_delete_event(
                    invitation.id,
                    INVITATION,
                    user_id=self.org_admin.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.Invitation.objects.get(id=invitation.id)
            self.fail("Organization invitation was not deleted")
        except models.Invitation.DoesNotExist:
            pass

    def test_list_invitations_filtered_by_organization(self):
        invitation = models.Invitation.objects.create(
            id=uuid.uuid4().hex,
            organization=self.organization,
            email=self.invited_user.email,
            sender=self.org_admin,
        )
        other_organization = testdata.organization()
        other_invitation = models.Invitation.objects.create(
            id=uuid.uuid4().hex,
            organization=other_organization,
            email=self.invited_user.email,
            sender=self.org_admin,
        )
        response = self.client.get(
            reverse("invitation-list"), {"organization": self.organization.id}
        )
        self.assertEqual(response.status_code, 200, response.content)
        payload = response.json()
        results = payload["results"] if isinstance(payload, dict) else payload
        returned_ids = [item["id"] for item in results]
        self.assertIn(invitation.id, returned_ids)
        self.assertNotIn(other_invitation.id, returned_ids)


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
            reverse("invitation-list"),
            invitation,
            format="json",
        )
        self.assertEqual(response.status_code, 405, response.content)

    def test_update_invitation_accept(self):
        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)

        self.client.force_authenticate(user=self.invited_user)
        response = self.client.post(
            reverse("invitation-accept", kwargs={"pk": invitation.id})
        )
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
        response = self.client.post(
            reverse("invitation-decline", kwargs={"pk": invitation.id})
        )
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

    def test_accept_invitation_by_channel_editor_is_forbidden(self):
        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("invitation-accept", kwargs={"pk": invitation.id})
        )
        self.assertEqual(response.status_code, 403, response.content)
        invitation.refresh_from_db()
        self.assertFalse(invitation.accepted)

    def test_decline_invitation_by_channel_editor_is_forbidden(self):
        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("invitation-decline", kwargs={"pk": invitation.id})
        )
        self.assertEqual(response.status_code, 403, response.content)
        invitation.refresh_from_db()
        self.assertFalse(invitation.declined)

    def test_accept_invitation_by_unrelated_user_is_not_found(self):
        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)
        unrelated_user = testdata.user("unrelated@example.com")

        self.client.force_authenticate(user=unrelated_user)
        response = self.client.post(
            reverse("invitation-accept", kwargs={"pk": invitation.id})
        )
        self.assertEqual(response.status_code, 404, response.content)
        invitation.refresh_from_db()
        self.assertFalse(invitation.accepted)

    def test_decline_invitation_by_unrelated_user_is_not_found(self):
        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)
        unrelated_user = testdata.user("unrelated@example.com")

        self.client.force_authenticate(user=unrelated_user)
        response = self.client.post(
            reverse("invitation-decline", kwargs={"pk": invitation.id})
        )
        self.assertEqual(response.status_code, 404, response.content)
        invitation.refresh_from_db()
        self.assertFalse(invitation.declined)

    def _make_admin(self, email="admin@example.com"):
        user = testdata.user(email)
        user.is_admin = True
        user.save()
        return user

    def test_accept_invitation_by_admin_succeeds(self):
        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)
        admin_user = self._make_admin()

        self.client.force_authenticate(user=admin_user)
        response = self.client.post(
            reverse("invitation-accept", kwargs={"pk": invitation.id})
        )
        self.assertEqual(response.status_code, 200, response.content)
        invitation.refresh_from_db()
        self.assertTrue(invitation.accepted)

    def test_decline_invitation_by_admin_succeeds(self):
        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)
        admin_user = self._make_admin()

        self.client.force_authenticate(user=admin_user)
        response = self.client.post(
            reverse("invitation-decline", kwargs={"pk": invitation.id})
        )
        self.assertEqual(response.status_code, 200, response.content)
        invitation.refresh_from_db()
        self.assertTrue(invitation.declined)

    def test_accept_revoked_invitation_returns_400(self):
        invitation = models.Invitation.objects.create(**self.invitation_db_metadata)
        invitation.revoked = True
        invitation.save()

        self.client.force_authenticate(user=self.invited_user)
        response = self.client.post(
            reverse("invitation-accept", kwargs={"pk": invitation.id})
        )
        self.assertEqual(response.status_code, 400, response.content)
        invitation.refresh_from_db()
        self.assertFalse(invitation.accepted)
        self.assertFalse(self.channel.editors.filter(pk=self.invited_user.id).exists())
