import os

from .not_production_settings import *  # noqa

DEBUG = True

WEBPACK_LOADER["DEFAULT"][  # noqa
    "LOADER_CLASS"
] = "contentcuration.tests.webpack_loader.TestWebpackLoader"

TEST_ENV = True

INSTALLED_APPS += ("django_concurrent_tests",)  # noqa F405

MANAGE_PY_PATH = "./contentcuration/manage.py"

os.environ.setdefault("STORAGE_EMULATOR_HOST", "http://localhost:4443")
os.environ.setdefault("GOOGLE_CLOUD_PROJECT", "studio-emulator")
AWS_S3_ENDPOINT_URL = os.environ["STORAGE_EMULATOR_HOST"]
AWS_S3_BUCKET_NAME = "content"
GCS_STORAGE_SERVICE_ACCOUNT_KEY_PATH = None
