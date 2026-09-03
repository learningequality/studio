import json

from rest_framework.test import force_authenticate

from contentcuration.constants.organization_roles import ORGANIZATION_ADMIN
from contentcuration.constants.organization_roles import ORGANIZATION_ROLE_STATUS_ACTIVE
from contentcuration.models import Invitation
from contentcuration.models import User
from contentcuration.tests import testdata
from contentcuration.tests.base import BaseAPITestCase
from contentcuration.views.users import send_organization_invitation_email


class OrganizationInvitationTestCase(BaseAPITestCase):
    def setUp(self):
        super(OrganizationInvitationTestCase, self).setUp()
        self.org = testdata.organization()
        testdata.organization_role(
            self.user,
            self.org,
            role=ORGANIZATION_ADMIN,
            status=ORGANIZATION_ROLE_STATUS_ACTIVE,
        )

    def send_invitation(self, email, share_mode, user=None):
        user = user or self.user
        request = self.create_post_request(
            "/api/send_organization_invitation_email/",
            data=json.dumps(
                {
                    "user_email": email,
                    "organization_id": self.org.id,
                    "share_mode": share_mode,
                }
            ),
            content_type="application/json",
        )
        request.user = user
        force_authenticate(request, user=user)
        return send_organization_invitation_email(request)

    def test_admin_can_send_invitation(self):
        response = self.send_invitation("invitee@example.com", "edit")
        self.assertEqual(response.status_code, 200)
        invitation = Invitation.objects.get(
            organization=self.org, email="invitee@example.com"
        )
        self.assertEqual(invitation.share_mode, "edit")
        self.assertEqual(invitation.sender, self.user)

    def test_non_admin_cannot_send_invitation(self):
        non_admin = testdata.user(email="not-an-admin@example.com")

        response = self.send_invitation("invitee@example.com", "edit", user=non_admin)
        self.assertEqual(response.status_code, 403)
        self.assertFalse(
            Invitation.objects.filter(
                organization=self.org, email="invitee@example.com"
            ).exists()
        )

    def test_reinviting_the_same_email_updates_the_existing_invitation(self):
        self.send_invitation("invitee@example.com", "view")
        self.send_invitation("invitee@example.com", "edit")

        invitations = Invitation.objects.filter(
            organization=self.org, email="invitee@example.com"
        )
        self.assertEqual(invitations.count(), 1)
        self.assertEqual(invitations.first().share_mode, "edit")

    def test_invitation_matches_an_existing_user_by_email(self):
        User.objects.create(email="existing@example.com", first_name="Existing")

        response = self.send_invitation("existing@example.com", "view")
        self.assertEqual(response.status_code, 200)
        invitation = Invitation.objects.get(
            organization=self.org, email="existing@example.com"
        )
        self.assertEqual(invitation.first_name, "Existing")
