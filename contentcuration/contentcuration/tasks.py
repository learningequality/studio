from __future__ import absolute_import
from __future__ import unicode_literals

import logging
import time
from builtins import str

from celery import states
from celery.utils.log import get_task_logger
from django.conf import settings
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from django.utils.translation import gettext as _
from django.utils.translation import override

from contentcuration.celery import app
from contentcuration.models import Change
from contentcuration.models import ContentNode
from contentcuration.models import Task
from contentcuration.models import User
from contentcuration.utils.csv_writer import write_user_csv
from contentcuration.utils.nodes import calculate_resource_size
from contentcuration.utils.nodes import generate_diff
from contentcuration.viewsets.user import AdminUserFilter


logger = get_task_logger(__name__)


# if we're running tests, import our test tasks as well
if settings.RUNNING_TESTS:
    from .tasks_test import caught_error_test_task, error_test_task, progress_test_task, test_task


STATE_QUEUED = "QUEUED"


@app.task(name="apply_user_changes")
def apply_user_changes(user_id):
    from contentcuration.viewsets.sync.base import apply_changes
    changes_qs = Change.objects.filter(applied=False, errored=False, user_id=user_id, channel__isnull=True)
    apply_changes(changes_qs)
    if changes_qs.exists():
        user = User.objects.filter(id=user_id).first()
        if user:
            create_async_task("apply_user_changes", user, user_id=user_id)


@app.task(name="apply_channel_changes")
def apply_channel_changes(channel_id):
    from contentcuration.viewsets.sync.base import apply_changes
    changes_qs = Change.objects.filter(applied=False, errored=False, channel_id=channel_id)
    apply_changes(changes_qs)
    if changes_qs.exists():
        user = User.objects.filter(editable_channels=channel_id).first()
        if user:
            create_async_task("apply_channel_changes", user, channel_id=channel_id)


class CustomEmailMessage(EmailMessage):
    """
        jayoshih: There's an issue with the django postmark backend where
        _build_message attempts to attach files as base64. However,
        the django EmailMessage attach method makes all content with a text/*
        mimetype to be encoded as a string, causing `base64.b64encode(content)`
        to fail. This is a workaround to ensure that content is still encoded as
        bytes when it comes to encoding the attachment as base64
    """
    def attach(self, filename=None, content=None, mimetype=None):
        if filename is None:
            raise AssertionError
        if content is None:
            raise AssertionError
        if mimetype is None:
            raise AssertionError
        self.attachments.append((filename, content, mimetype))


@app.task(name="generateusercsv_task")
def generateusercsv_task(user_id, language=settings.LANGUAGE_CODE):
    with override(language):
        user = User.objects.get(pk=user_id)
        csv_path = write_user_csv(user)
        subject = render_to_string("export/user_csv_email_subject.txt", {})
        message = render_to_string(
            "export/user_csv_email.txt",
            {
                "legal_email": settings.POLICY_EMAIL,
                "user": user,
                "edit_channels": user.editable_channels.values("name", "id"),
                "view_channels": user.view_only_channels.values("name", "id"),
            },
        )

        email = CustomEmailMessage(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email])
        email.encoding = 'utf-8'
        email.attach_file(csv_path, mimetype="text/csv")

        email.send()


@app.task(name="deletetree_task")
def deletetree_task(tree_id):
    ContentNode.objects.filter(tree_id=tree_id).delete()


@app.task(name="getnodedetails_task")
def getnodedetails_task(node_id):
    node = ContentNode.objects.get(pk=node_id)
    return node.get_details()


@app.task(name="generatenodediff_task")
def generatenodediff_task(updated_id, original_id):
    return generate_diff(updated_id, original_id)


@app.task(name="calculate_user_storage_task")
def calculate_user_storage_task(user_id):
    try:
        user = User.objects.get(pk=user_id)
        user.set_space_used()
    except User.DoesNotExist:
        logging.error("Tried to calculate user storage for user with id {} but they do not exist".format(user_id))


@app.task(name="calculate_resource_size_task")
def calculate_resource_size_task(node_id, channel_id):
    node = ContentNode.objects.get(pk=node_id)
    size, _ = calculate_resource_size(node=node, force=True)
    return size


