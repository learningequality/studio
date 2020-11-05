import json
import os
import re

from django.conf import settings
from django.utils.translation import get_language
from django.utils.translation import to_locale
from django.urls.resolvers import RegexURLResolver
from django.utils.translation.trans_real import get_supported_language_variant

_JSON_MESSAGES_FILE_CACHE = {}


def locale_data_file(locale):
    path = getattr(settings, 'LOCALE_PATHS')[0]
    return os.path.join(path, locale, "LC_MESSAGES", "contentcuration-messages.json")


def get_messages():
    global _JSON_MESSAGES_FILE_CACHE

    locale = to_locale(get_language())

    if locale not in _JSON_MESSAGES_FILE_CACHE:
        try:
            with open(locale_data_file(locale), 'rb') as data:
                message_json = json.load(data)
                translation_dict = {}
                for key, value in list(message_json.items()):
                    namespace, key = key.split(".")
                    translation_dict[namespace] = translation_dict.get(namespace) or {}
                    translation_dict[namespace][key] = value
                _JSON_MESSAGES_FILE_CACHE[locale] = translation_dict
        except IOError:
            _JSON_MESSAGES_FILE_CACHE[locale] = {}

    return _JSON_MESSAGES_FILE_CACHE[locale]


class LocaleRegexURLResolver(RegexURLResolver):
    """
    A URL resolver that always matches the active language code as URL prefix.
    Rather than taking a regex argument, we just override the ``regex``
    function to always return the active language-code as regex.
    Vendored from https://github.com/django/django/blob/stable/1.11.x/django/urls/resolvers.py
    As using the Django internal version inside included URL configs is disallowed.
    Rather than monkey patch Django to allow this for our use case, make a copy of this here
    and use this instead.
    """

    def __init__(
        self,
        urlconf_name,
        default_kwargs=None,
        app_name=None,
        namespace=None,
        prefix_default_language=True,
        prefix=None,
    ):
        super(LocaleRegexURLResolver, self).__init__(
            None, urlconf_name, default_kwargs, app_name, namespace
        )
        self.prefix_default_language = prefix_default_language
        self._prefix = prefix

    @property
    def regex(self):
        language_code = get_language()
        if language_code not in self._regex_dict:
            if language_code and not self.prefix_default_language:
                regex_string = self._prefix or ""
            else:
                regex_string = ("^%s/" % language_code) + (self._prefix or "")
            self._regex_dict[language_code] = re.compile(regex_string, re.UNICODE)
        return self._regex_dict[language_code]


def i18n_patterns(urls, prefix=None):
    """
    Add the language code prefix to every URL pattern within this function.
    Vendored from https://github.com/django/django/blob/stable/1.11.x/django/conf/urls/i18n.py
    to allow use of this outside of the root URL conf to prefix plugin non-api urls.
    """
    if not settings.USE_I18N:
        return list(urls)

    def recurse_urls_and_set(urls_to_set):
        for url in urls_to_set:
            if hasattr(url, "urlpatterns") and url.urlpatterns:
                recurse_urls_and_set(url.urlpatterns)
            elif hasattr(url, "callback") and url.callback:
                setattr(url.callback, "translated", True)

    recurse_urls_and_set(urls)
    return [LocaleRegexURLResolver(list(urls), prefix=prefix)]
