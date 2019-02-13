from __future__ import absolute_import
from __future__ import unicode_literals

import logging
from uuid import uuid4

from celery.decorators import task
from celery.utils.log import get_task_logger
from django.conf import settings
from django.core.mail import EmailMessage
from django.core.management import call_command
from django.template.loader import render_to_string

from contentcuration.celery import app
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import Task
from contentcuration.models import User
from contentcuration.utils.csv_writer import write_channel_csv_file
from contentcuration.utils.csv_writer import write_user_csv

logger = get_task_logger(__name__)

# TODO: Try to get debugger working for celery workers
# Attach Python Cloud Debugger
# try:
#     import googleclouddebugger

#     if os.getenv("RUN_CLOUD_DEBUGGER"):
#         googleclouddebugger.AttachDebugger(
#             version=os.getenv("GCLOUD_DEBUGGER_APP_IDENTIFIER"),
#             project_id=os.getenv('GOOGLE_CLOUD_PROJECT'),
#             project_number=os.getenv('GOOGLE_CLOUD_PROJECT_NUMBER'),
#             enable_service_account_auth=True,
#             service_account_json_file=os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
#         )
# except ImportError, RuntimeError:
#     pass

# runs the management command 'exportchannel' async through celery


# Tasks with 'test' in their name are written specifically to test the Async Task API
@app.task(bind=True, name='test_task')
def test_task(self):
    """
    This is a mock task to be used ONLY for unit-testing various pieces of the
    async task API.
    :return: The number 42
    """
    logger.info("Request ID = {}".format(self.request.id))
    assert Task.objects.filter(task_id=self.request.id).count() == 1
    return 42


@app.task(name='error_test_task')
def error_test_task():
    """
    This is a mock task designed to test that we properly report errors to the client.
    """
    raise Exception("I'm sorry Dave, I'm afraid I can't do that.")


@app.task(bind=True, name='progress_test_task')
def progress_test_task(self):
    """
    This is a mock task to be used to test that we can update progress when tracking is enabled.
    :return:
    """
    logger.info("Request ID = {}".format(self.request.id))
    assert Task.objects.filter(task_id=self.request.id).count() == 1

    self.update_state('PROGRESS', meta={'progress': 100})
    return 42


@app.task(name='non_async_test_task')
def non_async_test_task():
    """
    This is a mock task used to test that creating a task without using create_async_task does not result
    in a Task object being created or updated.
    """
    return 42


@task(name='exportchannel_task')
def exportchannel_task(channel_id, user_id, task_type, is_progress_tracking, metadata):
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


@task(name='generateusercsv_task')
def generateusercsv_task(email):
    user = User.objects.get(email=email)
    csv_path = write_user_csv(user)
    subject = render_to_string('export/user_csv_email_subject.txt', {})
    message = render_to_string('export/user_csv_email.txt', {
        'legal_email': settings.POLICY_EMAIL,
        'user': user,
        'edit_channels': user.editable_channels.values('name', 'id'),
        'view_channels': user.view_only_channels.values('name', 'id'),
    })

    email = EmailMessage(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email])

    email.attach_file(csv_path)

    email.send()


@task(name='deletetree_task')
def deletetree_task(tree_id):
    ContentNode.objects.filter(tree_id=tree_id).delete()


type_mapping = {
    'test': {'task': test_task, 'progress_tracking': False},
    'error-test': {'task': error_test_task, 'progress_tracking': False},
    'progress-test': {'task': progress_test_task, 'progress_tracking': True},
}


def create_async_task(task_name, task_options, task_args=None):
    # We use the existence of the task_type kwarg to know if it's an async task.
    if not task_name in type_mapping:
        raise KeyError("Need to define task in type_mapping first.")
        return
    metadata = {}
    if 'metadata' in task_options:
        metadata = task_options["metadata"]
    user = None
    if 'user' in task_options:
        user = task_options['user']
    elif 'user_id' in task_options:
        user_id = task_options["user_id"]
        user = User.objects.get(id=user_id)
    if user is None:
        raise KeyError("All tasks must be assigned to a user.")

    task_info = type_mapping[task_name]
    async_task = task_info['task']
    is_progress_tracking = task_info['progress_tracking']

    task_info = Task.objects.create(
        task_type=task_name,
        status='QUEUED',
        is_progress_tracking=is_progress_tracking,
        user=user,
        metadata=metadata,
    )

    task = async_task.apply_async(kwargs=task_args, task_id=str(task_info.task_id))
    logging.info("Created task ID = {}".format(task.id))

    return task, task_info
