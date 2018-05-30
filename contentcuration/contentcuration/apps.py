from django.apps import AppConfig

from contentcuration.utils.minio_utils import ensure_bucket_exists


class ContentConfig(AppConfig):
    name = 'contentcuration'

    def ready(self):
        ensure_bucket_exists()
