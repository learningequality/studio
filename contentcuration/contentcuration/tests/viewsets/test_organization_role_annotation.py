from django.urls import reverse
from rest_framework import status

from contentcuration.constants.organization_roles import ORGANIZATION_ADMIN
from contentcuration.constants.organization_roles import ORGANIZATION_EDITOR
from contentcuration.constants.organization_roles import ORGANIZATION_VIEWER
from contentcuration.tests import testdata
from contentcuration.tests.viewsets.test_organization import OrganizationAPITestCase


class OrganizationRoleAnnotationTestCase(OrganizationAPITestCase):
    def test_list_includes_the_users_own_role(self):
        self.authenticate_as(self.viewer_user)

        response = self.client.get(self.organization_list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        [organization] = response.data["results"]
        self.assertEqual(organization["role"], ORGANIZATION_VIEWER)

    def test_retrieve_includes_the_users_own_role(self):
        self.authenticate_as(self.editor_user)

        response = self.client.get(self.organization_detail_url())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], ORGANIZATION_EDITOR)

    def test_role_is_null_for_a_public_org_viewed_by_a_nonmember(self):
        self.organization.public = True
        self.organization.save(update_fields=["public"])
        self.authenticate_as(self.other_user)

        response = self.client.get(self.organization_detail_url())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["role"])

    def test_role_ignores_an_inactive_membership(self):
        self.organization.public = True
        self.organization.save(update_fields=["public"])
        self.authenticate_as(self.inactive_user)

        response = self.client.get(self.organization_detail_url())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["role"])

    def test_create_response_includes_the_new_admin_role(self):
        creator = testdata.user(email="role-annotation-creator@test.com")
        self.authenticate_as(creator)

        response = self.client.post(
            self.organization_list_url, {"name": "New Org"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["role"], ORGANIZATION_ADMIN)

    def test_update_response_reflects_the_admins_role(self):
        self.authenticate_as(self.organization_admin)

        response = self.client.patch(
            self.organization_detail_url(),
            {"name": "Renamed Org"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], ORGANIZATION_ADMIN)

    def test_site_admin_sees_null_role_for_an_org_they_do_not_belong_to(self):
        site_admin = testdata.user(email="site-admin@test.com")
        site_admin.is_admin = True
        site_admin.save(update_fields=["is_admin"])
        self.authenticate_as(site_admin)

        response = self.client.get(reverse("organization-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        [organization] = [
            o for o in response.data["results"] if o["id"] == str(self.organization.id)
        ]
        self.assertIsNone(organization["role"])
