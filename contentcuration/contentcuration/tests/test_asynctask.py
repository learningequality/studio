from __future__ import absolute_import

import threading
import uuid

from celery import states
from celery.result import allow_join_result
from celery.utils.log import get_task_logger
from django.core.management import call_command
from django.test import TransactionTestCase

from . import testdata
from .helpers import clear_tasks
from contentcuration.celery import app
from contentcuration.models import TaskResult


logger = get_task_logger(__name__)


class TestException(Exception):
    pass


# Tasks with 'test' in their name are written specifically to test the Async Task API
@app.task(bind=True, name="test_task")
def test_task(self, **kwargs):
    """
    This is a mock task to be used ONLY for unit-testing various pieces of the
    async task API.
    :return: The number 42
    """
    logger.info("Request ID = {}".format(self.request.id))
    assert TaskResult.objects.filter(task_id=self.request.id).count() == 1
    return 42


@app.task(name="error_test_task")
def error_test_task(**kwargs):
    """
    This is a mock task designed to test that we properly report errors to the client.
    """
    raise TestException("I'm sorry Dave, I'm afraid I can't do that.")


@app.task(bind=True, name="caught_error_test_task")
def caught_error_test_task(self, **kwargs):
    """
    This is a mock task designed to test that we properly report errors to the client.
    """
    try:
        raise TestException("I'm sorry Dave, I'm afraid I can't do that.")
    except TestException as e:
        self.report_exception(e)


@app.task(name="non_async_test_task")
def plain_test_task(**kwargs):
    """
    This is a mock task used to test that creating a task without using create_async_task does not result
    in a Task object being created or updated.
    """
    return 42


@app.task(bind=True, name="requeue_test_task")
def requeue_test_task(self, **kwargs):
    """
    This is a mock task used to test re-queueing functionality from within a task
    """
    task_id = None
    if "ran" not in kwargs:
        task_id = self.requeue(ran=True).task_id
    # assert that kwargs are retained
    assert kwargs["requeue"] is True
    return task_id


def _celery_task_worker():
    # clear the "fixups" which would mess up the connection to the DB
    app.fixups = []
    app._fixups = []
    app.worker_main(argv=[
        "worker",
        "--task-events",
        "--concurrency", "1",
    ])


def _celery_progress_monitor(thread_event):
    def _on_iteration(receiver):
        if thread_event.is_set():
            receiver.should_stop = True
    app.events.monitor_progress(on_iteration=_on_iteration)


class AsyncTaskTestCase(TransactionTestCase):
    """
    These tests verify our integration with Celery and asynchronous task handling behavior, including management
    of the TaskResult model

    This MUST use `serialized_rollback` due to DB transaction isolation interactions between the pytest framework
    and running the Celery worker in another thread
    """
    serialized_rollback = True

    @classmethod
    def setUpClass(cls):
        super(AsyncTaskTestCase, cls).setUpClass()
        # start progress monitor in separate thread
        cls.monitor_thread_event = threading.Event()
        cls.monitor_thread = threading.Thread(target=_celery_progress_monitor, args=(cls.monitor_thread_event,))
        cls.monitor_thread.start()

        # start celery worker in separate thread
        cls.worker_thread = threading.Thread(target=_celery_task_worker)
        cls.worker_thread.start()

    @classmethod
    def tearDownClass(cls):
        super(AsyncTaskTestCase, cls).tearDownClass()
        # tell the work thread to stop through the celery control API
        if cls.worker_thread:
            cls.monitor_thread_event.set()
            cls.monitor_thread.join(5)
            app.control.shutdown()
            cls.worker_thread.join(5)

    def setUp(self):
        super(AsyncTaskTestCase, self).setUp()
        call_command("loadconstants")
        self.user = testdata.user()
        clear_tasks()

    def _wait_for(self, async_result, timeout=30):
        """
        :type async_result: contentcuration.utils.celery.tasks.CeleryAsyncResult
        """
        clear_tasks(except_task_id=async_result.task_id)

        # without this context, attempting to get the result will fail because celery raises errors for the consequences
        with allow_join_result():
            return async_result.get(timeout=timeout)

    def test_asynctask_reports_success(self):
        """
        Tests that when an async task is created and completed, the Task object has a status of 'SUCCESS' and
        contains the return value of the task.
        """
        async_result = test_task.enqueue(self.user)

        result = self._wait_for(async_result)
        task_result = async_result.get_model()
        self.assertEqual(task_result.user, self.user)

        self.assertEqual(result, 42)
        task_result.refresh_from_db()
        self.assertEqual(async_result.result, 42)
        self.assertEqual(task_result.task_name, "test_task")
        self.assertEqual(async_result.status, states.SUCCESS)
        self.assertEqual(TaskResult.objects.get(task_id=async_result.id).result, "42")
        self.assertEqual(TaskResult.objects.get(task_id=async_result.id).status, states.SUCCESS)

    def test_asynctask_reports_error(self):
        """
        Tests that if a task fails with an error, that the error information is stored in the Task object for later
        retrieval and analysis.
        """
        async_result = error_test_task.enqueue(self.user)

        with self.assertRaises(TestException):
            # for some reason this task takes longer in the Github actions
            self._wait_for(async_result)

        task_result = async_result.get_model()
        self.assertEqual(task_result.status, states.FAILURE)
        self.assertIsNotNone(task_result.traceback)

        self.assertIn(
            "I'm sorry Dave, I'm afraid I can't do that.", task_result.result
        )

    def test_only_create_async_task_creates_task_entry(self):
        """
        Test that we don't add a Task entry when we create a new Celery task outside of the create_async_task API.
        """

        async_result = plain_test_task.apply()
        result = self._wait_for(async_result)
        self.assertEquals(result, 42)
        self.assertEquals(TaskResult.objects.filter(task_id=async_result.task_id).count(), 0)

    def test_enqueue_task_adds_result_with_necessary_info(self):
        async_result = test_task.enqueue(self.user, is_test=True)
        try:
            task_result = TaskResult.objects.get(task_id=async_result.task_id)
        except TaskResult.DoesNotExist:
            self.fail('Missing task result')

        self.assertEqual(task_result.task_name, test_task.name)
        _, _, encoded_kwargs = test_task.backend.encode_content(dict(is_test=True))
        self.assertEqual(task_result.task_kwargs, encoded_kwargs)

    def test_fetch_or_enqueue_task(self):
        expected_task = test_task.enqueue(self.user, is_test=True)
        async_result = test_task.fetch_or_enqueue(self.user, is_test=True)
        self.assertEqual(expected_task.task_id, async_result.task_id)

    def test_fetch_or_enqueue_task__channel_id(self):
        channel_id = uuid.uuid4()
        expected_task = test_task.enqueue(self.user, channel_id=channel_id)
        async_result = test_task.fetch_or_enqueue(self.user, channel_id=channel_id)
        self.assertEqual(expected_task.task_id, async_result.task_id)

    def test_requeue_task(self):
        existing_task_ids = requeue_test_task.find_ids()
        self.assertEqual(len(existing_task_ids), 0)

        first_async_result = requeue_test_task.enqueue(self.user, requeue=True)
        first_result = self._wait_for(first_async_result)
        self.assertIsNotNone(first_result)
        self.assertTrue(first_async_result.successful())

        second_async_result = requeue_test_task.fetch(first_result)
        # assert that the requeued task was requeued by the same user
        self.assertEqual(second_async_result.user_id, self.user.id)
        second_result = self._wait_for(second_async_result)
        self.assertIsNone(second_result)
        self.assertTrue(second_async_result.successful())
