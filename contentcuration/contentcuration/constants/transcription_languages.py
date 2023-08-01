# The list of languages is obtained from the Whisper project on GitHub, specifically from the tokenizer module.
# You can find the complete list of available languages in the tokenizer module:
# https://github.com/openai/whisper/blob/main/whisper/tokenizer.py

# The supported languages are stored in the 'LANGUAGES' dictionary in the format of language code and language name.
# For example, the first element in the 'LANGUAGES' dictionary is ('en', 'english').

# To add support for a new model, we also need to update the `supportedLanguageList` array in the frontend TranscriptionLanguages.js file.
# https://github.com/learningequality/studio/blob/unstable/contentcuration/contentcuration/frontend/shared/leUtils/TranscriptionLanguages.js

import json
import le_utils.resources as resources

WHISPER_LANGUAGES = {
    "en": "english",
    "zh": "chinese",
    "de": "german",
    "es": "spanish",
    "ru": "russian",
    "ko": "korean",
    "fr": "french",
    "ja": "japanese",
    "pt": "portuguese",
    "tr": "turkish",
    "pl": "polish",
    "ca": "catalan",
    "nl": "dutch",
    "ar": "arabic",
    "sv": "swedish",
    "it": "italian",
    "id": "indonesian",
    "hi": "hindi",
    "fi": "finnish",
    "vi": "vietnamese",
    "he": "hebrew",
    "uk": "ukrainian",
    "el": "greek",
    "ms": "malay",
    "cs": "czech",
    "ro": "romanian",
    "da": "danish",
    "hu": "hungarian",
    "ta": "tamil",
    "no": "norwegian",
    "th": "thai",
    "ur": "urdu",
    "hr": "croatian",
    "bg": "bulgarian",
    "lt": "lithuanian",
    "la": "latin",
    "mi": "maori",
    "ml": "malayalam",
    "cy": "welsh",
    "sk": "slovak",
    "te": "telugu",
    "fa": "persian",
    "lv": "latvian",
    "bn": "bengali",
    "sr": "serbian",
    "az": "azerbaijani",
    "sl": "slovenian",
    "kn": "kannada",
    "et": "estonian",
    "mk": "macedonian",
    "br": "breton",
    "eu": "basque",
    "is": "icelandic",
    "hy": "armenian",
    "ne": "nepali",
    "mn": "mongolian",
    "bs": "bosnian",
    "kk": "kazakh",
    "sq": "albanian",
    "sw": "swahili",
    "gl": "galician",
    "mr": "marathi",
    "pa": "punjabi",
    "si": "sinhala",
    "km": "khmer",
    "sn": "shona",
    "yo": "yoruba",
    "so": "somali",
    "af": "afrikaans",
    "oc": "occitan",
    "ka": "georgian",
    "be": "belarusian",
    "tg": "tajik",
    "sd": "sindhi",
    "gu": "gujarati",
    "am": "amharic",
    "yi": "yiddish",
    "lo": "lao",
    "uz": "uzbek",
    "fo": "faroese",
    "ht": "haitian creole",
    "ps": "pashto",
    "tk": "turkmen",
    "nn": "nynorsk",
    "mt": "maltese",
    "sa": "sanskrit",
    "lb": "luxembourgish",
    "my": "myanmar",
    "bo": "tibetan",
    "tl": "tagalog",
    "mg": "malagasy",
    "as": "assamese",
    "tt": "tatar",
    "haw": "hawaiian",
    "ln": "lingala",
    "ha": "hausa",
    "ba": "bashkir",
    "jw": "javanese",
    "su": "sundanese",
}

def _load_kolibri_languages():
    """Load Kolibri languages from JSON file and return the language codes as a list."""
    filepath = resources.__path__[0]
    kolibri_languages = []
    with open(f'{filepath}/languagelookup.json') as f:
        kolibri_languages = list(json.load(f).keys())
    return kolibri_languages

def _load_model_languages(languages):
    """Load languages supported by the speech-to-text model."""
    return list(languages.keys())

def create_captions_languages():
    """Create the intersection of transcription model and Kolibri languages."""
    kolibri_set = set(_load_kolibri_languages())
    model_set = set(_load_model_languages(languages=WHISPER_LANGUAGES))
    return list(kolibri_set.intersection(model_set))

CAPTIONS_LANGUAGES = create_captions_languages()
