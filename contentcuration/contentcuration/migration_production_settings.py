# Settings used by migrations. This removes the need for Redis during migration jobs

from .production_settings import *

CACHES['default']['BACKEND'] = "django_prometheus.cache.backends.locmem.LocMemCache"
