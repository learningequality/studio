# flake8: noqa
from .test_settings import *  # noqa

DEFAULT_FILE_STORAGE = 'contentcuration.utils.gcs_storage.GoogleCloudStorage'

LANGUAGES += (('ar', ugettext('Arabic')),)  # noqa

AWS_AUTO_CREATE_BUCKET = True
