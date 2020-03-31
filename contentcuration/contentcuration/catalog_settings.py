# flake8: noqa
from .dev_settings import *
from .settings import *  # noqa

LIBRARY_MODE = True
SITE_READ_ONLY = True
CACHES['default']['LOCATION'] = 'readonly_cache'

MIDDLEWARE += (
    'django.middleware.cache.UpdateCacheMiddleware',
    'django.middleware.cache.FetchFromCacheMiddleware',
)
