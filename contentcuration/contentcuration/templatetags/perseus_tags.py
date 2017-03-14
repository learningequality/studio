import json
from django import template
from django.template.defaultfilters import stringfilter

register = template.Library()

@register.filter
@stringfilter
def escape_chars(value):
    return json.dumps(value)[1:-1]
