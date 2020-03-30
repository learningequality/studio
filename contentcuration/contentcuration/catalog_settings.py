# flake8: noqa
from .settings import *  # noqa

LIBRARY_MODE = True
SITE_READ_ONLY = True
CACHES['default']['BACKEND'] = 'django.core.cache.backends.locmem.LocMemCache'
CACHES['default']['LOCATION'] = 'readonly_cache'


MIDDLEWARE += (
    'django.middleware.cache.UpdateCacheMiddleware',
    'contentcuration.middleware.db_readonly.DatabaseReadOnlyMiddleware',
    'django.middleware.cache.FetchFromCacheMiddleware',
)
