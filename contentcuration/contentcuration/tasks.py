from __future__ import absolute_import
from __future__ import unicode_literals

import logging

from celery.decorators import task
from celery.utils.log import get_task_logger
from django.conf import settings
from django.contrib.sites.models import Site
from django.core.mail import EmailMessage
from django.db import transaction
from django.template.loader import render_to_string
from django.utils.translation import ugettext as _

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import Task
from contentcuration.models import User
from contentcuration.serializers import ContentNodeSerializer
from contentcuration.utils.channels import export_public_channel_info
from contentcuration.utils.csv_writer import write_channel_csv_file
from contentcuration.utils.csv_writer import write_user_csv
from contentcuration.utils.nodes import duplicate_node_bulk
from contentcuration.utils.nodes import duplicate_node_inline
from contentcuration.utils.nodes import move_nodes
from contentcuration.utils.publish import publish_channel
from contentcuration.utils.sync import sync_channel
from contentcuration.utils.sync import sync_nodes


logger = get_task_logger(__name__)


# if we're running tests, import our test tasks as well
if settings.RUNNING_TESTS:
    from .tasks_test import error_test_task, progress_test_task, test_task

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


@task(bind=True, name='duplicate_nodes_task')
def duplicate_nodes_task(self, user_id, channel_id, target_parent, node_ids, sort_order=1):
    new_nodes = []
    user = User.objects.get(id=user_id)
    self.progress = 0.0
    self.root_nodes_to_copy = len(node_ids)

    self.progress += 10.0
    self.update_state(state='STARTED', meta={'progress': self.progress})

    with transaction.atomic():
        with ContentNode.objects.disable_mptt_updates():
            for node_id in node_ids:
                new_node = duplicate_node_bulk(node_id, sort_order=sort_order, parent=target_parent,
                                               channel_id=channel_id, user=user, task_object=self)
                new_nodes.append(new_node.pk)
                sort_order += 1

    return ContentNodeSerializer(ContentNode.objects.filter(pk__in=new_nodes), many=True).data


@task(bind=True, name='duplicate_node_inline_task')
def duplicate_node_inline_task(self, user_id, channel_id, node_id, target_parent):
    user = User.objects.get(id=user_id)
    duplicate_node_inline(channel_id, node_id, target_parent, user=user)


@task(bind=True, name='export_channel_task')
def export_channel_task(self, user_id, channel_id, version_notes=''):
    publish_channel(user_id, channel_id, version_notes=version_notes, send_email=True, task_object=self)


@task(bind=True, name='move_nodes_task')
def move_nodes_task(self, user_id, channel_id, target_parent, node_ids, min_order, max_order):
    move_nodes(channel_id, target_parent, node_ids, min_order, max_order, task_object=self)


@task(bind=True, name='sync_channel_task')
def sync_channel_task(self, user_id, channel_id, sync_attributes, sync_tags,
                      sync_files, sync_assessment_items, sync_sort_order):
    channel = Channel.objects.get(pk=channel_id)
    sync_channel(channel, sync_attributes, sync_tags, sync_files,
                 sync_tags, sync_sort_order, task_object=self)


@task(bind=True, name='sync_nodes_task')
def sync_nodes_task(self, user_id, channel_id, node_ids, sync_attributes, sync_tags,
                    sync_files, sync_assessment_items):
    sync_nodes(channel_id, node_ids, sync_attributes, sync_tags, sync_files,
               sync_tags, task_object=self)


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


@task(name='getnodedetails_task')
def getnodedetails_task(node_id):
    node = ContentNode.objects.get(pk=node_id)
    return node.get_details()


@task(name='exportpublicchannelsinfo_task')
def exportpublicchannelsinfo_task(user_id, export_type="pdf", site_id=1):
    user = User.objects.get(pk=user_id)
    site = Site.objects.get(id=site_id)
    export_public_channel_info(user, export_type=export_type, site=site)


type_mapping = {
    'duplicate-nodes': {'task': duplicate_nodes_task, 'progress_tracking': True},
    'duplicate-node-inline': {'task': duplicate_node_inline_task, 'progress_tracking': False},
    'export-channel': {'task': export_channel_task, 'progress_tracking': True},
    'move-nodes': {'task': move_nodes_task, 'progress_tracking': True},
    'sync-channel': {'task': sync_channel_task, 'progress_tracking': True},
    'sync-nodes': {'task': sync_nodes_task, 'progress_tracking': True},
}

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
    if task_name not in type_mapping:
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
    # If there was a failure to create the task, the apply_async call will return failed, but
    # checking the status will still show PENDING. So make sure we write the failure to the
    # db directly so the frontend can know of the failure.
    if task.status == 'FAILURE':
        # Error information may have gotten added to the Task object during the call.
        task_info.refresh_from_db()
        logging.error("Task failed to start, please check Celery status.")
        task_info.status = 'FAILURE'
        error_data = {
            'message': _('Unknown error starting task. Please contact support.')
        }
        # The Celery on_failure handler may also add a traceback, so make sure
        # we only create a new error object if one doesn't already exist.
        if 'error' not in task_info.metadata:
            task_info.metadata['error'] = {}
        task_info.metadata['error'].update(error_data)
        task_info.save()

    return task, task_info
