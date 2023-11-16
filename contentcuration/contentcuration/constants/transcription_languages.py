# The list of supported AI languages is dynamically loaded from a JSON file.
# You can update the supported languages for transcription by modifying the 'ai_supported_languages.json' file.
# The script then determines the intersection of languages supported by the Kolibri project and the Whisper speech-to-text model.
# The resulting list of language codes is stored in CAPTION_LANGUAGES for creating captions.
# Note: To update supported languages, modify the 'ai_supported_languages.json' file.

import os
import json
from typing import List, Dict

import le_utils.resources as resources


def _ai_supported_languages() -> Dict:
    """Loads JSON of supported AI languages"""
    file = os.path.join(
        os.path.dirname(os.path.realpath(__file__)),
        "../static/ai_supported_languages.json",
    )
    with open(file) as f:
        data = json.load(f)
    return data


WHISPER_LANGUAGES = _ai_supported_languages()


def _load_kolibri_languages() -> List[str]:
    """Loads the language codes from languagelookup.json and returns them as a list."""
    filepath = resources.__path__[0]
    kolibri_languages = []
    with open(f"{filepath}/languagelookup.json") as f:
        kolibri_languages = list(json.load(f).keys())
    return kolibri_languages


def _load_model_languages(languages: Dict[str, str]) -> List[str]:
    """Load languages supported by the speech-to-text model.
    :param: languages: dict mapping language codes to language names"""
    return list(languages.keys())


def create_captions_languages() -> List[str]:
    """Returns the intersection of Kolibri languages and model languages"""
    kolibri_set = set(_load_kolibri_languages())
    model_set = set(_load_model_languages(languages=WHISPER_LANGUAGES))
    return list(kolibri_set.intersection(model_set))


# list of language id's ['en', 'hi', ...]
CAPTION_LANGUAGES = create_captions_languages()
