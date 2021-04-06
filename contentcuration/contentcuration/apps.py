from django.apps import AppConfig
from django.conf import settings

from contentcuration.utils.minio_utils import ensure_storage_bucket_public


class ContentConfig(AppConfig):
    name = 'contentcuration'

    def ready(self):
        # see note in the celery_signals.py file for why we import here.
        import contentcuration.utils.celery.signals  # noqa
        if settings.AWS_AUTO_CREATE_BUCKET:
            ensure_storage_bucket_public()
