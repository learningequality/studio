import base64
import os
import sys

from django.conf import settings
from django import template
from django.template.defaultfilters import stringfilter
from PIL import Image
from resizeimage import resizeimage

from contentcuration.models import generate_file_on_disk_name


import cStringIO

THUMBNAIL_DIMENSION = 200

register = template.Library()

@register.filter(is_safe=True)
@stringfilter
def encode_base64(value):
    if value.startswith("data:image"):
        return value

    try:
        checksum, ext = os.path.splitext(value)
        filepath = generate_file_on_disk_name(checksum, value)
        buffer = cStringIO.StringIO()

        with Image.open(filepath) as image:
            width, height = image.size
            dimension = min([THUMBNAIL_DIMENSION, width, height])
            image.thumbnail((dimension, dimension), Image.ANTIALIAS)
            image.save(buffer, image.format)
            return "data:image/{};base64,{}".format(ext[1:], base64.b64encode(buffer.getvalue()))
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
