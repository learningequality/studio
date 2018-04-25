import os
from .settings import *

STORAGE_ROOT = "/contentworkshop_content/storage/"
DB_ROOT = "/contentworkshop_content/databases/"
STATIC_ROOT = "/contentworkshop_static/"

MEDIA_ROOT = STORAGE_ROOT

SITE_ID = int(os.getenv("SITE_ID") or "1")

SESSION_ENGINE = "django.contrib.sessions.backends.db"

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': os.environ.get('DATA_EXTERNAL_NAME') or os.environ.get('DATA_DB_NAME') or 'gonano',
        'USER': os.environ.get('DATA_EXTERNAL_USER') or os.environ.get('DATA_DB_USER') or 'learningequality',
        'PASSWORD': os.environ.get('DATA_EXTERNAL_PASS') or os.environ.get('DATA_DB_PASS') or '',
        'HOST': os.environ.get('DATA_EXTERNAL_HOST') or os.environ.get('DATA_DB_HOST') or '127.0.0.1',
        'PORT': os.environ.get('DATA_EXTERNAL_PORT') or os.environ.get('DATA_DB_PORT') or '5432',
        'CONN_MAX_AGE': 600,
    },
    'export_staging': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'export_staging.sqlite3')
    }
}

# email settings
EMAIL_BACKEND = 'postmark.django_backend.EmailBackend'
POSTMARK_API_KEY = os.getenv("EMAIL_CREDENTIALS_POSTMARK_API_KEY")

LANGUAGE_CODE = os.getenv("LANGUAGE_CODE") or "en"
