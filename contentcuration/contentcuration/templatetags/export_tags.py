from django import template
from django.template.defaultfilters import stringfilter
import base64

register = template.Library()


@register.filter(is_safe=True)
@stringfilter
def encode_base64(value):
    with open(value, "rb") as image_file:
        return base64.b64encode(image_file.read())
