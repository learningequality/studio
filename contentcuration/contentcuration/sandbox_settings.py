# flake8: noqa
from .not_production_settings import *  # noqa

DEBUG = True

DEFAULT_FILE_STORAGE = "contentcuration.utils.storage.gcs.CompositeGCS"

LANGUAGES += (("ar", gettext("Arabic")),)  # noqa

AWS_AUTO_CREATE_BUCKET = True
