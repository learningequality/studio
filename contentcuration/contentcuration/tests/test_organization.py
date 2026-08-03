"""Tests for organization and organization membership API endpoints."""

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from contentcuration.constants.organization_roles import ORGANIZATION_ADMIN
from contentcuration.constants.organization_roles import ORGANIZATION_EDITOR
from contentcuration.constants.organization_roles import (
    ORGANIZATION_ROLE_STATUS_ACTIVE,
)
from contentcuration.constants.organization_roles import (
    ORGANIZATION_ROLE_STATUS_INACTIVE,
)
from contentcuration.constants.organization_roles import ORGANIZATION_VIEWER
from contentcuration.models import Organization
from contentcuration.models import OrganizationRole
from contentcuration.tests import testdata
from contentcuration.tests.base import BaseAPITestCase
from contentcuration.viewsets.organization import OrganizationMemberViewSet


class OrganizationAPITestCase(BaseAPITestCase):
    """Shared organization API fixtures and URL helpers."""

    def setUp(self):
        super().setUp()

        self.organization_admin = testdata.user(email="org-admin@test.com")
        self.organization_admin.first_name = "Admin"
        self.organization_admin.last_name = "User"
        self.organization_admin.save(update_fields=["first_name", "last_name"])

        self.editor_user = testdata.user(email="org-editor@test.com")
        self.viewer_user = testdata.user(email="org-viewer@test.com")
        self.other_user = testdata.user(email="org-other@test.com")
        self.inactive_user = testdata.user(email="org-inactive@test.com")

        self.organization = Organization.objects.create(
            name="Test Organization",
            description="A test organization",
            public=False,
        )

        self.admin_membership = OrganizationRole.objects.create(
            user=self.organization_admin,
            organization=self.organization,
            role=ORGANIZATION_ADMIN,
            status=ORGANIZATION_ROLE_STATUS_ACTIVE,
        )
        self.editor_membership = OrganizationRole.objects.create(
            user=self.editor_user,
            organization=self.organization,
            role=ORGANIZATION_EDITOR,
            status=ORGANIZATION_ROLE_STATUS_ACTIVE,
        )
        self.viewer_membership = OrganizationRole.objects.create(
            user=self.viewer_user,
            organization=self.organization,
            role=ORGANIZATION_VIEWER,
            status=ORGANIZATION_ROLE_STATUS_ACTIVE,
        )
        self.inactive_membership = OrganizationRole.objects.create(
            user=self.inactive_user,
            organization=self.organization,
            role=ORGANIZATION_VIEWER,
            status=ORGANIZATION_ROLE_STATUS_INACTIVE,
        )

    @property
    def organization_list_url(self):
        return reverse("organization-list")

    def organization_detail_url(self, organization=None):
        organization = organization or self.organization
        return reverse("organization-detail", kwargs={"pk": organization.id})

    @property
    def membership_list_url(self):
        return reverse("organization-members-list")

    def membership_detail_url(self, membership):
        return reverse("organization-members-detail", kwargs={"pk": membership.id})

    def authenticate_as(self, user):
        self.client.force_authenticate(user)


