# Settings  used by containers running collectstatic. Scope our services
# to the only ones needed to run collectstatic.

from .settings import *

CACHES['default']['BACKEND'] = "django_prometheus.cache.backends.locmem.LocMemCache"

DATABASES["default"]["ENGINE"] = "django.db.backends.postgresql_psycopg2"

# Remove django_prometeheus from INSTALLED_APPS
INSTALLED_APPS = tuple(app for app in INSTALLED_APPS if app != "django_prometheus")
