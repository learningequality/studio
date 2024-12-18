import os

from django.conf import settings

from contentcuration.utils.celery.app import CeleryApp
from contentcuration.utils.celery.tasks import CeleryTask

# set the default Django settings module for the 'celery' program.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "contentcuration.settings")

# Celery update now requires that we must pass the task_cls to the CeleryApp, instead
# of setting it as an attribute on our custom Celery class
app = CeleryApp("contentcuration", task_cls=CeleryTask)
app.config_from_object(settings.CELERY)
