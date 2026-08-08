import uuid

from django.urls import reverse

from contentcuration import models
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
        # _accept_channel_invitation only special-cases VIEW_ACCESS, so
        # "admin" currently grants the same editor access as "edit".
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
    @property
    def invitation_metadata(self):
        return {
            "id": uuid.uuid4().hex,
            "organization": self.organization.id,
            "email": self.invited_user.email,
        }

    def setUp(self):
        super(OrganizationInvitationSyncTestCase, self).setUp()
        self.organization = testdata.organization()
        self.org_admin = testdata.user("org-admin@inc.com")
        testdata.organization_role(self.org_admin, self.organization)
        self.invited_user = testdata.user("org-invitee@inc.com")
        self.client.force_authenticate(user=self.org_admin)

    def test_create_organization_invitation(self):
        invitation = self.invitation_metadata
        response = self.sync_changes(
            [
                generate_create_event(
                    invitation["id"],
                    INVITATION,
                    invitation,
                    user_id=self.org_admin.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.Invitation.objects.get(id=invitation["id"])
        except models.Invitation.DoesNotExist:
            self.fail("Organization invitation was not created")

    def test_create_organization_invitation_by_non_admin_rejected(self):
        editor = testdata.user("org-editor@inc.com")
        testdata.organization_role(editor, self.organization, role=ORGANIZATION_EDITOR)
        self.client.force_authenticate(user=editor)

        invitation = self.invitation_metadata
        response = self.sync_changes(
            [
                generate_create_event(
                    invitation["id"],
                    INVITATION,
                    invitation,
                    user_id=editor.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.Invitation.objects.get(id=invitation["id"])
            self.fail("Organization invitation was created by a non-admin")
        except models.Invitation.DoesNotExist:
            pass

    def test_create_invitation_requires_channel_or_organization(self):
        self.client.force_authenticate(user=self.invited_user)
        invitation = {
            "id": uuid.uuid4().hex,
            "email": self.invited_user.email,
        }
        response = self.sync_changes(
            [
                generate_create_event(
                    invitation["id"],
                    INVITATION,
                    invitation,
                    user_id=self.invited_user.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.Invitation.objects.get(id=invitation["id"])
            self.fail("Invitation without channel or organization was created")
        except models.Invitation.DoesNotExist:
            pass

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

    def test_invitation_with_channel_and_organization_is_rejected(self):
        channel = testdata.channel()
        channel.editors.add(self.org_admin)
        invitation = {
            "id": uuid.uuid4().hex,
            "channel": channel.id,
            "organization": self.organization.id,
            "email": self.invited_user.email,
        }
        response = self.sync_changes(
            [
                generate_create_event(
                    invitation["id"],
                    INVITATION,
                    invitation,
                    channel_id=channel.id,
                    user_id=self.org_admin.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.Invitation.objects.get(id=invitation["id"])
            self.fail("Invitation with both channel and organization was created")
        except models.Invitation.DoesNotExist:
            pass

    def test_create_organization_invitation_without_user_id_is_rejected(self):
        # No org-specific routing in handle_changes - a missing user_id is
        # rejected like any other self-only change, with feedback returned.
        invitation = self.invitation_metadata
        response = self.sync_changes(
            [
                generate_create_event(
                    invitation["id"],
                    INVITATION,
                    invitation,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.data["disallowed"]), 1)
        try:
            models.Invitation.objects.get(id=invitation["id"])
            self.fail(
                "Organization invitation without a client-supplied user_id "
                "was created"
            )
        except models.Invitation.DoesNotExist:
            pass

    def test_organization_invitation_change_with_mismatched_user_id_is_rejected(self):
        # A user_id that doesn't match the actor is rejected, not routed
        # elsewhere - it must not inject a change into another user's feed.
        unrelated_user = testdata.user("unrelated-target@inc.com")
        invitation = self.invitation_metadata
        response = self.sync_changes(
            [
                generate_create_event(
                    invitation["id"],
                    INVITATION,
                    invitation,
                    user_id=unrelated_user.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.data["disallowed"]), 1)
        self.assertFalse(
            models.Change.objects.filter(
                table=INVITATION, kwargs__key=invitation["id"]
            ).exists()
        )
        try:
            models.Invitation.objects.get(id=invitation["id"])
            self.fail("Invitation was created despite a mismatched user_id")
        except models.Invitation.DoesNotExist:
            pass

    def test_create_organization_invitation_for_different_org_is_rejected(self):
        other_organization = testdata.organization()
        invitation = self.invitation_metadata
        invitation["organization"] = other_organization.id
        response = self.sync_changes(
            [
                generate_create_event(
                    invitation["id"],
                    INVITATION,
                    invitation,
                    user_id=self.org_admin.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.Invitation.objects.get(id=invitation["id"])
            self.fail(
                "Invitation was created for an organization the admin doesn't manage"
            )
        except models.Invitation.DoesNotExist:
            pass

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

    def test_accept_organization_invitation_created_via_sync(self):
        # Unlike the fixtures above, an invitation created via sync never
        # gets `invited` populated - the real invitee must still accept it.
        invitation = self.invitation_metadata
        response = self.sync_changes(
            [
                generate_create_event(
                    invitation["id"],
                    INVITATION,
                    invitation,
                    user_id=self.org_admin.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        created = models.Invitation.objects.get(id=invitation["id"])
        self.assertIsNone(created.invited)

        self.client.force_authenticate(user=self.invited_user)
        response = self.sync_changes(
            [
                generate_update_event(
                    invitation["id"],
                    INVITATION,
                    {"accepted": True},
                    user_id=self.invited_user.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        created.refresh_from_db()
        self.assertTrue(created.accepted)
        self.assertTrue(
            models.OrganizationRole.objects.filter(
                user=self.invited_user, organization=self.organization
            ).exists()
        )

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

    def test_create_organization_invitation(self):
        organization = testdata.organization()
        org_admin = testdata.user("crud-org-admin@inc.com")
        testdata.organization_role(org_admin, organization)
        self.client.force_authenticate(user=org_admin)
        invitation = {
            "id": uuid.uuid4().hex,
            "organization": organization.id,
            "email": self.invited_user.email,
        }
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
