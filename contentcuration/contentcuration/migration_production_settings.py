# Settings used by migrations. This removes the need for Redis during migration jobs
# flake8: noqa: F403, F405
from .production_settings import *

CACHES["default"]["BACKEND"] = "django_prometheus.cache.backends.locmem.LocMemCache"
