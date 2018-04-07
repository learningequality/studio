from __future__ import absolute_import, unicode_literals

from celery.decorators import task
from celery.utils.log import get_task_logger
from django.core.management import call_command
from django.template.loader import render_to_string
from django.core.mail import EmailMessage

from contentcuration.models import Channel, User
from contentcuration.utils.channel_csv import write_channel_csv_file

logger = get_task_logger(__name__)


# runs the management command 'exportchannel' async through celery
@task(name='exportchannel_task')
def exportchannel_task(channel_id, user_id):
    call_command('exportchannel', channel_id, email=True, user_id=user_id)

@task(name='generatechannelcsv_task')
def generatechannelcsv_task(channel_id, domain, user_id):
    channel = Channel.objects.get(pk=channel_id)
    user = User.objects.get(pk=user_id)
    csv_path = write_channel_csv_file(channel, site=domain)
    subject = render_to_string('export/csv_email_subject.txt', {'channel': channel})
    message = render_to_string('export/csv_email.txt', {'channel': channel, 'user': user})

    email = EmailMessage(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email])
    email.attach_file(csv_path)
    email.send()
