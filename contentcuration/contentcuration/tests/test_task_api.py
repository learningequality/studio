from __future__ import absolute_import

import mock
from celery import states
from django.core.urlresolvers import reverse

from .base import BaseAPITestCase
from contentcuration.models import Task
from contentcuration.utils.celery.tasks import AsyncResult


class TaskAPITestCase(BaseAPITestCase):
    """
    Test that the Task API endpoints work properly. Note that since various APIs may create a task,
    for the unit tests we manually create the db Task object.
    """

    def setUp(self):
        super(TaskAPITestCase, self).setUp()
        self.task_url = "/api/task"
        self.task_data = {
            "status": states.STARTED,
            "task_type": "YOUTUBE_IMPORT",
            "task_id": "just_a_test",
            "user": self.user.pk,
            "metadata": {},
        }
        app_patcher = mock.patch("contentcuration.viewsets.task.app")
        self.addCleanup(app_patcher.stop)
        self.celery_app = app_patcher.start()
        self.celery_app.conf.task_always_eager = False
        self.celery_app.AsyncResult = mock.MagicMock(spec_set=AsyncResult)
        self.async_result = self.celery_app.AsyncResult()
        self.async_result.ready.return_value = False
        self.async_result.status = states.STARTED
        self.async_result.progress = 0
        self.async_result.result = None

    def create_new_task(self, type, channel_id=None):
        """
        Create a new Task object in the DB to simulate the creation of a Celery task and test the Task API.

        :param type: A string with a task name constant.
        :param channel_id: The ID of the affected channel, if any
        :return: The created Task object
        """
        return Task.objects.create(
            task_type=type, status="STARTED", user=self.user, channel_id=channel_id, metadata={}
        )

    def test_get_task(self):
        """
        Ensure that GET operations using a Task ID return information about the specified task.
        """
        task = self.create_new_task(
            type="YOUTUBE_IMPORT", channel_id=self.channel.id,
        )

        url = reverse("task-detail", kwargs={"task_id": task.task_id})
        response = self.get(url)
        self.assertEqual(response.data["status"], states.STARTED)
        self.assertEqual(response.data["task_type"], "YOUTUBE_IMPORT")
        self.assertEqual(response.data["channel"], self.channel.id)
        self.assertEqual(response.data["metadata"]["progress"], 0)
        self.assertIsNone(response.data["metadata"]["result"])

    def test_get_task__finished(self):
        task = self.create_new_task(
            type="YOUTUBE_IMPORT", channel_id=self.channel.id,
        )
        self.async_result.ready.return_value = True
        self.async_result.status = states.SUCCESS
        self.async_result.progress = 100
        self.async_result.result = 123

        url = reverse("task-detail", kwargs={"task_id": task.task_id})
        response = self.get(url)
        self.assertEqual(response.data["status"], states.SUCCESS)
        self.assertEqual(response.data["task_type"], "YOUTUBE_IMPORT")
        self.assertEqual(response.data["channel"], self.channel.id)
        self.assertEqual(response.data["metadata"]["progress"], 100)
        self.assertEqual(response.data["metadata"]["result"], 123)

    def test_get_task__errored(self):
        task = self.create_new_task(
            type="YOUTUBE_IMPORT", channel_id=self.channel.id,
        )
        self.async_result.ready.return_value = True
        self.async_result.status = states.FAILURE
        self.async_result.progress = 75
        self.async_result.traceback = "traceback"
        self.async_result.result = Exception()

        url = reverse("task-detail", kwargs={"task_id": task.task_id})
        response = self.get(url)
        self.assertEqual(response.data["status"], states.FAILURE)
        self.assertEqual(response.data["task_type"], "YOUTUBE_IMPORT")
        self.assertEqual(response.data["channel"], self.channel.id)
        self.assertEqual(response.data["metadata"]["progress"], 100)
        self.assertEqual(response.data["metadata"]["result"], "traceback")
        self.assertEqual(response.data["metadata"]["error"]["traceback"], "traceback")

    def test_get_task_list(self):
        self.create_new_task(
            type="YOUTUBE_IMPORT", channel_id=self.channel.id
        )

        url = reverse("task-list") + "?channel={}".format(self.channel.id)
        self.channel.editors.add(self.user)
        self.client.force_authenticate(user=self.user)
        response = self.get(url)
        self.assertEqual(len(response.data), 1)

        data = response.data[0]
        self.assertEqual(data["status"], states.STARTED)
        self.assertEqual(data["task_type"], "YOUTUBE_IMPORT")
        self.assertEqual(data["channel"], self.channel.id)
        self.assertEqual(data["metadata"]["progress"], 0)
        self.assertIsNone(data["metadata"]["result"])

    def test_get_empty_task_list(self):
        url = reverse("task-list")
        response = self.get(url)

        self.assertEqual(response.status_code, 412)

    def test_cannot_create_task(self):
        """
        Tasks are created when Celery operations are started. It is not possible to manually create tasks via
        the API, so ensure the API does not create a task.
        """

        response = self.post(self.task_url, data=self.task_data)
        self.assertEqual(response.status_code, 405)

    def test_cannot_update_task(self):
        """
        Task state is managed by the Celery async task that created it, so make sure we cannot update the task state
        via API.
        """

        task = self.create_new_task(type="NONE")
        url = reverse("task-detail", kwargs={"task_id": task.task_id})
        response = self.put(url, data=self.task_data)
        self.assertEqual(response.status_code, 405)

    def test_delete_task(self):
        """
        Ensure that a call to DELETE the specified task results in its deletion.
        """
        task = self.create_new_task(
            type="YOUTUBE_IMPORT", channel_id=self.channel.id
        )

        url = reverse("task-detail", kwargs={"task_id": task.task_id})
        response = self.get(url)
        self.assertEqual(response.status_code, 200)

        response = self.delete(url)
        self.assertEqual(response.status_code, 204)

        response = self.get(url)
        self.assertEqual(response.status_code, 404)
