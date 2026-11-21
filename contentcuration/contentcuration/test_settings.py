import os

from .not_production_settings import *  # noqa

DEBUG = True

WEBPACK_LOADER["DEFAULT"][  # noqa
    "LOADER_CLASS"
] = "contentcuration.tests.webpack_loader.TestWebpackLoader"

TEST_ENV = True
RUNNING_TESTS = True

INSTALLED_APPS += ("django_concurrent_tests",)  # noqa F405

MANAGE_PY_PATH = "./contentcuration/manage.py"

os.environ["STORAGE_EMULATOR_HOST"] = (
    os.environ.get("STORAGE_EMULATOR_HOST") or "http://localhost:4443"
)
os.environ.setdefault("GOOGLE_CLOUD_PROJECT", "studio-emulator")
GCS_EMULATOR_HOST = os.environ["STORAGE_EMULATOR_HOST"]
GCS_ENDPOINT_URL = GCS_EMULATOR_HOST
GCS_BUCKET_NAME = "content"
GCS_STORAGE_SERVICE_ACCOUNT_KEY_PATH = None
