from __future__ import absolute_import

import os

import django

from contentcuration.utils.celery.app import CeleryApp

# set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'contentcuration.settings')

app = CeleryApp('contentcuration')

# Using a string here means the worker will not have to
# pickle the object when using Windows.
app.config_from_object('django.conf:settings', namespace='CELERY')
django.setup()


@app.task(bind=True)
def debug_task(self):
    print('Request: {0!r}'.format(self.request))
