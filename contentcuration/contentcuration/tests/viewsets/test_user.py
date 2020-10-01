from __future__ import absolute_import

from django.core.urlresolvers import reverse

from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase


class CRUDTestCase(StudioAPITestCase):
    def setUp(self):
        super(CRUDTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)

    def test_fetch_user(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(
            reverse("user-detail", kwargs={"pk": self.user.id}), format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_no_create_user(self):
        self.client.force_authenticate(user=self.user)
        user = {}
        response = self.client.post(reverse("user-list"), user, format="json",)
        self.assertEqual(response.status_code, 405, response.content)

    def test_no_update_user(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            reverse("user-detail", kwargs={"pk": self.user.id}),
            {"first_name": "janine"},
            format="json",
        )
        self.assertEqual(response.status_code, 405, response.content)

    def test_no_delete_user(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(
            reverse("user-detail", kwargs={"pk": self.user.id})
        )
        self.assertEqual(response.status_code, 405, response.content)
