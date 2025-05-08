import json

from django.http.response import HttpResponseBadRequest
from django.http.response import HttpResponseForbidden
from django.http.response import HttpResponseNotAllowed
from django.http.response import HttpResponseRedirectBase
from django.urls import reverse_lazy
from mock import mock

from contentcuration.models import User
from contentcuration.tests import testdata
from contentcuration.tests.base import BaseAPITestCase
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.views.users import login
from contentcuration.views.users import UserActivationView


class LoginTestCase(StudioAPITestCase):
    def setUp(self):
        super(LoginTestCase, self).setUp()
        self.request = mock.Mock()
        self.request.method = "POST"
        self.user = testdata.user(email="tester@tester.com")
        self.request.body = json.dumps(
            dict(
                username="tester@tester.com",
                password="password",
            )
        )

    def test_login__not_post(self):
        self.request.method = "GET"
        redirect = login(self.request)
        self.assertIsInstance(redirect, HttpResponseRedirectBase)
        self.assertIn("accounts", redirect["Location"])

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
        self.assertIn("channels", redirect["Location"])

    def test_login__case_sensitivity(self):
        with mock.patch("contentcuration.views.users.djangologin") as djangologin:
            self.user.email = "Tester@tester.com"
            self.user.save()

            self.request.body = json.dumps(
                dict(
                    username="tester@Tester.com",
                    password="password",
                )
            )

            redirect = login(self.request)
            djangologin.assert_called()
            self.assertIsInstance(redirect, HttpResponseRedirectBase)
            self.assertIn("channels", redirect["Location"])

    def test_login__case_sensitivity__multiple(self):
        with mock.patch("contentcuration.views.users.djangologin") as djangologin:
            self.user.email = "Tester@tester.com"
            self.user.is_active = False
            self.user.save()

            user2 = testdata.user(email="tester@tester.com")
            user2.set_password("tester")
            user2.save()

            self.request.body = json.dumps(
                dict(
                    username="tester@tester.com",
                    password="tester",
                )
            )

            redirect = login(self.request)
            djangologin.assert_called()
            self.assertIsInstance(redirect, HttpResponseRedirectBase)
            self.assertIn("channels", redirect["Location"])

    def test_login__whitespace(self):
        with mock.patch("contentcuration.views.users.djangologin") as djangologin:
            self.request.body = json.dumps(
                dict(
                    username="tester@Tester.com ",
                    password="password",
                )
            )

            redirect = login(self.request)
            djangologin.assert_called()
            self.assertIsInstance(redirect, HttpResponseRedirectBase)
            self.assertIn("channels", redirect["Location"])

    def test_after_delete__no_login(self):
        with mock.patch("contentcuration.views.users.djangologin") as djangologin:
            self.user.delete()
            response = login(self.request)

            self.assertIsInstance(response, HttpResponseForbidden)
            djangologin.assert_not_called()


class UserRegistrationViewTestCase(BaseAPITestCase):
    def setUp(self):
        super(UserRegistrationViewTestCase, self).setUp()
        User.objects.filter(email="tester@tester.com").delete()
        self.view = reverse_lazy("register")
        self.request_data = dict(
            first_name="Tester",
            last_name="Tester",
            email="tester@tester.com",
            pasword1="tester123",
            pasword2="tester123",
            uses="IDK",
            source="IDK",
            policies=json.dumps(dict(policy_etc=True)),
            locations="IDK",
        )

    def test_post__no_duplicate_registration(self):
        testdata.user(email="tester@tester.com")
        response = self.post(self.view, self.request_data)
        self.assertIsInstance(response, HttpResponseForbidden)

    def test_post__inactive_registration(self):
        user = testdata.user(email="tester@tester.com")
        user.is_active = False
        user.save()
        response = self.post(self.view, self.request_data)
        self.assertIsInstance(response, HttpResponseNotAllowed)

    def test_post__password_too_short(self):
        self.request_data["pasword1"] = "123"
        self.request_data["pasword2"] = "123"
        response = self.post(self.view, self.request_data)
        self.assertIsInstance(response, HttpResponseBadRequest)
        self.assertIn("password1", response.content.decode())

    def test_post__after_delete(self):
        user = testdata.user(email="tester@tester.com")
        user.delete()
        response = self.post(self.view, self.request_data)
        self.assertIsInstance(response, HttpResponseForbidden)


class UserActivationViewTestCase(StudioAPITestCase):
    def setUp(self):
        super(UserActivationViewTestCase, self).setUp()
        self.view = UserActivationView()
        self.view.validate_key = mock.Mock()
        self.user = testdata.user(email="tester@tester.com")
        self.user.is_active = False
        self.user.save()
        self.kwargs = dict(activation_key="activation_key")

    def test_activate(self):
        self.view.validate_key.return_value = self.user.email
        self.assertEqual(self.user, self.view.activate(**self.kwargs))
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)

    def test_activate__invalid(self):
        self.view.validate_key.return_value = None
        self.assertFalse(self.view.activate(**self.kwargs))

    def test_activate__already_active(self):
        self.user.is_active = True
        self.user.save()

        self.view.validate_key.return_value = self.user.email
        self.assertEqual(self.user, self.view.activate(**self.kwargs))

    def test_activate__alternate_casing(self):
        user2 = testdata.user(email="Tester@tester.com")
        user2.set_password("tester")
        user2.save()

        self.view.validate_key.return_value = self.user.email
        self.assertFalse(self.view.activate(**self.kwargs))
