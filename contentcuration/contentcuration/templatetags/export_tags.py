import base64
import os
import sys

from django.conf import settings
from django import template
from django.template.defaultfilters import stringfilter

from contentcuration.utils.files import get_thumbnail_encoding

import cStringIO

THUMBNAIL_DIMENSION = 200

register = template.Library()

@register.filter(is_safe=True)
@stringfilter
def encode_base64(value):
    try:
        return get_thumbnail_encoding(value, dimension=200)
    except IOError:
        filepath = os.path.join(settings.STATIC_ROOT, 'img', 'kolibri_placeholder.png')

        with open(filepath, 'rb') as image_file:
            _, ext = os.path.splitext(value)
            return "data:image/{};base64,{}".format(ext[1:], base64.b64encode(image_file.read()))

@register.filter(is_safe=True)
@stringfilter
def encode_static_base64(value):
    filepath = os.path.join(settings.STATIC_ROOT, 'img', value)

    with open(filepath, 'rb') as image_file:
        _, ext = os.path.splitext(value)
        return "data:image/{};base64,{}".format(ext[1:], base64.b64encode(image_file.read()))
