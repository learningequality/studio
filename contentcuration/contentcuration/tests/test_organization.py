"""
Tests for Organization API endpoints.
"""
import json

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase, APIClient

from contentcuration.constants.organization_roles import (
    ORGANIZATION_ADMIN,
    ORGANIZATION_EDITOR,
    ORGANIZATION_VIEWER,
    ORGANIZATION_ROLE_STATUS_ACTIVE,
)
from contentcuration.models import Organization, OrganizationRole, User
from contentcuration.tests.base import BaseAPITestCase
from contentcuration.tests import testdata


class OrganizationAPITestCase(BaseAPITestCase):
    """Base test case for Organization API tests."""

    def setUp(self):
        super().setUp()
        # Create additional test users
        self.admin_user = testdata.user(email="admin@test.com")
        self.editor_user = testdata.user(email="editor@test.com")
        self.viewer_user = testdata.user(email="viewer@test.com")
        self.other_user = testdata.user(email="other@test.com")

        # Create test organization
        self.organization = Organization.objects.create(
            name="Test Organization",
            description="A test organization",
            public=False,
        )
        
        # Add admin user to organization
        OrganizationRole.objects.create(
            user=self.admin_user,
            organization=self.organization,
            role=ORGANIZATION_ADMIN,
            status=ORGANIZATION_ROLE_STATUS_ACTIVE,
        )
        
        # Add editor user to organization
        OrganizationRole.objects.create(
            user=self.editor_user,
            organization=self.organization,
            role=ORGANIZATION_EDITOR,
            status=ORGANIZATION_ROLE_STATUS_ACTIVE,
        )
        
        # Add viewer user to organization
        OrganizationRole.objects.create(
            user=self.viewer_user,
            organization=self.organization,
            role=ORGANIZATION_VIEWER,
            status=ORGANIZATION_ROLE_STATUS_ACTIVE,
        )

    def authenticate_as(self, user):
        """Switch authentication to a different user."""
        self.client = APIClient()
        self.client.force_authenticate(user)


