from django.apps import AppConfig
from django.conf import settings

from contentcuration.utils.storage_common import is_gcs_backend


class ContentConfig(AppConfig):
    name = 'contentcuration'

    def ready(self):
        # see note in the celery_signals.py file for why we import here.
        import contentcuration.utils.celery.signals  # noqa

        if settings.AWS_AUTO_CREATE_BUCKET and not is_gcs_backend():
            from contentcuration.utils.minio_utils import ensure_storage_bucket_public
            ensure_storage_bucket_public()

        self._patch_django_cte_qjoin()

    def _patch_django_cte_qjoin(self):
        """
        TODO Remove after the following prs/issues are resolved:
        https://github.com/learningequality/studio/pull/3442
        https://github.com/dimagi/django-cte/pull/60

        @see fix: https://github.com/dimagi/django-cte/pull/50/files
        """
        from django_cte.join import QJoin

        class join_field:
            class related_model:
                class _meta:
                    local_concrete_fields = ()

        QJoin.join_field = join_field
