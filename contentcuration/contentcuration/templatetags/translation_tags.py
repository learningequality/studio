from django import template
from django.conf import settings
from django.template.defaultfilters import stringfilter
from django.utils.safestring import mark_safe
from django.utils.translation import get_language
from django.utils.translation import get_language_info
from django.utils.translation import gettext_lazy as _
from webpack_loader import utils

from contentcuration.utils.format import format_size as fsize


register = template.Library()
LANGUAGES = {
    "en": "english",
    "es": "spanish",
    "ar": "arabic"
}


@register.filter(is_safe=True)
@stringfilter
def get_translation(value):

    MESSAGES = {
        "do_all": _("100% Correct"),
        "num_correct_in_a_row_10": _("10 in a row"),
        "num_correct_in_a_row_2": _("2 in a row"),
        "num_correct_in_a_row_3": _("3 in a row"),
        "num_correct_in_a_row_5": _("5 in a row"),
        "m_of_n": _("M of N..."),
        "CC BY": _("CC BY"),
        "CC BY-SA": _("CC BY-SA"),
        "CC BY-ND": _("CC BY-ND"),
        "CC BY-NC": _("CC BY-NC"),
        "CC BY-NC-SA": _("CC BY-NC-SA"),
        "CC BY-NC-ND": _("CC BY-NC-ND"),
        "All Rights Reserved": _("All Rights Reserved"),
        "Public Domain": _("Public Domain"),
        "Special Permissions": _("Special Permissions"),
    }

    return MESSAGES.get(value)


@register.filter(is_safe=True)
def format_size(value):
    size, unit = fsize(value)
    return _("%(filesize)s %(unit)s") % {'filesize': size, 'unit': unit}


@register.simple_tag
def render_bundle_css(bundle_name, config='DEFAULT', attrs=''):
    """
    A tag to conditionally load css depending on whether the page is being rendered for
    an LTR or RTL language. Using webpack-rtl-plugin, we now have two css files for every
    bundle. One that just ends in .css for LTR, and the other that ends in .rtl.css for RTL.
    This will conditionally load the correct one depending on the current language setting.
    """
    bidi = get_language_info(get_language())['bidi']
    files = utils.get_files(bundle_name, extension='css', config=config)
    if bidi:
        files = [x for x in files if x['name'].endswith('rtl.css')]
    else:
        files = [x for x in files if not x['name'].endswith('rtl.css')]
    tags = []
    for chunk in files:
        tags.append((
            '<link type="text/css" href="{0}" rel="stylesheet" {1}/>'
        ).format(chunk['url'], attrs))
    return mark_safe('\n'.join(tags))


@register.simple_tag
def render_offline_css(language):
    # Load css style for offline js
    language = LANGUAGES.get(language.split('-')[0]) or "english"
    filepath = "/".join([settings.STATIC_URL.rstrip("/"), "css", "offline-language-{}.css".format(language)])

    return mark_safe('<link type="text/css" href="{}" rel="stylesheet"/>'.format(filepath))
