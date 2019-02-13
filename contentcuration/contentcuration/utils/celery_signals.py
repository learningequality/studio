import ast
import logging
import os
import traceback

from celery.signals import after_task_publish, task_failure, task_success
from celery.utils.log import get_task_logger
from django.core.exceptions import ObjectDoesNotExist

from contentcuration.models import Task, User

# because Celery connects signals upon import, we don't want to put signals into other modules that may be
# imported multiple times. Instead, we follow the advice here and use AppConfig.init to import the module:
# https://stackoverflow.com/questions/7115097/the-right-place-to-keep-my-signals-py-file-in-a-django-project/21612050#21612050

logger = get_task_logger(__name__)


@after_task_publish.connect
def before_start(sender, headers, body, **kwargs):
    """
    Create a Task object before the task actually started,
    set the task object status to be PENDING, with the signal
    after_task_publish to indicate that the task has been
    sent to the broker.
    """
    task_id = headers["id"]
    options = ast.literal_eval(headers["kwargsrepr"])
    # We use the existence of the task_type kwarg to know if it's an async task.
    if not "task_type" in options:
        return

    Task.objects.filter(task_id=task_id).update(status="PENDING")
    logger.info("Task object {} updated with status PENDING.".format(task_id))


@task_failure.connect
def on_failure(sender, **kwargs):
    try:
        task = Task.objects.get(task_id=sender.request.id)
        task.status = "FAILURE"
        exception_data = {
            'task_args': kwargs['args'],
            'task_kwargs': kwargs['kwargs'],
            'traceback': traceback.format_tb(kwargs['traceback'])
        }
        task.metadata['error'] = exception_data
        task.save()
    except ObjectDoesNotExist:
        pass  # If the object doesn't exist, that likely means the task was created outside of create_async_task


@task_success.connect
def on_success(sender, result, **kwargs):
    try:
        logger.info("on_success called, process is {}".format(os.getpid()))
        task_id = sender.request.id
        task = Task.objects.get(task_id=task_id)
        task.status="SUCCESS"
        task.metadata['result'] = result
        task.save()
        logger.info("Task with ID {} succeeded".format(task_id))
    except ObjectDoesNotExist:
        pass  # If the object doesn't exist, that likely means the task was created outside of create_async_task