@app.task(name="sendcustomemails_task")
def sendcustomemails_task(subject, message, query):
    subject = render_to_string('registration/custom_email_subject.txt', {'subject': subject})
    recipients = AdminUserFilter(data=query).qs.distinct()

    for recipient in recipients:
        text = message.format(current_date=time.strftime("%A, %B %d"), current_time=time.strftime("%H:%M %Z"), **recipient.__dict__)
        text = render_to_string('registration/custom_email.txt', {'message': text})
        recipient.email_user(subject, text, settings.DEFAULT_FROM_EMAIL, )


type_mapping = {
    "apply_user_changes": apply_user_changes,
    "apply_channel_changes": apply_channel_changes,
    "get-node-diff": generatenodediff_task,
    "calculate-user-storage": calculate_user_storage_task,
    "calculate-resource-size": calculate_resource_size_task,
}

if settings.RUNNING_TESTS:
    type_mapping.update(
        {
            "test": test_task,
            "error-test": error_test_task,
            "caught-error-test": caught_error_test_task,
            "progress-test": progress_test_task,
        }
    )


def get_or_create_async_task(task_name, user, **task_args):
    """
    :param task_name: Name of the task function (omitting the word 'task', and with dashes in place of underscores)
    :param user: User object of the user performing the operation
    :param task_args: A dictionary of keyword arguments to be passed down to the task, must be JSON serializable.
    :return: Returns the Task model object
    """
    if task_name not in type_mapping:
        raise KeyError("Need to define task in type_mapping first.")

    if user is None or not isinstance(user, User):
        raise TypeError("All tasks must be assigned to a user.")

    qs = Task.find_incomplete(task_name, channel_id=task_args.get("channel_id"), metadata={"args": task_args})

    try:
        task_info = qs[0]
    except IndexError:
        task_info = None

    if task_info is None:
        _, task_info = create_async_task(task_name, user, **task_args)

    return task_info


def create_async_task(task_name, user, **task_args):
    """
    Starts a long-running task that runs asynchronously using Celery. Also creates a Task object that can be used by
    Studio to keep track of the Celery task's status and progress.

    This function should only be used to start Celery tasks that are user-facing, that is, that Studio users are
    aware of and want information on. DB maintenance tasks and other similar operations should simply start a
    Celery task manually.

    The task name must be registered in the type_mapping dictionary before this function can be used to initiate
    the task.

    :param task_name: Name of the task function (omitting the word 'task', and with dashes in place of underscores)
    :param user: User object of the user performing the operation
    :param task_args: A dictionary of keyword arguments to be passed down to the task, must be JSON serializable.
    :return: a tuple of the Task object and a dictionary containing information about the created task.
    """
    if task_name not in type_mapping:
        raise KeyError("Need to define task in type_mapping first.")

    if user is None or not isinstance(user, User):
        raise TypeError("All tasks must be assigned to a user.")

    async_task = type_mapping[task_name]
    task_info = Task.objects.create(
        task_type=task_name,
        status=STATE_QUEUED,
        user=user,
        channel_id=task_args.get("channel_id"),
        metadata={"args": task_args},
    )
    task_sig = async_task.signature(
        task_id=str(task_info.task_id),
        kwargs=task_args,
    )
    if not settings.RUNNING_TESTS:
        task = task_sig.apply_async()
    else:
        task = task_sig.apply()

    # If there was a failure to create the task, the apply_async call will return failed, but
    # checking the status will still show PENDING. So make sure we write the failure to the
    # db directly so the frontend can know of the failure.
    if task.status == states.FAILURE:
        # Error information may have gotten added to the Task object during the call.
        task_info.refresh_from_db()
        logging.error("Task failed to start, please check Celery status.")
        task_info.status = states.FAILURE
        error_data = {
            "message": _("Unknown error starting task. Please contact support.")
        }
        # The Celery on_failure handler may also add a traceback, so make sure
        # we only create a new error object if one doesn't already exist.
        if "error" not in task_info.metadata:
            task_info.metadata["error"] = {}
        task_info.metadata["error"].update(error_data)
        task_info.save()

    return task, task_info
