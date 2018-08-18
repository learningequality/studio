import datetime
from contentcuration.utils.policies import check_policies, get_latest_policies, POLICIES

from base import BaseTestCase


class AuthenticationTestCase(BaseTestCase):
    def test_authenticate_policy_update(self):
        """
        Test that authenticated new users are shown the policies page regardless of what page was requested
        if they have policies they have not yet agreed to.
        """
        channel_id = self.channel.pk
        base_url = '/channels/{}'.format(channel_id)

        self.channel.viewers.add(self.user)
        self.client.force_login(self.user)

        assert len(check_policies(self.user)) > 0
        # ensure that a new user is redirected to policy update after authenticating the first time.
        response = self.client.get(base_url, follow=True)
        assert "/policies/update" == response.redirect_chain[-1][0]

    def test_channel_access(self):
        """
        Ensures that short URLs without /view or /edit redirect based on the user's permissions,
        that unauthenticated users are sent to the login page with the page they requested set as next,
        and that direct visits to /edit or /view present unauthorized messages when the user doesn't have permissions.
        """
        channel_id = self.channel.pk
        base_url = '/channels/{}'.format(channel_id)
        view_url = '{}/view'.format(base_url)
        edit_url = '{}/edit'.format(base_url)
        response = self.client.get(base_url)
        # test that it redirects
        assert response.status_code == 302

        # now test that when we are redirected we get taken to the login page since we're not signed in,
        # and that after sign in we'll get sent to the right place.
        response = self.get(base_url, follow=True)
        assert "/accounts/login/?next={}".format(view_url) == response.redirect_chain[-1][0]
        assert response.status_code == 200

        # We agree to #allthethings, so let us in!
        for policy in get_latest_policies():
            self.user.policies = {policy: datetime.datetime.now().strftime("%d/%m/%y %H:%M")}
        self.user.save()
        self.client.force_login(self.user)

        # TODO: See if it's possible to pull in unauthorized.html and check that its contents are in the response.
        unauthorized_str = "You do not have access to this page."

        response = self.get(base_url, follow=True)
        assert "/channels/{}/view".format(channel_id) == response.redirect_chain[-1][0]
        assert response.status_code == 200
        assert unauthorized_str in response.content

        self.channel.viewers.add(self.user)

        response = self.get(base_url, follow=True)
        assert "/channels/{}/view".format(channel_id) == response.redirect_chain[-1][0]
        assert response.status_code == 200
        assert not unauthorized_str in response.content

        response = self.get(view_url, follow=True)
        assert response.status_code == 200
        assert not unauthorized_str in response.content

        # make sure that a view-only user gets redirected if requesting edit page
        response = self.get(edit_url, follow=True)
        assert "/channels/{}/view".format(channel_id) == response.redirect_chain[-1][0]
        assert response.status_code == 200
        assert not unauthorized_str in response.content

        self.channel.editors.add(self.user)

        # we can edit!
        response = self.get(base_url, follow=True)
        assert "/channels/{}/edit".format(channel_id) == response.redirect_chain[-1][0]
        assert response.status_code == 200
        assert not unauthorized_str in response.content

        response = self.get(edit_url, follow=True)
        assert response.status_code == 200
        assert not unauthorized_str in response.content
