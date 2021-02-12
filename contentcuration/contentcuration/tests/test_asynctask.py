from __future__ import absolute_import

import uuid
from builtins import range
from builtins import str

import pytest
from django.core.urlresolvers import reverse
from django.db import connection
from django.db.utils import OperationalError
from django.test import TransactionTestCase

from .base import BaseAPITestCase
from contentcuration.models import ContentNode
from contentcuration.models import Task
from contentcuration.tasks import create_async_task
from contentcuration.tasks_test import close_db_connection
from contentcuration.tasks_test import drop_db_connections_fail
from contentcuration.tasks_test import drop_db_connections_success
from contentcuration.tasks_test import non_async_test_task
from contentcuration.tasks_test import query_db_task
from contentcuration.viewsets.sync.constants import CONTENTNODE
from contentcuration.viewsets.sync.constants import COPYING_FLAG
from contentcuration.viewsets.sync.utils import generate_update_event


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
        task, task_info = create_async_task("test", self.user, apply_async=False)
        self.assertEqual(task_info.user, self.user)
        self.assertEqual(task_info.task_type, "test")
        self.assertEqual(task_info.is_progress_tracking, False)
        result = task.get()
        self.assertEqual(result, 42)
        self.assertEqual(Task.objects.get(task_id=task.id).metadata["result"], 42)
        self.assertEqual(Task.objects.get(task_id=task.id).status, "SUCCESS")

    def test_asynctask_reports_progress(self):
        """
        Test that we can retrieve task progress via the Task API.
        """
        task, task_info = create_async_task(
            "progress-test", self.user, apply_async=False
        )
        result = task.get()
        self.assertEqual(result, 42)
        self.assertEqual(Task.objects.get(task_id=task.id).status, "SUCCESS")

        # progress is retrieved dynamically upon calls to get the task info, so
        # use an API call rather than checking the db directly for progress.
        url = reverse("task-detail", kwargs={"task_id": task_info.task_id})
        response = self.get(url)
        self.assertEqual(response.data["status"], "SUCCESS")
        self.assertEqual(response.data["task_type"], "progress-test")
        self.assertEqual(response.data["metadata"]["progress"], 100)
        self.assertEqual(response.data["metadata"]["result"], 42)

    def test_asynctask_filters_by_channel(self):
        """
        Test that we can filter tasks by channel ID.
        """

        self.channel.editors.add(self.user)
        self.channel.save()
        task, task_info = create_async_task(
            "progress-test", self.user, apply_async=False, channel_id=self.channel.id
        )
        self.assertTrue(
            Task.objects.filter(metadata__affects__channel=self.channel.id).count() == 1
        )
        result = task.get()
        self.assertEqual(result, 42)
        self.assertEqual(Task.objects.get(task_id=task.id).status, "SUCCESS")

        # since tasks run sync in tests, we can't test it in an actual running state
        # so simulate the running state in the task object.
        db_task = Task.objects.get(task_id=task.id)
        db_task.status = "STARTED"
        db_task.save()
        url = "{}?channel={}".format(reverse("task-list"), self.channel.id)
        response = self.get(url)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["status"], "STARTED")
        self.assertEqual(response.data[0]["task_type"], "progress-test")
        self.assertEqual(response.data[0]["metadata"]["progress"], 100)
        self.assertEqual(response.data[0]["metadata"]["result"], 42)

        url = "{}?channel={}".format(reverse("task-list"), task_info.id)
        response = self.get(url)
        self.assertEqual(response.status_code, 412)

    def test_asynctask_reports_error(self):
        """
        Tests that if a task fails with an error, that the error information is stored in the Task object for later
        retrieval and analysis.
        """
        task, task_info = create_async_task("error-test", self.user, apply_async=False)

        task = Task.objects.get(task_id=task.id)
        self.assertEqual(task.status, "FAILURE")
        self.assertTrue("error" in task.metadata)

        error = task.metadata["error"]
        self.assertCountEqual(
            list(error.keys()), ["message", "task_args", "task_kwargs", "traceback"]
        )
        self.assertEqual(len(error["task_args"]), 0)
        self.assertEqual(len(error["task_kwargs"]), 0)
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

    def test_duplicate_nodes_task(self):
        ids = []
        node_ids = []
        for i in range(3, 6):
            node_id = "0000000000000000000000000000000" + str(i)
            node_ids.append(node_id)
            node = ContentNode.objects.get(node_id=node_id)
            ids.append(node.pk)

        parent_node = ContentNode.objects.get(
            node_id="00000000000000000000000000000002"
        )

        tasks = []

        for source_id in ids:

            task_args = {
                "user_id": self.user.pk,
                "channel_id": self.channel.pk,
                "source_id": source_id,
                "target_id": parent_node.pk,
                "pk": uuid.uuid4().hex,
            }
            task, task_info = create_async_task(
                "duplicate-nodes", self.user, apply_async=False, **task_args
            )
            tasks.append((task_args, task_info))

        for task_args, task_info in tasks:
            # progress is retrieved dynamically upon calls to get the task info, so
            # use an API call rather than checking the db directly for progress.
            url = reverse("task-detail", kwargs={"task_id": task_info.task_id})
            response = self.get(url)
            assert (
                response.data["status"] == "SUCCESS"
            ), "Task failed, exception: {}".format(
                response.data["metadata"]["error"]["traceback"]
            )
            self.assertEqual(response.data["status"], "SUCCESS")
            self.assertEqual(response.data["task_type"], "duplicate-nodes")
            self.assertEqual(response.data["metadata"]["progress"], 100)
            result = response.data["metadata"]["result"]
            node_id = ContentNode.objects.get(pk=task_args["pk"]).node_id
            self.assertEqual(
                result["changes"][0],
                generate_update_event(
                    task_args["pk"], CONTENTNODE, {COPYING_FLAG: False, "node_id": node_id}
                ),
            )

        parent_node.refresh_from_db()
        children = parent_node.get_children()

        for child in children:
            # make sure the copies are in the results
            if child.original_source_node_id and child.source_node_id:
                assert child.original_source_node_id in node_ids
                assert child.source_node_id in node_ids


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
