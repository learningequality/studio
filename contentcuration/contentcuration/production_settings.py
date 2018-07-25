import os
from .settings import *

MEDIA_ROOT = STORAGE_ROOT

SITE_ID = int(os.getenv("SITE_ID") or "1")

DEFAULT_FILE_STORAGE = 'contentcuration.utils.gcs_storage.GoogleCloudStorage'
SESSION_ENGINE = "django.contrib.sessions.backends.db"

# email settings
EMAIL_BACKEND = 'postmark.django_backend.EmailBackend'
POSTMARK_API_KEY = os.getenv("EMAIL_CREDENTIALS_POSTMARK_API_KEY")

LANGUAGE_CODE = os.getenv("LANGUAGE_CODE") or "en"

# Google drive settings
GOOGLE_STORAGE_REQUEST_SHEET = "1uC1nsJPx_5g6pQT6ay0qciUVya0zUFJ8wIwbsTEh60Y"
