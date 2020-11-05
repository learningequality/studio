from django.conf import settings
from django.http import HttpResponseRedirect
from django.shortcuts import redirect
from django.urls import is_valid_path, resolve, Resolver404
from django.urls.resolvers import RegexURLResolver
from django.utils import translation
from django.utils.translation import get_language

from django.utils.translation import LANGUAGE_SESSION_KEY
from django.utils.translation.trans_real import check_for_language
from django.utils.translation.trans_real import get_language_from_path
from django.utils.translation.trans_real import get_languages
from django.utils.translation.trans_real import get_supported_language_variant
from django.utils.translation.trans_real import language_code_re
from django.utils.translation.trans_real import parse_accept_lang_header


def get_accept_headers_language(request):
    accept = request.META.get("HTTP_ACCEPT_LANGUAGE", "")
    for accept_lang, unused in parse_accept_lang_header(accept):
        if accept_lang == "*":
            break

        if not language_code_re.search(accept_lang):
            continue

        try:
            return get_supported_language_variant(accept_lang)
        except LookupError:
            continue


def get_language_from_request_and_is_from_path(request):  # noqa complexity-16
    """
    Analyzes the request to find what language the user wants the system to
    show. Only languages listed in settings.LANGUAGES are taken into account.
    If the user requests a sublanguage where we have a main language, we send
    out the main language. It also returns a value to determine if the language code
    was derived from a language code in the URL, or inferred from some other source.
    :returns: tuple of language code, boolean. The former can be None if the url being
    requested does not require translation, otherwise it should be a language code
    from the values in settings.LANGUAGES. The boolean should indicate whether the
    language code was calculated by reading a language code from the requested URL.
    In the case that it was, True should be returned, in the case where the URL language
    code was not used or not present, False is returned.
    """

    try:
        # If this is not a view that needs to be translated, return None, and be done with it!
        if not getattr(resolve(request.path_info).func, "translated", False):
            return None, False
    except Resolver404:
        # If this is an unrecognized URL, it may be redirectable to a language prefixed
        # URL, so let the language code setting carry on from here.
        pass

    supported_lang_codes = get_languages()

    lang_code = get_language_from_path(request.path_info)
    if lang_code in supported_lang_codes and lang_code is not None:
        return lang_code, True

    if hasattr(request, "session"):
        lang_code = request.session.get(LANGUAGE_SESSION_KEY)
        if (
            lang_code in supported_lang_codes
            and lang_code is not None
            and check_for_language(lang_code)
        ):
            return lang_code, False

    headers_language = get_accept_headers_language(request)

    if headers_language is not None:
        return headers_language, False

    return get_settings_language(), False


def get_settings_language():
    try:
        return get_supported_language_variant(settings.LANGUAGE_CODE)
    except LookupError:
        return settings.LANGUAGE_CODE


class StudioLocaleMiddleware(object):
    """
    Copied and then modified into a new style middleware from:
    https://github.com/django/django/blob/stable/1.11.x/django/middleware/locale.py
    Also has several other changes to suit our purposes.
    The principal concern of this middleware is to activate translation for the current
    language, so that throughout the lifecycle of this request, any translation or language
    related functionality is set to the appropriate locale.
    Unlike the Django middleware, this middleware only runs on requests to URLs that are
    prefixed by a language code. Other URLs, such as for untranslated API endpoints do not
    have a language code set on them.
    """

    def __init__(self, get_response):
        # Standard boilerplate for a new style Django middleware.
        self.get_response = get_response

    def __call__(self, request):
        # First get the language code, and whether this was calculated from the path
        # i.e. was this a language-prefixed URL.
        language, language_from_path = get_language_from_request_and_is_from_path(
            request
        )
        # If this URL has been resolved to a view, and the view is not on a language prefixed
        # URL, then the function above will return None for the language code to indicate that
        # no translation is necessary.
        if language is not None:
            # Only activate translation if there is a language code returned.
            translation.activate(language)
            request.LANGUAGE_CODE = get_language()

        response = self.get_response(request)

        if language is not None:

            language = get_language()

            if response.status_code == 404 and not language_from_path:
                # Maybe the language code is missing in the URL? Try adding the
                # language prefix and redirecting to that URL.
                # First get any global prefix that is being used.
                script_prefix = get_language()
                # Replace the global prefix with the global prefix and the language prefix.
                language_path = request.path_info.replace(
                    script_prefix, "%s%s/" % (script_prefix, language), 1
                )

                # Get the urlconf from the request, default to the global settings ROOT_URLCONF
                urlconf = getattr(request, "urlconf", settings.ROOT_URLCONF)
                # Check if this is a valid path
                path_valid = is_valid_path(language_path, urlconf)
                # Check if the path is only invalid because it is missing a trailing slash
                path_needs_slash = not path_valid and (
                    settings.APPEND_SLASH
                    and not language_path.endswith("/")
                    and is_valid_path("%s/" % language_path, urlconf)
                )
                # If the constructed path is valid, or it would be valid with a trailing slash
                # then redirect to the prefixed path, with a trailing slash added if needed.
                if path_valid or path_needs_slash:
                    # Insert language after the script prefix and before the
                    # rest of the URL
                    language_url = request.get_full_path(
                        force_append_slash=path_needs_slash
                    ).replace(script_prefix, "%s%s/" % (script_prefix, language), 1)
                    return HttpResponseRedirect(language_url)

            # Add a content language header to the response if not already present.
            if "Content-Language" not in response:
                response["Content-Language"] = language

        return response


