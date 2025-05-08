import base64
import logging as logmodule
import os

from django import template
from django.conf import settings
from django.template.defaultfilters import stringfilter

from contentcuration.utils.files import get_thumbnail_encoding


THUMBNAIL_DIMENSION = 200

# PDFs where encoding returns None will fail, so use this in case images aren't found
DEFAULT_ENCODING = (
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/"
    "9hAAACk0lEQVR4AaWTA7TbbABA8/+zreMdzbYOZtu2bbt4rpPUtvlebbezbdvMvsxmG99740"
    "CDF6z4p/G3RYkFLQPGmvj8mx30m7uo1LhNO6ou50r++zrkMoj/cRWUJmIz0gvEDXIVvP/Hbd"
    "xRte+chaXe7gDDsP9WwqLJixicgqWwsNrncZFJ2UnmM+Xy1awlqDz/LVsKC6oDtxA0k/B1aD"
    "Oi6rMBVVi2ys1Td+qd5NU8ZV0cWEKeWsZ4IKbdn3ikOJTogm9bw1PWw50twAWNFbS9oK1UlX"
    "Y337KA6sxwiBb/NIJYM3KrRNOSppD1YNtM9wwHUs+S188M38hXtCKKNSOAM4PmzKCgWQhaNU"
    "SiGCIE1DKGYozyJc5EW47ZZ2Ka3U0oNieTbLNjruOHsCO3LvNgq6cZznAHuAICah5DohjDUEG"
    "+OciQRsbQlFGKUOvrw9d6uSiiKcu3h9S86F7Me/oMtv/yFVsofaQCYHyhxtcLuFSGNDwatCGI"
    "SrZE6EzXIJYkoqILPR0k2oCMo/b1EOpcQqEnjkXPnseOX71uEuqDvQCTAqfjW5fhGkQlWyMQf"
    "acZYRHs61jc4HKOJAGXBE+1F1vjdRiwegEstrywB9OYK5zdITZH6xUHTnUADgLcpaBZD1omxCY"
    "5m6K7HRaEUDxDZjoyWOs9Xwu/43lbWTUKSfwwzNGfROX2hvg2wGrLjEcGIwTHTHR3sQW0jSEcIN"
    "tsnembjYu2z0fKfngHaEXm2jzYmXaUHL7k3H+z6YftOxagZXEXNJ2+eJV3zGF/8RZyWZ6RakH8ad"
    "Z9AksmLmz6nO2cy/3vl9+CnJdYZJRmn+x1HsOOh07BkcTF0p/z39hBuoJNuW9U2nF01rngydo/+xr"
    "/aXwDY2vpQfdHLrIAAAAASUVORK5CYII="
)

register = template.Library()
logmodule.basicConfig()
logging = logmodule.getLogger(__name__)


@register.filter(is_safe=True)
@stringfilter
def encode_base64(value, dimension=THUMBNAIL_DIMENSION):
    if value.startswith("data:image"):
        return value

    try:
        return get_thumbnail_encoding(value, dimension=dimension)
    except IOError:
        try:
            filepath = os.path.join(
                settings.STATIC_ROOT, "img", "kolibri_placeholder.png"
            )

            with open(filepath, "rb") as image_file:
                _, ext = os.path.splitext(value)
                return "data:image/{};base64,{}".format(
                    ext[1:], base64.b64encode(image_file.read())
                )
        except IOError:
            logging.warning("Could not find {}".format(value))
            return DEFAULT_ENCODING


@register.filter(is_safe=True)
@stringfilter
def encode_static_base64(value, dimension=None):
    try:
        if value.startswith(settings.STATIC_URL):
            value = os.path.basename(value)

        filepath = os.path.join(settings.STATIC_ROOT, "img", value)
        if dimension:
            return get_thumbnail_encoding(filepath, dimension=int(dimension))

        with open(filepath, "rb") as image_file:
            _, ext = os.path.splitext(value)
            return "data:image/{};base64,{}".format(
                ext[1:], base64.b64encode(image_file.read())
            )
    except IOError:
        logging.warning("Could not find {}".format(value))
        return DEFAULT_ENCODING
