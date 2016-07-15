from .settings import *

import logging

DEBUG = True
ALLOWED_HOSTS = []

ACCOUNT_ACTIVATION_DAYS=7
# EMAIL_BACKEND = 'email_extras.backends.BrowsableEmailBackend'
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
SITE_ID =2
logging.basicConfig(level='DEBUG')