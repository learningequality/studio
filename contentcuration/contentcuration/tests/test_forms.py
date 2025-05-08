from django.conf import settings
from mock import mock

from contentcuration.forms import ForgotPasswordForm
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase


class ForgotPasswordFormTest(StudioAPITestCase):
    def setUp(self):
        self.request = mock.Mock()
        self.data = dict(email="tester@tester.com")
        self.form = ForgotPasswordForm(data=self.data)
        self.form.full_clean()
        self.form.get_activation_key = mock.Mock()
        self.extra_email_context = dict(site="LE", domain="test.learningequality.org")

    @mock.patch("contentcuration.forms.PasswordResetForm.save")
    def test_save__active(self, parent_save):
        testdata.user("tester@tester.com")
        self.form.save(
            request=self.request,
            extra_email_context=self.extra_email_context,
            from_email="another@tester.com",
        )
        parent_save.assert_called_once_with(
            request=self.request,
            extra_email_context=self.extra_email_context,
            from_email="another@tester.com",
        )

    @mock.patch("contentcuration.forms.render_to_string")
    @mock.patch("contentcuration.forms.User.email_user")
    def test_save__inactive(self, email_user, render_to_string):
        user = testdata.user("tester@tester.com")
        user.is_active = False
        user.save()

        self.form.get_activation_key.return_value = "activation key"
        render_to_string.side_effect = ["Subject", "Message"]
        self.form.save(
            request=self.request,
            extra_email_context=self.extra_email_context,
            from_email="another@tester.com",
        )
        context = {
            "activation_key": "activation key",
            "expiration_days": settings.ACCOUNT_ACTIVATION_DAYS,
            "site": "LE",
            "user": user,
            "domain": "test.learningequality.org",
        }
        render_to_string.assert_any_call(
            "registration/password_reset_subject.txt", context
        )
        render_to_string.assert_any_call(
            "registration/activation_needed_email.txt", context
        )
        email_user.assert_called_once_with(
            "Subject", "Message", settings.DEFAULT_FROM_EMAIL
        )

    @mock.patch("contentcuration.forms.render_to_string")
    @mock.patch("contentcuration.forms.User.email_user")
    def test_save__inactive__no_password(self, email_user, render_to_string):
        user = testdata.user("tester@tester.com")
        user.is_active = False
        user.password = ""
        user.save()

        render_to_string.side_effect = ["Subject", "Message"]
        self.form.save(
            request=self.request,
            extra_email_context=self.extra_email_context,
            from_email="another@tester.com",
        )
        self.form.get_activation_key.assert_not_called()
        context = {
            "site": "LE",
            "user": user,
            "domain": "test.learningequality.org",
        }
        render_to_string.assert_any_call(
            "registration/password_reset_subject.txt", context
        )
        render_to_string.assert_any_call(
            "registration/registration_needed_email.txt", context
        )
        email_user.assert_called_once_with(
            "Subject", "Message", settings.DEFAULT_FROM_EMAIL
        )

    @mock.patch("contentcuration.forms.render_to_string")
    @mock.patch("contentcuration.forms.User.email_user")
    @mock.patch("contentcuration.forms.PasswordResetForm.save")
    def test_save__missing(self, parent_save, email_user, render_to_string):
        self.form.save(
            request=self.request,
            extra_email_context=self.extra_email_context,
            from_email="another@tester.com",
        )
        parent_save.assert_not_called()
        self.form.get_activation_key.assert_not_called()
        render_to_string.assert_not_called()
        email_user.assert_not_called()
