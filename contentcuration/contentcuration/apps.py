import os

from contentcuration.utils.minio_utils import ensure_storage_bucket_public
from django.apps import AppConfig
from django.conf import settings


class ContentConfig(AppConfig):
    name = 'contentcuration'

    def ready(self):
        if settings.AWS_AUTO_CREATE_BUCKET:
            ensure_storage_bucket_public()
