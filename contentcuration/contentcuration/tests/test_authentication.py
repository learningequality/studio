from __future__ import absolute_import

from django.urls import reverse
import urllib.parse

from .base import BaseTestCase


class AuthenticationTestCase(BaseTestCase):
    def setUp(self):
        super(AuthenticationTestCase, self).setUp()
        self.base_url = reverse("channel", kwargs={"channel_id": self.channel.pk})

    def test_channel_admin_access(self):
        admin_url = "/en/administration/"

        response = self.get(admin_url, follow=True)
        assert "/en/accounts/?next={}".format(admin_url) == urllib.parse.unquote(
            response.redirect_chain[-1][0]
        )
        assert response.status_code == 200

        self.sign_in()

        response = self.get(admin_url)
        assert response.status_code == 200

        self.user.is_admin = True
        self.user.save()

        response = self.get(admin_url)
        assert response.status_code == 200

    def test_unathenticated_channel_access(self):
        response = self.get(self.base_url)
        # test that it redirects
        assert response.status_code == 302

        # now test that when we are redirected we get taken to the login page since we're not signed in,
        # and that after sign in we'll get sent to the right place.
        response = self.get(self.base_url, follow=True)
        assert "/en/accounts/?next={}".format(self.base_url) == urllib.parse.unquote(
            response.redirect_chain[-1][0]
        )
        assert response.status_code == 200

    def test_no_rights_channel_access(self):
        self.channel.editors.remove(self.user)

        self.sign_in()

        response = self.get(self.base_url, follow=True)
        assert response.status_code == 200
        # TODO test that the channel_error property was set

    def test_view_only_channel_access(self):
        self.channel.editors.remove(self.user)

        self.sign_in()

        self.channel.viewers.add(self.user)

        response = self.get(self.base_url, follow=True)
        assert response.status_code == 200

    def test_edit_channel_access(self):
        self.sign_in()

        # we can edit!
        response = self.get(self.base_url, follow=True)
        assert response.status_code == 200
