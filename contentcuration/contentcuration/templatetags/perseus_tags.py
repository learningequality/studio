import re
from django import template
from django.template.defaultfilters import stringfilter

register = template.Library()

@register.filter
@stringfilter
def escape_newline(value):
	return value.replace('\n', '\\n')

@register.filter
@stringfilter
def escape_chars(value):
	return value.replace('\n', '\\n').replace('\\"', '"')