class OrganizationListCreateTestCase(OrganizationAPITestCase):
    def test_member_can_list_private_organization(self):
        self.authenticate_as(self.organization_admin)

        response = self.client.get(self.organization_list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], self.organization.name)

    def test_nonmember_cannot_list_private_organization(self):
        self.authenticate_as(self.other_user)

        response = self.client.get(self.organization_list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"], [])

    def test_authenticated_nonmember_can_list_public_organization(self):
        self.organization.public = True
        self.organization.save(update_fields=["public"])
        self.authenticate_as(self.other_user)

        response = self.client.get(self.organization_list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_inactive_membership_does_not_grant_organization_access(self):
        self.authenticate_as(self.inactive_user)

        response = self.client.get(self.organization_list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"], [])

    def test_list_can_filter_by_name(self):
        second_organization = Organization.objects.create(name="Another Group")
        OrganizationRole.objects.create(
            user=self.organization_admin,
            organization=second_organization,
            role=ORGANIZATION_ADMIN,
            status=ORGANIZATION_ROLE_STATUS_ACTIVE,
        )
        self.authenticate_as(self.organization_admin)

        response = self.client.get(self.organization_list_url, {"name": "Another"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Another Group")

    def test_create_organization_creates_active_admin_membership(self):
        self.authenticate_as(self.other_user)
        data = {
            "name": "New Organization",
            "description": "A new organization",
            "public": False,
        }

        response = self.client.post(self.organization_list_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        organization = Organization.objects.get(id=response.data["id"])
        membership = OrganizationRole.objects.get(
            organization=organization,
            user=self.other_user,
        )
        self.assertEqual(membership.role, ORGANIZATION_ADMIN)
        self.assertEqual(membership.status, ORGANIZATION_ROLE_STATUS_ACTIVE)

    def test_create_organization_requires_authentication(self):
        client = APIClient()

        response = client.post(
            self.organization_list_url,
            {"name": "New Organization"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_organizations_requires_authentication(self):
        response = APIClient().get(self.organization_list_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class OrganizationRetrieveUpdateDeleteTestCase(OrganizationAPITestCase):
    def test_active_member_can_retrieve_private_organization(self):
        self.authenticate_as(self.viewer_user)

        response = self.client.get(self.organization_detail_url())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], self.organization.name)

    def test_nonmember_cannot_retrieve_private_organization(self):
        self.authenticate_as(self.other_user)

        response = self.client.get(self.organization_detail_url())

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_nonmember_can_retrieve_public_organization(self):
        self.organization.public = True
        self.organization.save(update_fields=["public"])
        self.authenticate_as(self.other_user)

        response = self.client.get(self.organization_detail_url())

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_active_admin_can_update_organization(self):
        self.authenticate_as(self.organization_admin)

        response = self.client.patch(
            self.organization_detail_url(),
            {"name": "Updated Organization"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.organization.refresh_from_db()
        self.assertEqual(self.organization.name, "Updated Organization")

    def test_editor_cannot_update_organization(self):
        self.authenticate_as(self.editor_user)

        response = self.client.patch(
            self.organization_detail_url(),
            {"name": "Updated Organization"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_viewer_cannot_update_organization(self):
        self.authenticate_as(self.viewer_user)

        response = self.client.patch(
            self.organization_detail_url(),
            {"name": "Updated Organization"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_inactive_admin_cannot_update_organization(self):
        inactive_admin = testdata.user(email="inactive-admin@test.com")
        OrganizationRole.objects.create(
            user=inactive_admin,
            organization=self.organization,
            role=ORGANIZATION_ADMIN,
            status=ORGANIZATION_ROLE_STATUS_INACTIVE,
        )
        self.authenticate_as(inactive_admin)

        response = self.client.patch(
            self.organization_detail_url(),
            {"name": "Updated Organization"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_active_admin_can_soft_delete_organization(self):
        self.authenticate_as(self.organization_admin)

        response = self.client.delete(self.organization_detail_url())

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.organization.refresh_from_db()
        self.assertTrue(self.organization.deleted)

    def test_editor_cannot_delete_organization(self):
        self.authenticate_as(self.editor_user)

        response = self.client.delete(self.organization_detail_url())

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.organization.refresh_from_db()
        self.assertFalse(self.organization.deleted)


class OrganizationMembershipListTestCase(OrganizationAPITestCase):
    def test_active_member_can_list_memberships(self):
        self.authenticate_as(self.viewer_user)

        response = self.client.get(
            self.membership_list_url,
            {"organization": str(self.organization.id)},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 4)

    def test_nonmember_receives_empty_membership_list(self):
        self.authenticate_as(self.other_user)

        response = self.client.get(
            self.membership_list_url,
            {"organization": str(self.organization.id)},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"], [])

    def test_public_organization_does_not_expose_memberships_to_nonmember(self):
        self.organization.public = True
        self.organization.save(update_fields=["public"])
        self.authenticate_as(self.other_user)

        response = self.client.get(
            self.membership_list_url,
            {"organization": str(self.organization.id)},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"], [])

    def test_inactive_member_cannot_list_memberships(self):
        self.authenticate_as(self.inactive_user)

        response = self.client.get(
            self.membership_list_url,
            {"organization": str(self.organization.id)},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"], [])

    def test_membership_response_includes_user_name_fields(self):
        self.authenticate_as(self.organization_admin)

        response = self.client.get(
            self.membership_list_url,
            {"user": str(self.organization_admin.id)},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        membership = response.data["results"][0]
        self.assertEqual(membership["user_email"], self.organization_admin.email)
        self.assertEqual(membership["user_first_name"], "Admin")
        self.assertEqual(membership["user_last_name"], "User")
        self.assertEqual(membership["user_name"], "Admin User")

    def test_member_can_retrieve_membership_in_same_organization(self):
        self.authenticate_as(self.viewer_user)

        response = self.client.get(self.membership_detail_url(self.admin_membership))

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_nonmember_cannot_retrieve_membership(self):
        self.authenticate_as(self.other_user)

        response = self.client.get(self.membership_detail_url(self.admin_membership))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class OrganizationMembershipCreationTestCase(OrganizationAPITestCase):
    def test_direct_membership_creation_is_not_allowed(self):
        self.authenticate_as(self.organization_admin)
        data = {
            "organization": str(self.organization.id),
            "user": str(self.other_user.id),
            "role": ORGANIZATION_VIEWER,
            "status": ORGANIZATION_ROLE_STATUS_ACTIVE,
        }

        response = self.client.post(self.membership_list_url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertFalse(
            OrganizationRole.objects.filter(
                organization=self.organization,
                user=self.other_user,
            ).exists()
        )

    def test_membership_viewset_has_no_sync_creation_handler(self):
        self.assertFalse(hasattr(OrganizationMemberViewSet, "create_from_changes"))


class OrganizationMembershipUpdateTestCase(OrganizationAPITestCase):
    def test_active_admin_can_update_member_role(self):
        self.authenticate_as(self.organization_admin)

        response = self.client.patch(
            self.membership_detail_url(self.viewer_membership),
            {"role": ORGANIZATION_EDITOR},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.viewer_membership.refresh_from_db()
        self.assertEqual(self.viewer_membership.role, ORGANIZATION_EDITOR)

    def test_editor_cannot_update_membership(self):
        self.authenticate_as(self.editor_user)

        response = self.client.patch(
            self.membership_detail_url(self.viewer_membership),
            {"role": ORGANIZATION_EDITOR},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_nonmember_cannot_update_membership(self):
        self.authenticate_as(self.other_user)

        response = self.client.patch(
            self.membership_detail_url(self.viewer_membership),
            {"role": ORGANIZATION_EDITOR},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_invalid_role_is_rejected(self):
        self.authenticate_as(self.organization_admin)

        response = self.client.patch(
            self.membership_detail_url(self.viewer_membership),
            {"role": "invalid-role"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_membership_user_and_organization_cannot_be_reassigned(self):
        other_organization = Organization.objects.create(name="Other Organization")
        self.authenticate_as(self.organization_admin)

        response = self.client.patch(
            self.membership_detail_url(self.viewer_membership),
            {
                "user": str(self.other_user.id),
                "organization": str(other_organization.id),
                "description": "Updated description",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.viewer_membership.refresh_from_db()
        self.assertEqual(self.viewer_membership.user, self.viewer_user)
        self.assertEqual(self.viewer_membership.organization, self.organization)
        self.assertEqual(self.viewer_membership.description, "Updated description")

    def test_last_active_admin_cannot_be_demoted(self):
        self.authenticate_as(self.organization_admin)

        response = self.client.patch(
            self.membership_detail_url(self.admin_membership),
            {"role": ORGANIZATION_EDITOR},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin_membership.refresh_from_db()
        self.assertEqual(self.admin_membership.role, ORGANIZATION_ADMIN)

    def test_last_active_admin_cannot_be_deactivated(self):
        self.authenticate_as(self.organization_admin)

        response = self.client.patch(
            self.membership_detail_url(self.admin_membership),
            {"status": ORGANIZATION_ROLE_STATUS_INACTIVE},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.admin_membership.refresh_from_db()
        self.assertEqual(
            self.admin_membership.status,
            ORGANIZATION_ROLE_STATUS_ACTIVE,
        )

    def test_admin_can_be_demoted_when_another_active_admin_exists(self):
        second_admin = testdata.user(email="second-admin@test.com")
        OrganizationRole.objects.create(
            user=second_admin,
            organization=self.organization,
            role=ORGANIZATION_ADMIN,
            status=ORGANIZATION_ROLE_STATUS_ACTIVE,
        )
        self.authenticate_as(self.organization_admin)

        response = self.client.patch(
            self.membership_detail_url(self.admin_membership),
            {"role": ORGANIZATION_EDITOR},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.admin_membership.refresh_from_db()
        self.assertEqual(self.admin_membership.role, ORGANIZATION_EDITOR)


class OrganizationMembershipDeleteTestCase(OrganizationAPITestCase):
    def test_active_admin_can_remove_nonadmin_member(self):
        self.authenticate_as(self.organization_admin)

        response = self.client.delete(
            self.membership_detail_url(self.viewer_membership)
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            OrganizationRole.objects.filter(id=self.viewer_membership.id).exists()
        )

    def test_editor_cannot_remove_membership(self):
        self.authenticate_as(self.editor_user)

        response = self.client.delete(
            self.membership_detail_url(self.viewer_membership)
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_nonmember_cannot_remove_membership(self):
        self.authenticate_as(self.other_user)

        response = self.client.delete(
            self.membership_detail_url(self.viewer_membership)
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_last_active_admin_cannot_be_removed(self):
        self.authenticate_as(self.organization_admin)

        response = self.client.delete(self.membership_detail_url(self.admin_membership))

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(
            OrganizationRole.objects.filter(id=self.admin_membership.id).exists()
        )


class OrganizationPaginationTestCase(OrganizationAPITestCase):
    def test_organization_list_is_paginated(self):
        for index in range(25):
            organization = Organization.objects.create(name="Org {}".format(index))
            OrganizationRole.objects.create(
                user=self.organization_admin,
                organization=organization,
                role=ORGANIZATION_ADMIN,
                status=ORGANIZATION_ROLE_STATUS_ACTIVE,
            )
        self.authenticate_as(self.organization_admin)

        response = self.client.get(self.organization_list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 26)
        self.assertEqual(len(response.data["results"]), 20)

    def test_membership_list_is_paginated(self):
        for index in range(25):
            user = testdata.user(email="member{}@test.com".format(index))
            OrganizationRole.objects.create(
                user=user,
                organization=self.organization,
                role=ORGANIZATION_VIEWER,
                status=ORGANIZATION_ROLE_STATUS_ACTIVE,
            )
        self.authenticate_as(self.organization_admin)

        response = self.client.get(
            self.membership_list_url,
            {"organization": str(self.organization.id)},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 29)
        self.assertEqual(len(response.data["results"]), 20)
