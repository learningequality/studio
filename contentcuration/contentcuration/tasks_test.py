from __future__ import absolute_import

from celery.utils.log import get_task_logger

from contentcuration.celery import app
from contentcuration.models import Task

logger = get_task_logger(__name__)


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

    self.update_state(state='PROGRESS', meta={'progress': 100})
    return 42


@app.task(name='non_async_test_task')
def non_async_test_task():
    """
    This is a mock task used to test that creating a task without using create_async_task does not result
    in a Task object being created or updated.
    """
    return 42
