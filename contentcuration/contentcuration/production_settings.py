import settings as base_settings

from contentcuration.utils.secretmanagement import get_secret

MEDIA_ROOT = base_settings.STORAGE_ROOT

SITE_ID = int(get_secret("SITE_ID") or "1")

DEFAULT_FILE_STORAGE = 'contentcuration.utils.gcs_storage.GoogleCloudStorage'
SESSION_ENGINE = "django.contrib.sessions.backends.db"

# email settings
EMAIL_BACKEND = 'postmark.django_backend.EmailBackend'
POSTMARK_API_KEY = get_secret("EMAIL_CREDENTIALS_POSTMARK_API_KEY")

LANGUAGE_CODE = get_secret("LANGUAGE_CODE") or "en"

# Google drive settings
GOOGLE_STORAGE_REQUEST_SHEET = "1uC1nsJPx_5g6pQT6ay0qciUVya0zUFJ8wIwbsTEh60Y"
GOOGLE_AUTH_JSON = get_secret("GOOGLE_DRIVE_AUTH_JSON") or base_settings.GOOGLE_AUTH_JSON

key = (get_secret("SENTRY_DSN_KEY")
       .strip())                # strip any possible trailing newline
release_commit = get_secret("RELEASE_COMMIT_SHA")
if key and release_commit:
    RAVEN_CONFIG = {
        'dsn': 'https://{secret}@sentry.io/1252819'.format(secret=key),
        # If you are using git, you can also automatically configure the
        # release based on the git info.
        'release': release_commit,
        'environment': get_secret("BRANCH_ENVIRONMENT"),
    }
