from django import template
from django.template.defaultfilters import stringfilter
from django.utils.translation import ugettext_lazy as _
from contentcuration.utils.format import format_size as fsize


register = template.Library()


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
    return "{} {}".format(*fsize(value))
