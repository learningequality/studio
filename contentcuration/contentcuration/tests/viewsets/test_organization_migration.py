from django.urls import reverse

from contentcuration.constants.organization_roles import ORGANIZATION_EDITOR
from contentcuration.constants.organization_roles import ORGANIZATION_ROLE_STATUS_ACTIVE
from contentcuration.models import Invitation
from contentcuration.models import Organization
from contentcuration.models import OrganizationRole
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.tests.viewsets.base import generate_update_event
from contentcuration.tests.viewsets.base import SyncTestMixin
from contentcuration.viewsets.sync.constants import CHANNEL


class OrganizationMigrationTestCase(SyncTestMixin, StudioAPITestCase):
    def setUp(self):
        super().setUp()
        self.user = testdata.user()
        self.other = testdata.user("other@example.com")
        self.channel = testdata.channel()
        self.channel.editors.add(self.user)
        self.organization = Organization.objects.create(name="Destination")
        OrganizationRole.objects.create(
            organization=self.organization,
            user=self.user,
            role=ORGANIZATION_EDITOR,
            status=ORGANIZATION_ROLE_STATUS_ACTIVE,
        )
        self.client.force_authenticate(self.user)

    def check(self):
        return self.client.get(
            reverse("channel-organization-migration", args=[self.channel.id]),
            {"organization": self.organization.id},
        )

    def request_migration(self):
        return self.client.post(
            reverse("invitation-migration"),
            {"channel": self.channel.id, "organization": self.organization.id},
            format="json",
        )

    def test_check_detects_contested_editors(self):
        self.assertTrue(self.check().data["uncontested"])
        self.channel.editors.add(self.other)
        self.assertFalse(self.check().data["uncontested"])

    def test_non_editor_cannot_check_or_request(self):
        self.client.force_authenticate(self.other)
        self.assertEqual(self.check().status_code, 404)
        self.assertEqual(self.request_migration().status_code, 400)

    def test_sync_can_move_uncontested_channel(self):
        self.sync_changes(
            [
                generate_update_event(
                    self.channel.id,
                    CHANNEL,
                    {"organization": self.organization.id},
                    channel_id=self.channel.id,
                )
            ]
        )
        self.channel.refresh_from_db()
        self.assertEqual(self.channel.organization_id, self.organization.id)

    def test_sync_cannot_move_contested_channel(self):
        self.channel.editors.add(self.other)
        self.sync_changes(
            [
                generate_update_event(
                    self.channel.id,
                    CHANNEL,
                    {"organization": self.organization.id},
                    channel_id=self.channel.id,
                )
            ]
        )
        self.channel.refresh_from_db()
        self.assertIsNone(self.channel.organization_id)

    def test_request_blocks_another_request_and_direct_save(self):
        self.channel.editors.add(self.other)
        response = self.request_migration()
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(self.request_migration().status_code, 400)
        self.client.force_authenticate(self.admin_user)
        self.sync_changes(
            [
                generate_update_event(
                    self.channel.id,
                    CHANNEL,
                    {"organization": self.organization.id},
                    channel_id=self.channel.id,
                )
            ]
        )
        self.channel.refresh_from_db()
        self.assertIsNone(self.channel.organization_id)

    def test_only_admin_can_accept_and_acceptance_moves_channel(self):
        self.channel.editors.add(self.other)
        invitation_id = self.request_migration().data["id"]
        url = reverse("invitation-accept", args=[invitation_id])
        self.assertEqual(self.client.post(url).status_code, 403)
        self.client.force_authenticate(self.admin_user)
        self.assertEqual(self.client.post(url).status_code, 200)
        self.channel.refresh_from_db()
        self.assertEqual(self.channel.organization_id, self.organization.id)
        self.assertTrue(Invitation.objects.get(id=invitation_id).accepted)
        self.assertFalse(self.channel.editors.filter(id=self.admin_user.id).exists())
        self.assertEqual(self.client.post(url).status_code, 400)

    def test_only_requestor_or_admin_can_decline(self):
        self.channel.editors.add(self.other)
        invitation_id = self.request_migration().data["id"]
        url = reverse("invitation-decline", args=[invitation_id])
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.post(url).status_code, 403)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post(url).status_code, 200)
        self.assertEqual(self.request_migration().status_code, 201)

    def test_admin_can_move_channel_without_editors(self):
        self.channel.editors.clear()
        self.client.force_authenticate(self.admin_user)
        self.assertTrue(self.check().data["uncontested"])
        self.test_sync_can_move_uncontested_channel()

    def test_channel_editor_without_active_organization_role_cannot_request(self):
        self.channel.editors.add(self.other)
        OrganizationRole.objects.filter(user=self.user).delete()
        self.organization.public = True
        self.organization.save()
        self.assertEqual(self.request_migration().status_code, 403)

    def test_viewer_membership_does_not_make_migration_uncontested(self):
        self.channel.editors.add(self.other)
        OrganizationRole.objects.create(
            organization=self.organization,
            user=self.other,
            role="viewer",
            status=ORGANIZATION_ROLE_STATUS_ACTIVE,
        )
        self.assertFalse(self.check().data["uncontested"])

    def test_pending_migrations_are_listed_separately(self):
        self.channel.editors.add(self.other)
        migration_id = self.request_migration().data["id"]
        self.client.force_authenticate(self.admin_user)
        ordinary = self.client.get(reverse("invitation-list"))
        self.assertEqual(ordinary.data, [])
        migrations = self.client.get(reverse("invitation-list"), {"migration": True})
        self.assertEqual(len(migrations.data), 1)
        self.assertEqual(migrations.data[0]["id"], migration_id)
        self.assertEqual(migrations.data[0]["sender_email"], self.user.email)
        self.assertEqual(
            migrations.data[0]["organization_name"], self.organization.name
        )
        self.client.post(reverse("invitation-decline", args=[migration_id]))
        self.assertEqual(
            self.client.get(reverse("invitation-list"), {"migration": True}).data, []
        )

    def test_synchronous_save_and_pending_request_lock(self):
        url = reverse("channel-organization-migration", args=[self.channel.id])
        self.channel.editors.add(self.other)
        self.assertEqual(
            self.client.post(url, {"organization": self.organization.id}).status_code,
            400,
        )
        self.request_migration()
        self.client.force_authenticate(self.admin_user)
        self.assertEqual(
            self.client.post(url, {"organization": self.organization.id}).status_code,
            400,
        )
        invitation = Invitation.objects.get(channel=self.channel)
        self.client.post(reverse("invitation-decline", args=[invitation.id]))
        response = self.client.post(url, {"organization": self.organization.id})
        self.assertEqual(response.status_code, 200, response.data)
        self.channel.refresh_from_db()
        self.assertEqual(self.channel.organization_id, self.organization.id)

    def test_deleted_target_cannot_be_approved(self):
        self.channel.editors.add(self.other)
        invitation_id = self.request_migration().data["id"]
        self.organization.deleted = True
        self.organization.save()
        self.client.force_authenticate(self.admin_user)
        self.assertEqual(
            self.client.post(
                reverse("invitation-accept", args=[invitation_id])
            ).status_code,
            400,
        )
        self.channel.refresh_from_db()
        self.assertIsNone(self.channel.organization_id)

    def test_channel_response_includes_organization(self):
        self.channel.organization = self.organization
        self.channel.save()
        response = self.client.get(reverse("channel-detail", args=[self.channel.id]))
        self.assertEqual(response.data["organization"], self.organization.id)
        self.assertEqual(response.data["organization_name"], self.organization.name)
