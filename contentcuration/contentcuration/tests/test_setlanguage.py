import json

from django.conf import settings
from django.http import HttpResponseNotAllowed
from django.test import override_settings
from django.test import TestCase
from django.urls import reverse
from django.urls import translate_url
from django.utils.translation import get_language
from django.utils.translation import LANGUAGE_SESSION_KEY


@override_settings(LANGUAGE_CODE="en")
class I18NTests(TestCase):
    """
    Tests set_language view in kolibri/core/views.py
    Copied from https://github.com/django/django/blob/stable/1.11.x/tests/view_tests/tests/test_i18n.py
    """

    def set_post_data(self, lang_code, next_url=""):
        post_data = {
            "language": lang_code,
            "next": next_url,
        }
        return json.dumps(post_data)

    def _get_inactive_language_code(self):
        """Return language code for a language which is not activated."""
        current_language = get_language()
        return [
            code for code, name in settings.LANGUAGES if not code == current_language
        ][0]

    def test_setlang(self):
        """
        The set_language view can be used to change the session language.
        """
        lang_code = self._get_inactive_language_code()
        response = self.client.post(
            reverse("set_language"),
            self.set_post_data(lang_code),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content.decode("utf-8"),
            translate_url(reverse("base"), lang_code),
        )
        self.assertEqual(self.client.session[LANGUAGE_SESSION_KEY], lang_code)

    def test_setlang_next_valid(self):
        """
        The set_language view can be used to change the session language.
        The user is redirected to the "next" argument.
        """
        lang_code = self._get_inactive_language_code()
        next_url = reverse("channels")
        response = self.client.post(
            reverse("set_language"),
            self.set_post_data(lang_code, next_url),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content.decode("utf-8"),
            translate_url(reverse("channels"), lang_code),
        )
        self.assertEqual(self.client.session[LANGUAGE_SESSION_KEY], lang_code)

    def test_setlang_next_invalid(self):
        """
        The set_language view can be used to change the session language.
        The user is redirected to base redirect if the "next" argument is invalid.
        """
        lang_code = self._get_inactive_language_code()
        next_url = "/not/a/real/url"
        response = self.client.post(
            reverse("set_language"),
            self.set_post_data(lang_code, next_url),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content.decode("utf-8"),
            translate_url(reverse("base"), lang_code),
        )
        self.assertEqual(self.client.session[LANGUAGE_SESSION_KEY], lang_code)

    def test_setlang_null(self):
        """
        Test language code set to null which shoul direct to default language "en"
        """
        lang_code = self._get_inactive_language_code()
        response = self.client.post(
            reverse("set_language"),
            self.set_post_data(lang_code),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content.decode("utf-8"),
            translate_url(reverse("base"), lang_code),
        )
        self.assertEqual(self.client.session[LANGUAGE_SESSION_KEY], lang_code)
        lang_code = None
        response = self.client.post(
            reverse("set_language"),
            self.set_post_data(lang_code),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content.decode("utf-8"),
            translate_url(reverse("base"), "en"),
        )
        self.assertFalse(LANGUAGE_SESSION_KEY in self.client.session)

    def test_setlang_null_next_valid(self):
        """
        The set_language view can be used to change the session language.
        The user is redirected to the "next" argument.
        """
        lang_code = self._get_inactive_language_code()
        response = self.client.post(
            reverse("set_language"),
            self.set_post_data(lang_code),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content.decode("utf-8"),
            translate_url(reverse("base"), lang_code),
        )
        self.assertEqual(self.client.session[LANGUAGE_SESSION_KEY], lang_code)
        next_url = reverse("channels")
        lang_code = None
        response = self.client.post(
            reverse("set_language"),
            self.set_post_data(lang_code, next_url),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content.decode("utf-8"),
            translate_url(reverse("channels"), "en"),
        )
        self.assertFalse(LANGUAGE_SESSION_KEY in self.client.session)

    def test_setlang_null_next_invalid(self):
        """
        The set_language view can be used to change the session language.
        The user is redirected to user redirect if the "next" argument is invalid.
        """
        lang_code = self._get_inactive_language_code()
        response = self.client.post(
            reverse("set_language"),
            self.set_post_data(lang_code),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content.decode("utf-8"),
            translate_url(reverse("base"), lang_code),
        )
        self.assertEqual(self.client.session[LANGUAGE_SESSION_KEY], lang_code)
        next_url = "/not/a/real/url"
        lang_code = None
        response = self.client.post(
            reverse("set_language"),
            self.set_post_data(lang_code, next_url),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.content.decode("utf-8"),
            translate_url(reverse("base"), "en"),
        )
        self.assertFalse(LANGUAGE_SESSION_KEY in self.client.session)

    def test_setlang_get(self):
        """
        The set_language view is forbidden to be accessed via GET
        """
        lang_code = self._get_inactive_language_code()
        response = self.client.get(
            reverse("set_language"),
            params=self.set_post_data(lang_code),
            content_type="application/json",
        )
        self.assertEqual(type(response), HttpResponseNotAllowed)
