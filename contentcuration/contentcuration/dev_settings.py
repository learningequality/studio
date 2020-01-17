# flake8: noqa
from .test_settings import *  # noqa

# These endpoints will throw an error on the django debug panel
EXCLUDED_DEBUG_URLS = [
    "/content/storage",
]


LANGUAGES += (('ar', ugettext('Arabic')),)  # noqa

AWS_AUTO_CREATE_BUCKET = True
