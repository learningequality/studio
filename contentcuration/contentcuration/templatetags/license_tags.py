from django import template
from django.template.defaultfilters import stringfilter

from contentcuration.models import License
register = template.Library()

LICENSE_MAPPING = {l.license_name: l.license_url for l in License.objects.all()}

@register.filter(is_safe=True)
@stringfilter
def get_license_url(value):
    return LICENSE_MAPPING.get(value)
