# flake8: noqa
from .not_production_settings import *  # noqa

DEBUG = True

ROOT_URLCONF = "contentcuration.dev_urls"

INSTALLED_APPS += ("drf_yasg",)

REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    )
}
