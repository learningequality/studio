import os

from .not_production_settings import *  # noqa

# flake8: noqa

DEBUG = True

ROOT_URLCONF = "contentcuration.dev_urls"

INSTALLED_APPS += ("drf_yasg",)

if os.environ.get("STUDIO_GCS_EMULATOR") != "0":
    os.environ["STORAGE_EMULATOR_HOST"] = (
        os.environ.get("STORAGE_EMULATOR_HOST") or "http://localhost:4443"
    )
    os.environ.setdefault("GOOGLE_CLOUD_PROJECT", "studio-emulator")
    GCS_EMULATOR_HOST = os.environ["STORAGE_EMULATOR_HOST"]
    GCS_ENDPOINT_URL = GCS_EMULATOR_HOST
    GCS_BUCKET_NAME = "content"
    GCS_STORAGE_SERVICE_ACCOUNT_KEY_PATH = None
else:
    os.environ.pop("STORAGE_EMULATOR_HOST", None)
    GCS_EMULATOR_HOST = None
    GCS_ENDPOINT_URL = (
        os.getenv("AWS_S3_ENDPOINT_URL") or "https://storage.googleapis.com"
    )
