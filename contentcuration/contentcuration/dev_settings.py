# flake8: noqa
from .not_production_settings import *  # noqa

DEBUG = True

LANGUAGES += (("ar", ugettext("Arabic")),)  # noqa

AWS_AUTO_CREATE_BUCKET = True
