import json
from django import template

register = template.Library()

@register.filter
def get_value(dictionary, key):
	dict = json.loads(dictionary)
	return dict.get(key)