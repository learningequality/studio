# Settings used by migrations. This removes the need for Redis during migration jobs
from .production_settings import *

CACHES['default']['BACKEND'] = "django_prometheus.cache.backends.locmem.LocMemCache"

# Remove the need for GCS as well
DEFAULT_FILE_STORAGE = 'django_s3_storage.storage.S3Storage'
