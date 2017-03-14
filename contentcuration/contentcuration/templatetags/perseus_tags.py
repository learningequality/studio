import json
from django import template
from django.template.defaultfilters import stringfilter

register = template.Library()

@register.filter
@stringfilter
def jsonify(value):
    return json.dumps(value)[1:-1]
