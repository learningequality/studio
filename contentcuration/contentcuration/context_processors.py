from django.conf import settings
from django.template.loader import render_to_string
from django.urls import get_resolver
from django.utils.html import mark_safe
from django_js_reverse.core import _safe_json
from django_js_reverse.core import generate_json
from django_js_reverse.rjsmin import jsmin

from contentcuration.utils.i18n import language_globals
from contentcuration.views.json_dump import json_for_parse_from_data


def site_variables(request):
    return {
        "INCIDENT": settings.INCIDENT,
        "BETA_MODE": settings.BETA_MODE,
        "DEPRECATED": "contentworkshop" in request.get_host(),
        "STORAGE_BASE_URL": "{bucket}/{storage_root}/".format(
            bucket=settings.AWS_S3_BUCKET_NAME, storage_root=settings.STORAGE_ROOT
        ),
        "STORAGE_HOST": settings.AWS_S3_ENDPOINT_URL,
        "DEBUG": settings.DEBUG,
        "LANG_INFO": json_for_parse_from_data(language_globals()),
        "LOGGED_IN": not request.user.is_anonymous,
    }


def url_tag(self):
    # Modified from:
    # https://github.com/learningequality/kolibri/blob/release-v0.14.x/kolibri/core/kolibri_plugin.py#L36
    # This version revised to remove bundle-namespaced data.

    default_urlresolver = get_resolver(None)

    data = generate_json(default_urlresolver)

    # Generate the JS that exposes functions to reverse all Django URLs
    # in the frontend.
    js = render_to_string(
        "django_js_reverse/urls_js.tpl",
        context={"data": _safe_json(data), "js_name": "window.Urls"},
    )
    return {
        "I18N_URLS": mark_safe(
            """<script type="text/javascript">"""
            # Minify the generated Javascript
            + jsmin(js)
            + """</script>"""
        )
    }
