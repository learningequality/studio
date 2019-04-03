from django.apps import AppConfig


class Celery_haystackConfig(AppConfig):
        name = 'celery_haystack'

        def ready(self):
                from celery_haystack import signals