class OrganizationListCreateTestCase(OrganizationAPITestCase):
    """Tests for creating and listing organizations."""

    def test_list_organizations_user_can_see_their_organizations(self):
        """Authenticated users can list organizations they belong to."""
        self.client.force_authenticate(self.admin_user)
        response = self.client.get("/api/organization/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["name"], "Test Organization")

    def test_list_organizations_user_cannot_see_orgs_they_dont_belong_to(self):
        """Users should not see organizations they are not members of."""
        self.client.force_authenticate(self.other_user)
        response = self.client.get("/api/organization/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # other_user should not see the organization
        self.assertEqual(len(response.data["results"]), 0)

    def test_create_organization_creates_user_as_admin(self):
        """Creating an organization should make the creator an admin."""
        self.client.force_authenticate(self.other_user)
        data = {
            "name": "New Organization",
            "description": "A new organization",
            "public": False,
        }
        response = self.client.post("/api/organization/", data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "New Organization")
        
        # Verify creator is admin
        org = Organization.objects.get(id=response.data["id"])
        role = org.user_roles.get(user=self.other_user)
        self.assertEqual(role.role, ORGANIZATION_ADMIN)

    def test_create_organization_requires_authentication(self):
        """Creating an organization requires authentication."""
        client = APIClient()
        data = {
            "name": "New Organization",
            "description": "A new organization",
            "public": False,
        }
        response = client.post("/api/organization/", data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_organizations_requires_authentication(self):
        """Listing organizations requires authentication."""
        client = APIClient()
        response = client.get("/api/organization/")
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class OrganizationRetrieveUpdateDeleteTestCase(OrganizationAPITestCase):
    """Tests for retrieving, updating, and deleting organizations."""

    def test_retrieve_organization_member_can_access(self):
        """Organization members can retrieve organization details."""
        self.client.force_authenticate(self.admin_user)
        response = self.client.get(f"/api/organization/{self.organization.id}/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Test Organization")

    def test_retrieve_organization_non_member_cannot_access(self):
        """Non-members cannot retrieve organization details."""
        self.client.force_authenticate(self.other_user)
        response = self.client.get(f"/api/organization/{self.organization.id}/")
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_organization_admin_can_update(self):
        """Organization admins can update organization details."""
        self.client.force_authenticate(self.admin_user)
        data = {"name": "Updated Organization", "description": "Updated description"}
        response = self.client.patch(f"/api/organization/{self.organization.id}/", data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.organization.refresh_from_db()
        self.assertEqual(self.organization.name, "Updated Organization")

    def test_update_organization_editor_cannot_update(self):
        """Organization editors cannot update organization settings."""
        self.client.force_authenticate(self.editor_user)
        data = {"name": "Updated Organization"}
        response = self.client.patch(f"/api/organization/{self.organization.id}/", data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_organization_viewer_cannot_update(self):
        """Organization viewers cannot update organization settings."""
        self.client.force_authenticate(self.viewer_user)
        data = {"name": "Updated Organization"}
        response = self.client.patch(f"/api/organization/{self.organization.id}/", data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_organization_admin_can_delete(self):
        """Organization admins can delete organizations (soft delete)."""
        self.client.force_authenticate(self.admin_user)
        response = self.client.delete(f"/api/organization/{self.organization.id}/")
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.organization.refresh_from_db()
        self.assertTrue(self.organization.deleted)

    def test_delete_organization_editor_cannot_delete(self):
        """Organization editors cannot delete organizations."""
        self.client.force_authenticate(self.editor_user)
        response = self.client.delete(f"/api/organization/{self.organization.id}/")
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class OrganizationMemberListTestCase(OrganizationAPITestCase):
    """Tests for listing organization members."""

    def test_list_members_member_can_view(self):
        """Organization members can view the member list."""
        self.client.force_authenticate(self.admin_user)
        response = self.client.get(f"/api/organization/{self.organization.id}/members/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 3)

    def test_list_members_non_member_cannot_view(self):
        """Non-members cannot view the member list."""
        self.client.force_authenticate(self.other_user)
        response = self.client.get(f"/api/organization/{self.organization.id}/members/")
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_members_returns_user_details(self):
        """Member list includes user email and name."""
        self.client.force_authenticate(self.admin_user)
        response = self.client.get(f"/api/organization/{self.organization.id}/members/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        members = response.data["results"]
        
        # Check that user details are included
        admin_member = next((m for m in members if m["user"] == str(self.admin_user.id)), None)
        self.assertIsNotNone(admin_member)
        self.assertEqual(admin_member["user_email"], self.admin_user.email)


class OrganizationAddMemberTestCase(OrganizationAPITestCase):
    """Tests for adding members to organization."""

    def test_add_member_admin_can_add(self):
        """Organization admins can add new members."""
        self.client.force_authenticate(self.admin_user)
        data = {
            "user_id": str(self.other_user.id),
            "role": ORGANIZATION_VIEWER,
        }
        response = self.client.post(f"/api/organization/{self.organization.id}/add_member/", data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["role"], ORGANIZATION_VIEWER)
        
        # Verify member was added
        role = OrganizationRole.objects.get(user=self.other_user, organization=self.organization)
        self.assertEqual(role.role, ORGANIZATION_VIEWER)

    def test_add_member_editor_cannot_add(self):
        """Organization editors cannot add members."""
        self.client.force_authenticate(self.editor_user)
        data = {
            "user_id": str(self.other_user.id),
            "role": ORGANIZATION_VIEWER,
        }
        response = self.client.post(f"/api/organization/{self.organization.id}/add_member/", data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_add_member_requires_user_id(self):
        """Adding a member requires a user_id."""
        self.client.force_authenticate(self.admin_user)
        data = {"role": ORGANIZATION_VIEWER}
        response = self.client.post(f"/api/organization/{self.organization.id}/add_member/", data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_member_defaults_to_viewer_role(self):
        """If no role is specified, default is VIEWER."""
        self.client.force_authenticate(self.admin_user)
        data = {"user_id": str(self.other_user.id)}
        response = self.client.post(f"/api/organization/{self.organization.id}/add_member/", data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["role"], ORGANIZATION_VIEWER)

    def test_add_member_invalid_role_rejected(self):
        """Adding a member with an invalid role is rejected."""
        self.client.force_authenticate(self.admin_user)
        data = {
            "user_id": str(self.other_user.id),
            "role": "invalid_role",
        }
        response = self.client.post(f"/api/organization/{self.organization.id}/add_member/", data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_nonexistent_user_fails(self):
        """Adding a non-existent user fails."""
        self.client.force_authenticate(self.admin_user)
        data = {
            "user_id": "00000000-0000-0000-0000-000000000000",
            "role": ORGANIZATION_VIEWER,
        }
        response = self.client.post(f"/api/organization/{self.organization.id}/add_member/", data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_existing_member_role(self):
        """Adding a member that already exists updates their role."""
        # other_user is already a viewer
        OrganizationRole.objects.create(
            user=self.other_user,
            organization=self.organization,
            role=ORGANIZATION_VIEWER,
            status=ORGANIZATION_ROLE_STATUS_ACTIVE,
        )
        
        self.client.force_authenticate(self.admin_user)
        data = {
            "user_id": str(self.other_user.id),
            "role": ORGANIZATION_EDITOR,
        }
        response = self.client.post(f"/api/organization/{self.organization.id}/add_member/", data, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], ORGANIZATION_EDITOR)


class OrganizationUpdateMemberTestCase(OrganizationAPITestCase):
    """Tests for updating member roles."""

    def test_update_member_admin_can_update_role(self):
        """Organization admins can update member roles."""
        membership = OrganizationRole.objects.get(user=self.viewer_user, organization=self.organization)
        
        self.client.force_authenticate(self.admin_user)
        data = {"role": ORGANIZATION_EDITOR}
        response = self.client.patch(
            f"/api/organization/{self.organization.id}/update_member/?member_id={membership.id}",
            data,
            format="json"
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        membership.refresh_from_db()
        self.assertEqual(membership.role, ORGANIZATION_EDITOR)

    def test_update_member_editor_cannot_update(self):
        """Organization editors cannot update member roles."""
        membership = OrganizationRole.objects.get(user=self.viewer_user, organization=self.organization)
        
        self.client.force_authenticate(self.editor_user)
        data = {"role": ORGANIZATION_ADMIN}
        response = self.client.patch(
            f"/api/organization/{self.organization.id}/update_member/?member_id={membership.id}",
            data,
            format="json"
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_member_requires_member_id(self):
        """Updating a member requires member_id parameter."""
        self.client.force_authenticate(self.admin_user)
        data = {"role": ORGANIZATION_EDITOR}
        response = self.client.patch(
            f"/api/organization/{self.organization.id}/update_member/",
            data,
            format="json"
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_member_invalid_member_id_fails(self):
        """Updating with an invalid member_id fails."""
        self.client.force_authenticate(self.admin_user)
        data = {"role": ORGANIZATION_EDITOR}
        response = self.client.patch(
            f"/api/organization/{self.organization.id}/update_member/?member_id=00000000-0000-0000-0000-000000000000",
            data,
            format="json"
        )
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class OrganizationRemoveMemberTestCase(OrganizationAPITestCase):
    """Tests for removing members from organization."""

    def test_remove_member_admin_can_remove(self):
        """Organization admins can remove members."""
        membership = OrganizationRole.objects.get(user=self.viewer_user, organization=self.organization)
        
        self.client.force_authenticate(self.admin_user)
        response = self.client.delete(
            f"/api/organization/{self.organization.id}/update_member/?member_id={membership.id}"
        )
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            OrganizationRole.objects.filter(
                user=self.viewer_user, organization=self.organization
            ).exists()
        )

    def test_remove_member_editor_cannot_remove(self):
        """Organization editors cannot remove members."""
        membership = OrganizationRole.objects.get(user=self.viewer_user, organization=self.organization)
        
        self.client.force_authenticate(self.editor_user)
        response = self.client.delete(
            f"/api/organization/{self.organization.id}/update_member/?member_id={membership.id}"
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_remove_member_non_member_cannot_remove(self):
        """Non-members cannot remove members."""
        membership = OrganizationRole.objects.get(user=self.viewer_user, organization=self.organization)
        
        self.client.force_authenticate(self.other_user)
        response = self.client.delete(
            f"/api/organization/{self.organization.id}/update_member/?member_id={membership.id}"
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class OrganizationPermissionEnforcementTestCase(OrganizationAPITestCase):
    """Tests for permission enforcement across different roles."""

    def test_admin_can_manage_settings_members_and_roles(self):
        """Admins have full management access."""
        self.client.force_authenticate(self.admin_user)
        
        # Can update organization
        data = {"name": "Updated"}
        response = self.client.patch(f"/api/organization/{self.organization.id}/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Can add members
        data = {"user_id": str(self.other_user.id), "role": ORGANIZATION_VIEWER}
        response = self.client.post(f"/api/organization/{self.organization.id}/add_member/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_editor_cannot_manage_settings_or_members(self):
        """Editors cannot manage settings or members."""
        self.client.force_authenticate(self.editor_user)
        
        # Cannot update organization
        data = {"name": "Updated"}
        response = self.client.patch(f"/api/organization/{self.organization.id}/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Cannot add members
        data = {"user_id": str(self.other_user.id), "role": ORGANIZATION_VIEWER}
        response = self.client.post(f"/api/organization/{self.organization.id}/add_member/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_viewer_has_read_only_access(self):
        """Viewers have read-only access."""
        self.client.force_authenticate(self.viewer_user)
        
        # Can view organization
        response = self.client.get(f"/api/organization/{self.organization.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Can view members
        response = self.client.get(f"/api/organization/{self.organization.id}/members/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Cannot update organization
        data = {"name": "Updated"}
        response = self.client.patch(f"/api/organization/{self.organization.id}/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class OrganizationPaginationTestCase(OrganizationAPITestCase):
    """Tests for pagination in organization endpoints."""

    def test_organization_list_pagination(self):
        """Organization list should be paginated."""
        # Create multiple organizations
        for i in range(25):
            org = Organization.objects.create(name=f"Org {i}")
            OrganizationRole.objects.create(
                user=self.admin_user,
                organization=org,
                role=ORGANIZATION_ADMIN,
                status=ORGANIZATION_ROLE_STATUS_ACTIVE,
            )
        
        self.client.force_authenticate(self.admin_user)
        response = self.client.get("/api/organization/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertIn("count", response.data)
        self.assertEqual(len(response.data["results"]), 20)  # Default page size

    def test_member_list_pagination(self):
        """Member list should be paginated."""
        # Add many members
        for i in range(25):
            user = testdata.user(email=f"user{i}@test.com")
            OrganizationRole.objects.create(
                user=user,
                organization=self.organization,
                role=ORGANIZATION_VIEWER,
                status=ORGANIZATION_ROLE_STATUS_ACTIVE,
            )
        
        self.client.force_authenticate(self.admin_user)
        response = self.client.get(f"/api/organization/{self.organization.id}/members/")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertIn("count", response.data)
