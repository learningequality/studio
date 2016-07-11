from .settings import *

import logging

DEBUG = True
ALLOWED_HOSTS = []

ACCOUNT_ACTIVATION_DAYS=7
DEFAULT_FROM_EMAIL = 'testing@example.com'
EMAIL_BACKEND = 'email_extras.backends.BrowsableEmailBackend'
SITE_ID =3
logging.basicConfig(level='DEBUG')