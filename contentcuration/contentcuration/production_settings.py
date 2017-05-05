import os
from .settings import *

STORAGE_ROOT = "/contentworkshop_content/storage/"
DB_ROOT = "/contentworkshop_content/databases/"
STATIC_ROOT = "/contentworkshop_static/"

MEDIA_ROOT = STORAGE_ROOT

SITE_ID = int(os.getenv("SITE_ID"))

SESSION_ENGINE = "django.contrib.sessions.backends.db"

if os.getenv("USE_DATADOG"):
    INSTALLED_APPS = (
        "ddtrace.contrib.django",
    ) + INSTALLED_APPS

    MIDDLEWARE_CLASSES = (
        'ddtrace.contrib.django.TraceMiddleware',
    ) + MIDDLEWARE_CLASSES

    DATADOG_TRACE = {
        'DEFAULT_SERVICE': 'contentworkshop',
        'AGENT_PORT': int(os.getenv("DATADOG_STATSD_PORT") or 8126),
        'AGENT_HOSTNAME': os.getenv("DATADOG_STATSD_HOSTNAME"),
        'TAGS': {'env': 'production'},
    }

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

# email settings
EMAIL_BACKEND = "postmark.backends.PostmarkBackend"
POSTMARK_API_KEY = os.getenv("EMAIL_CREDENTIALS_POSTMARK_API_KEY")
