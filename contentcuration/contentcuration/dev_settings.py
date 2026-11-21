import os

from .not_production_settings import *  # noqa

# flake8: noqa

DEBUG = True

ROOT_URLCONF = "contentcuration.dev_urls"

INSTALLED_APPS += ("drf_yasg",)

if os.environ.get("STUDIO_GCS_EMULATOR") != "0":
    os.environ.setdefault("STORAGE_EMULATOR_HOST", "http://localhost:4443")
    os.environ.setdefault("GOOGLE_CLOUD_PROJECT", "studio-emulator")
    AWS_S3_ENDPOINT_URL = os.environ["STORAGE_EMULATOR_HOST"]
    AWS_S3_BUCKET_NAME = "content"
    GCS_STORAGE_SERVICE_ACCOUNT_KEY_PATH = None
else:
    os.environ.pop("STORAGE_EMULATOR_HOST", None)
    AWS_S3_ENDPOINT_URL = (
        os.getenv("AWS_S3_ENDPOINT_URL") or "https://storage.googleapis.com"
    )
