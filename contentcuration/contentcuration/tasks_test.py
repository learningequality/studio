from __future__ import absolute_import

from celery.utils.log import get_task_logger
from django.conf import settings
from django.db import connection
from django.db.utils import OperationalError

from contentcuration.celery import app
from contentcuration.models import Task

logger = get_task_logger(__name__)


# Tasks with 'test' in their name are written specifically to test the Async Task API
@app.task(bind=True, name="test_task")
def test_task(self, **kwargs):
    """
    This is a mock task to be used ONLY for unit-testing various pieces of the
    async task API.
    :return: The number 42
    """
    logger.info("Request ID = {}".format(self.request.id))
    assert Task.objects.filter(task_id=self.request.id).count() == 1
    return 42


@app.task(name="error_test_task")
def error_test_task(**kwargs):
    """
    This is a mock task designed to test that we properly report errors to the client.
    """
    raise Exception("I'm sorry Dave, I'm afraid I can't do that.")


@app.task(bind=True, name="progress_test_task")
def progress_test_task(self, **kwargs):
    """
    This is a mock task to be used to test that we can update progress when tracking is enabled.
    :return:
    """
    logger.info("Request ID = {}".format(self.request.id))
    assert Task.objects.filter(task_id=self.request.id).count() == 1

    self.update_state(state="PROGRESS", meta={"progress": 100})
    return 42


@app.task(name="non_async_test_task")
def non_async_test_task(**kwargs):
    """
    This is a mock task used to test that creating a task without using create_async_task does not result
    in a Task object being created or updated.
    """
    return 42


def close_db_connection():
    cursor = connection.cursor()
    try:
        cursor.execute("select pg_terminate_backend(pid) from pg_stat_activity where datname='{}';".format(settings.DATABASES["default"]["NAME"]))
    except OperationalError:
        pass


@app.task(name="drop_db_connections_success")
def drop_db_connections_success(**kwargs):
    """
    This is a mock task used to simulate connections being dropped during a task
    """
    close_db_connection()


@app.task(name="drop_db_connections_fail")
def drop_db_connections_fail(**kwargs):
    """
    This is a mock task used to simulate connections being dropped during a task
    """
    close_db_connection()
    raise Exception()


@app.task(name="query_db_task")
def query_db_task(**kwargs):
    """
    This is a mock task used to simulate connections being dropped during a task
    """
    list(Task.objects.all())
