import logging

from .settings import *  # noqa

DEBUG = True

if RUNNING_TESTS:
    # if we're running tests, run Celery tests synchronously so tests won't complete before the process
    # is finished.
    CELERY_TASK_ALWAYS_EAGER = True

ALLOWED_HOSTS = ["studio.local", "192.168.31.9", "127.0.0.1", "*"]

ACCOUNT_ACTIVATION_DAYS = 7
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
SITE_ID = 2
logging.basicConfig(level='INFO')

# Allow the debug() context processor to add variables to template context.
# Include here the IPs from which a local dev server might be accessed. See
# https://docs.djangoproject.com/en/2.0/ref/settings/#internal-ips
INTERNAL_IPS = (
    '127.0.0.1',
    'studio.local',
    '192.168.31.9',
)
