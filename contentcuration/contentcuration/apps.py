from django.apps import AppConfig
from django.conf import settings

from contentcuration.utils.storage_common import is_gcs_backend


class ContentConfig(AppConfig):
    name = 'contentcuration'

    def ready(self):
        # Import signals
        import contentcuration.signals  # noqa

        if settings.AWS_AUTO_CREATE_BUCKET and not is_gcs_backend():
            from contentcuration.utils.minio_utils import ensure_storage_bucket_public
            ensure_storage_bucket_public()
