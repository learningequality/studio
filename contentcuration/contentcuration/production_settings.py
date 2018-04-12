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
        'ENGINE':
        'django.db.backends.postgresql_psycopg2',
        'NAME': os.getenv("DB_CREDENTIALS_DBNAME"),
        'USER': os.getenv("DB_CREDENTIALS_USER"),
        'PASSWORD': os.getenv("DB_CREDENTIALS_PASSWORD"),
        'HOST': os.getenv("DB_CREDENTIALS_HOST"),
        'PORT': int(os.getenv("DB_CREDENTIALS_PORT")),
        'CONN_MAX_AGE': 600,
    },
    'export_staging': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'export_staging.sqlite3')
    }
}

# celery settings
BROKER_URL = "redis://:{password}@{endpoint}:/{db}".format(
    password=os.getenv("CELERY_REDIS_PASSWORD"),
    endpoint=os.getenv("CELERY_BROKER_ENDPOINT"),
    db=os.getenv("CELERY_REDIS_DB")
) or BROKER_URL
CELERY_RESULT_BACKEND = "redis://:{password}@{endpoint}:/{db}".format(
    password=os.getenv("CELERY_REDIS_PASSWORD"),
    endpoint=os.getenv("CELERY_RESULT_BACKEND_ENDPOINT"),
    db=os.getenv("CELERY_REDIS_DB")
) or CELERY_RESULT_BACKEND
CELERY_TIMEZONE = os.getenv("CELERY_TIMEZONE") or CELERY_TIMEZONE

# email settings
# EMAIL_BACKEND = "postmark.backends.PostmarkBackend"
EMAIL_BACKEND = 'postmark.django_backend.EmailBackend'
POSTMARK_API_KEY = os.getenv("EMAIL_CREDENTIALS_POSTMARK_API_KEY")

LANGUAGE_CODE = os.getenv("LANGUAGE_CODE") or "en"
