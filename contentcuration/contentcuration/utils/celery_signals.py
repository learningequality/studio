import os
import traceback

from celery.signals import after_task_publish
from celery.signals import task_failure
from celery.signals import task_success
from celery.utils.log import get_task_logger
from django.core.exceptions import ObjectDoesNotExist

from contentcuration.models import Task

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

    try:
        task = Task.objects.get(task_id=task_id)
        task.status = "PENDING"
        task.save()
        logger.info("Task object {} updated with status PENDING.".format(task_id))
    except ObjectDoesNotExist:
        # If the object doesn't exist, that likely means the task was created outside of create_async_task
        pass


@task_failure.connect
def on_failure(sender, **kwargs):
    try:
        task = Task.objects.get(task_id=sender.request.id)
        task.status = "FAILURE"
        task_args = []
        task_kwargs = []

        # arg values may be objects, so we need to ensure they are string representation for JSON serialization.
        for arg in kwargs['args']:
            task_args.append(str(arg))
        for kwarg in kwargs['kwargs']:
            task_kwargs.append(str(kwarg))

        exception_data = {
            'task_args': task_args,
            'task_kwargs': task_kwargs,
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
        task.status = "SUCCESS"
        task.metadata['result'] = result
        # We're finished, so go ahead and record 100% progress so that getters expecting it get a value
        # even though there is no longer a Celery task to query.
        if task.is_progress_tracking:
            task.metadata['progress'] = 100
        task.save()
        logger.info("Task with ID {} succeeded".format(task_id))
    except ObjectDoesNotExist:
        pass  # If the object doesn't exist, that likely means the task was created outside of create_async_task
