# flake8: noqa
from .not_production_settings import *  # noqa

DEBUG = True

LANGUAGES += (("ar", ugettext("Arabic")),)  # noqa

ROOT_URLCONF = "contentcuration.dev_urls"

INSTALLED_APPS += ("drf_yasg",)
