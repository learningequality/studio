from .settings import *

import logging

DEBUG = True
ALLOWED_HOSTS = []

ACCOUNT_ACTIVATION_DAYS=7
DEFAULT_FROM_EMAIL = 'testing@example.com'
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

logging.basicConfig(level='DEBUG')