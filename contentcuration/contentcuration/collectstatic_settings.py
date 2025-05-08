# Settings  used by containers running collectstatic. Scope our services
# to the only ones needed to run collectstatic.
# flake8: noqa
from .settings import *

CACHES["default"]["BACKEND"] = "django_prometheus.cache.backends.locmem.LocMemCache"
