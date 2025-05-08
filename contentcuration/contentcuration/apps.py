from django.apps import AppConfig


class ContentConfig(AppConfig):
    name = "contentcuration"

    def ready(self):
        # Import signals
        import contentcuration.signals  # noqa
