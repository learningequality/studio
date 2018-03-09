import os
from .settings import *

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

# celery settings
BROKER_URL = os.getenv("CELERY_BROKER_URL") or BROKER_URL
BROKER_URL = "redis://{ip}:6379".format(ip=os.getenv("DATA_REDIS_HOST"))
CELERY_RESULT_BACKEND = ("redis://{ip}:6379".format(ip=os.getenv("DATA_REDIS_HOST"))
                         or CELERY_RESULT_BACKEND)
CELERY_TIMEZONE = os.getenv("CELERY_TIMEZONE") or CELERY_TIMEZONE

# email settings
EMAIL_BACKEND = "postmark.backends.PostmarkBackend"
POSTMARK_API_KEY = os.getenv("EMAIL_CREDENTIALS_POSTMARK_API_KEY")

LANGUAGE_CODE = os.getenv("LANGUAGE_CODE") or "en"
