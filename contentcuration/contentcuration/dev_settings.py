from .settings import *

import logging

DEBUG = True
ALLOWED_HOSTS = []

EMAIL_HOST = 'localhost'
EMAIL_PORT = 8000
EMAIL_HOST_USER = ''
EMAIL_HOST_PASSWORD = ''
EMAIL_USE_TLS = False
DEFAULT_FROM_EMAIL = 'testing@example.com'

logging.basicConfig(level='DEBUG')