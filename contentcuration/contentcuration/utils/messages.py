import json
import os

from django.conf import settings
from django.utils.translation import get_language
from django.utils.translation import to_locale

_JSON_MESSAGES_FILE_CACHE = {}


def locale_data_file(locale):
    path = getattr(settings, 'LOCALE_PATHS')[0]
    locale_path = os.path.join(path, locale)

    # if locale_path doesn't exist for a particular country, check if we have base language support
    if not os.path.exists(locale_path) and "_" in locale:
        locale_path = os.path.join(path, locale.split("_")[0])

    full_path = os.path.join(locale_path, "LC_FRONTEND_MESSAGES", "contentcuration-messages.json")
    return full_path


def get_messages():
    global _JSON_MESSAGES_FILE_CACHE

    locale = to_locale(get_language())

    if locale not in _JSON_MESSAGES_FILE_CACHE:
        try:
            with open(locale_data_file(locale), 'rb') as data:
                message_json = json.load(data)
                translation_dict = {}
                for key, value in message_json.items():
                    namespace, key = key.split(".")
                    translation_dict[namespace] = translation_dict.get(namespace) or {}
                    translation_dict[namespace][key] = value
                _JSON_MESSAGES_FILE_CACHE[locale] = json.dumps(translation_dict)
        except IOError:
            _JSON_MESSAGES_FILE_CACHE[locale] = json.dumps({})

    return _JSON_MESSAGES_FILE_CACHE[locale]
