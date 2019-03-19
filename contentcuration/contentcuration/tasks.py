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

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import Task
from contentcuration.models import User
from contentcuration.utils.csv_writer import write_channel_csv_file
from contentcuration.utils.csv_writer import write_user_csv

logger = get_task_logger(__name__)


# if we're running tests, import our test tasks as well
if settings.RUNNING_TESTS:
    from .tasks_test import *

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


type_mapping = {}
if settings.RUNNING_TESTS:
    type_mapping.update({
        'test': {'task': test_task, 'progress_tracking': False},
        'error-test': {'task': error_test_task, 'progress_tracking': False},
        'progress-test': {'task': progress_test_task, 'progress_tracking': True}
    })


def create_async_task(task_name, task_options, task_args=None):
    """
    Starts a long-running task that runs asynchronously using Celery. Also creates a Task object that can be used by
    Studio to keep track of the Celery task's status and progress.

    This function should only be used to start Celery tasks that are user-facing, that is, that Studio users are
    aware of and want information on. DB maintenance tasks and other similar operations should simply start a
    Celery task manually.

    The task name must be registered in the type_mapping dictionary before this function can be used to initiate
    the task.

    :param task_name: Name of the task function (omitting the word 'task', and with dashes in place of underscores)
    :param task_options: A dictionary of task properties. Acceptable values are as follows:
        - Required
            - 'user' or 'user_id': User object, or string id, of the user performing the operation
        - Optional
            - 'metadata': A dictionary of properties to be used during status and progress tracking. Examples include
                a list of channels and content nodes targeted by the task, task progress ('progress' key), sub-task
                progress, when applicable.
    :param task_args: A dictionary of keyword arguments to be passed down to the task, must be JSON serializable.
    :return: a tuple of the Task object and a dictionary containing information about the created task.
    """
    if not task_name in type_mapping:
        raise KeyError("Need to define task in type_mapping first.")
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
