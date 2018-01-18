from __future__ import absolute_import, unicode_literals

from celery.decorators import task
from celery.utils.log import get_task_logger
from django.core.management import call_command

logger = get_task_logger(__name__)


# runs the management command 'exportchannel' async through celery
@task(name='exportchannel_task')
def exportchannel_task(channel_id):
    call_command('exportchannel', channel_id, email=True)
