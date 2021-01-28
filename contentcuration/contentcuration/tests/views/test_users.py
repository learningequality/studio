import json

from django.http.response import HttpResponseBadRequest
from django.http.response import HttpResponseForbidden
from django.http.response import HttpResponseRedirectBase
from mock import mock

from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.views.users import login


class LoginTestCase(StudioAPITestCase):
    def setUp(self):
        super(LoginTestCase, self).setUp()
        self.request = mock.Mock()
        self.request.method = "POST"
        self.user = testdata.user(email="tester@tester.com")
        self.request.body = json.dumps(dict(
            username="tester@tester.com",
            password="password",
        ))

    def test_login__not_post(self):
        self.request.method = "GET"
        redirect = login(self.request)
        self.assertIsInstance(redirect, HttpResponseRedirectBase)
        self.assertIn("accounts", redirect['Location'])

    def test_login__not_found(self):
        self.user.email = "different@tester.com"
        self.user.save()
        self.assertIsInstance(login(self.request), HttpResponseForbidden)

    def test_login__not_active(self):
        self.user.is_active = False
        self.user.save()
        self.assertIsInstance(login(self.request), HttpResponseBadRequest)

    def test_login__invalid_password(self):
        self.user.set_password("tester")
        self.user.save()
        self.assertIsInstance(login(self.request), HttpResponseForbidden)

    @mock.patch("contentcuration.views.users.djangologin")
    def test_login__success(self, djangologin):
        redirect = login(self.request)
        djangologin.assert_called()
        self.assertIsInstance(redirect, HttpResponseRedirectBase)
        self.assertIn("channels", redirect['Location'])

    def test_login__case_sensitivity(self):
        with mock.patch("contentcuration.views.users.djangologin") as djangologin:
            self.user.email = "Tester@tester.com"
            self.user.is_active = False
            self.user.save()

            user2 = testdata.user(email="tester@tester.com")
            user2.set_password("tester")
            user2.save()

            self.request.body = json.dumps(dict(
                username="tester@tester.com",
                password="tester",
            ))

            redirect = login(self.request)
            djangologin.assert_called()
            self.assertIsInstance(redirect, HttpResponseRedirectBase)
            self.assertIn("channels", redirect['Location'])
