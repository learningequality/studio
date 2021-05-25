import json
import os

from django.conf import settings
from django.utils.translation import get_language
from django.utils.translation import to_locale

_JSON_MESSAGES_FILE_CACHE = {}


def locale_data_file(locale):
    path = getattr(settings, "LOCALE_PATHS")[0]
    return os.path.join(path, locale, "LC_MESSAGES", "contentcuration-messages.json")


def get_messages():
    global _JSON_MESSAGES_FILE_CACHE

    locale = to_locale(get_language())

    if locale not in _JSON_MESSAGES_FILE_CACHE:
        try:
            with open(locale_data_file(locale), "rb") as data:
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
