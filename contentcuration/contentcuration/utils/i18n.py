# -*- coding: utf-8 -*-
import io
import json
import os

from django.utils.translation import get_language
from django.utils.translation import get_language_bidi
from django.utils.translation import get_language_info

import contentcuration


# List of intl codes that Studio officially supports
SUPPORTED_LANGUAGES = [
    "ar",
    "en",
    "es-es",
    "fr-fr",
    "pt-br",
]


def _get_language_info():
    file_path = os.path.abspath(
        os.path.join(
            os.path.dirname(contentcuration.__file__),
            os.pardir,
            "locale",
            "language_info.json",
        )
    )
    with io.open(file_path, encoding="utf-8") as f:
        languages = json.load(f)
        output = {}
        for language in languages:
            if language["intl_code"] in SUPPORTED_LANGUAGES:
                output[language["intl_code"]] = language
        return output


LANGUAGE_INFO = _get_language_info()


def language_globals():
    language_code = get_language()
    lang_dir = "rtl" if get_language_bidi() else "ltr"

    languages = {}
    for code in SUPPORTED_LANGUAGES:
        lang_info = LANGUAGE_INFO[code]
        languages[code] = {
            # Format to match the schema of the content Language model
            "id": code,
            "lang_name": lang_info["language_name"],
            "english_name": lang_info["english_name"]
            if lang_info
            else get_language_info(code)["name"],
            "lang_direction": get_language_info(code)["bidi"],
        }

    return {
        "languageCode": language_code,
        "languageDir": lang_dir,
        "languages": languages,
    }
