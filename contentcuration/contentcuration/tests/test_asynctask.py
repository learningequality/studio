from __future__ import absolute_import

import pytest
from celery import states
from django.db import connection
from django.db.utils import OperationalError
from django.test import TransactionTestCase

from .base import BaseAPITestCase
from contentcuration.models import Task
from contentcuration.tasks import create_async_task
from contentcuration.tasks import get_or_create_async_task
from contentcuration.tasks_test import close_db_connection
from contentcuration.tasks_test import drop_db_connections_fail
from contentcuration.tasks_test import drop_db_connections_success
from contentcuration.tasks_test import non_async_test_task
from contentcuration.tasks_test import query_db_task


class AsyncTaskTestCase(BaseAPITestCase):
    """
    These tests check that creating and updating Celery tasks using the create_async_task function result in
    an up-to-date Task object with the latest status and information about the task.
    """
    def test_asynctask_reports_success(self):
        """
        Tests that when an async task is created and completed, the Task object has a status of 'SUCCESS' and
        contains the return value of the task.
        """
        task, task_info = create_async_task("test", self.user)
        self.assertEqual(task_info.user, self.user)
        self.assertEqual(task_info.task_type, "test")

        result = task.get()
        self.assertEqual(result, 42)
        self.assertEqual(task.status, states.SUCCESS)
        self.assertEqual(Task.objects.get(task_id=task.id).metadata["result"], 42)
        self.assertEqual(Task.objects.get(task_id=task.id).status, states.SUCCESS)

    def test_asynctask_reports_error(self):
        """
        Tests that if a task fails with an error, that the error information is stored in the Task object for later
        retrieval and analysis.
        """
        celery_task, task_info = create_async_task("error-test", self.user)

        task_info.refresh_from_db()
        self.assertEqual(task_info.status, states.FAILURE)
        self.assertTrue("error" in task_info.metadata)

        error = task_info.metadata["error"]
        self.assertEqual(list(error.keys()), ["message", "traceback"])
        traceback_string = "\n".join(error["traceback"])
        self.assertTrue("Exception" in traceback_string)
        self.assertTrue(
            "I'm sorry Dave, I'm afraid I can't do that." in traceback_string
        )

    def test_asynctask_caught_error_reporting(self):
        """
        Tests that if a task fails with an error, that the error information is stored in the Task object for later
        retrieval and analysis.
        """
        celery_task, task_info = create_async_task("caught-error-test", self.user, apply_async=False)

        task_info.refresh_from_db()
        self.assertEqual(task_info.status, states.FAILURE)
        self.assertTrue("error" in task_info.metadata)

        error = task_info.metadata["error"]
        self.assertEqual(list(error.keys()), ["message", "traceback"])
        traceback_string = "\n".join(error["traceback"])
        self.assertTrue("Exception" in traceback_string)
        self.assertTrue(
            "I'm sorry Dave, I'm afraid I can't do that." in traceback_string
        )

    def test_only_create_async_task_creates_task_entry(self):
        """
        Test that we don't add a Task entry when we create a new Celery task outside of the create_async_task API.
        """

        task = non_async_test_task.apply()

        result = task.get()
        self.assertEquals(result, 42)
        self.assertEquals(Task.objects.filter(task_id=task.id).count(), 0)

    def test_get_or_create_task(self):
        expected_task = Task.objects.create(
            task_type="progress-test",
            status=states.PENDING,
            user=self.user,
            metadata={"args": {
                "is_test": True
            }}
        )

        actual_task = get_or_create_async_task("progress-test", self.user, is_test=True)
        self.assertEqual(expected_task.task_id, actual_task.task_id)


class DBFailTestCase(TransactionTestCase):

    @pytest.fixture(autouse=True)
    def inject_fixtures(self, caplog):
        self._caplog = caplog

    def test_task_closes_db_connection_success(self):
        """
        Test that our task class closes stale database connections
        """
        drop_db_connections_success
        drop_db_connections_success.apply()
        try:
            connection.cursor()
        except OperationalError:
            self.fail("Task did not close stale connections")
        if "InterfaceError" in self._caplog.text:
            self.fail("Task did not close stale connections")

    def test_task_closes_db_connection_fail(self):
        """
        Test that our task class closes stale database connections
        """
        drop_db_connections_success
        drop_db_connections_fail.apply()
        try:
            connection.cursor()
        except OperationalError:
            self.fail("Task did not close stale connections")
        if "InterfaceError" in self._caplog.text:
            self.fail("Task did not close stale connections")

    def test_task_with_already_closed_db_connection(self):
        """
        Test that our task class closes stale database connections
        """
        close_db_connection()
        try:
            task = query_db_task.apply()
            if isinstance(task.result, Exception):
                raise task.result
        except OperationalError:
            self.fail("Task did not close stale connections")
