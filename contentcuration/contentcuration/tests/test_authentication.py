import datetime
from contentcuration.utils.policies import check_policies

from base import BaseTestCase


class AuthenticationTestCase(BaseTestCase):
    def setUp(self):
        super(AuthenticationTestCase, self).setUp()
        self.base_url = '/channels/{}'.format(self.channel.pk)
        self.view_url = '{}/view'.format(self.base_url)
        self.edit_url = '{}/edit'.format(self.base_url)

    def test_authenticate_policy_update(self):
        """
        Test that authenticated new users are shown the policies page regardless of what page was requested
        if they have policies they have not yet agreed to.
        """
        base_url = '/channels/{}'.format(self.channel.pk)
        self.channel.viewers.add(self.user)
        self.client.force_login(self.user)

        assert len(check_policies(self.user)) > 0
        # ensure that a new user is redirected to policy update after authenticating the first time.
        response = self.client.get(base_url, follow=True)
        assert "/policies/update" == response.redirect_chain[-1][0]

    def test_staging_channel_access(self):
        staging_url = '{}/staging'.format(self.base_url)

        # test that when we are redirected we get taken to the login page since we're not signed in,
        # and that after sign in we'll get sent to the right place.
        response = self.get(staging_url, follow=True)
        assert "/accounts/login/?next={}".format(staging_url) == response.redirect_chain[-1][0]
        assert response.status_code == 200

        self.sign_in()

        response = self.get(staging_url)
        assert response.status_code == 403

        self.channel.viewers.add(self.user)

        response = self.get(staging_url)
        assert response.status_code == 403

        self.channel.editors.add(self.user)

        # finally!
        response = self.get(staging_url)
        assert response.status_code == 200

    def test_channel_admin_access(self):
        admin_url = '/channels/administration/'

        response = self.get(admin_url, follow=True)
        assert "/accounts/login/?next={}".format(admin_url) == response.redirect_chain[-1][0]
        assert response.status_code == 200

        self.sign_in()

        response = self.get(admin_url)
        assert response.status_code == 403

        self.user.is_admin = True
        self.user.save()

        response = self.get(admin_url)
        assert response.status_code == 200

    def test_unathenticated_channel_access(self):
        """
        Ensures that short URLs without /view or /edit redirect based on the user's permissions,
        that unauthenticated users are sent to the login page with the page they requested set as next,
        and that direct visits to /edit or /view present unauthorized messages when the user doesn't have permissions.
        """

        response = self.client.get(self.base_url)
        # test that it redirects
        assert response.status_code == 302

        # now test that when we are redirected we get taken to the login page since we're not signed in,
        # and that after sign in we'll get sent to the right place.
        response = self.get(self.base_url, follow=True)
        assert "/accounts/login/?next={}".format(self.view_url) == response.redirect_chain[-1][0]
        assert response.status_code == 200

    def test_no_rights_channel_access(self):
        self.sign_in()

        response = self.get(self.base_url, follow=True)
        assert self.view_url == response.redirect_chain[-1][0]
        assert response.status_code == 403

        response = self.get(self.view_url)
        assert response.status_code == 403

        # /edit URL first switches to /view in case the user has view access, so make sure we track the redirect
        response = self.get(self.edit_url, follow=True)
        assert response.status_code == 403

    def test_view_only_channel_access(self):
        self.sign_in()

        self.channel.viewers.add(self.user)

        response = self.get(self.base_url, follow=True)
        assert self.view_url == response.redirect_chain[-1][0]
        assert response.status_code == 200

        response = self.get(self.view_url)
        assert response.status_code == 200

        # make sure that a view-only user gets redirected if requesting edit page
        response = self.get(self.edit_url, follow=True)
        assert self.view_url == response.redirect_chain[-1][0]
        assert response.status_code == 200

    def test_edit_channel_access(self):
        self.sign_in()
        self.channel.editors.add(self.user)

        # we can edit!
        response = self.get(self.base_url, follow=True)
        assert self.edit_url == response.redirect_chain[-1][0]
        assert response.status_code == 200

        response = self.get(self.view_url)
        assert response.status_code == 200

        response = self.get(self.edit_url)
        assert response.status_code == 200
