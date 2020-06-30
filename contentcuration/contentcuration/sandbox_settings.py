# flake8: noqa
from .not_production_settings import *  # noqa

DEBUG = True

DEFAULT_FILE_STORAGE = "contentcuration.utils.gcs_storage.GoogleCloudStorage"

LANGUAGES += (("ar", ugettext("Arabic")),)  # noqa

AWS_AUTO_CREATE_BUCKET = True
