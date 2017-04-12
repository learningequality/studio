import os
from .settings import *


SITE_ID = 3

STORAGE_ROOT = "/contentworkshop_content/storage/"
DB_ROOT = "/contentworkshop_content/databases/"
STATIC_ROOT = "/contentworkshop_static/"

MEDIA_ROOT = STORAGE_ROOT

SITE_ID = 3

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
    },
    'export_staging': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'export_staging.sqlite3')
    }
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': '/tmp/django.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}

# email settings
EMAIL_BACKEND = "postmark.backends.PostmarkBackend"
POSTMARK_API_KEY = os.getenv("EMAIL_CREDENTIALS_POSTMARK_API_KEY")
