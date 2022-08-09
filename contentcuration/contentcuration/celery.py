import os

from django.conf import settings

from contentcuration.utils.celery.app import CeleryApp

# set the default Django settings module for the 'celery' program.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "contentcuration.settings")

app = CeleryApp("contentcuration")
app.config_from_object(settings.CELERY)
