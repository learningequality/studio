from __future__ import absolute_import

from django.core.urlresolvers import reverse

from .base import BaseAPITestCase
from contentcuration.models import Task


class TaskAPITestCase(BaseAPITestCase):
    """
    Test that the Task API endpoints work properly. Note that since various APIs may create a task,
    for the unit tests we manually create the db Task object.
    """

    def setUp(self):
        super(TaskAPITestCase, self).setUp()
        self.task_url = "/api/task"
        self.task_data = {
            "status": "STARTED",
            "task_type": "YOUTUBE_IMPORT",
            "task_id": "just_a_test",
            "user": self.user.pk,
            "metadata": {},
        }

    def create_new_task(self, type, metadata, channel_id=None):
        """
        Create a new Task object in the DB to simulate the creation of a Celery task and test the Task API.

        :param type: A string with a task name constant.
        :param metadata: A dictionary containing information about the task. See create_async_task docs for more details.
        :return: The created Task object
        """
        return Task.objects.create(
            task_type=type, metadata=metadata, status="STARTED", user=self.user, channel_id=channel_id
        )

    def test_get_task(self):
        """
        Ensure that GET operations using a Task ID return information about the specified task.
        """
        task = self.create_new_task(
            type="YOUTUBE_IMPORT", metadata={"channel": self.channel.id}
        )

        url = reverse("task-detail", kwargs={"task_id": task.task_id})
        response = self.get(url)
        self.assertEqual(response.data["status"], "STARTED")
        self.assertEqual(response.data["task_type"], "YOUTUBE_IMPORT")
        self.assertEqual(response.data["metadata"], {"channel": self.channel.id})

    def test_get_task_list(self):
        self.create_new_task(
            type="YOUTUBE_IMPORT", metadata={"affects": {"channel": self.channel.id}}, channel_id=self.channel.id
        )

        url = reverse("task-list") + "?channel={}".format(self.channel.id)
        self.channel.editors.add(self.user)
        self.client.force_authenticate(user=self.user)
        response = self.get(url)
        self.assertEqual(len(response.data), 1)

        self.assertEqual(response.data[0]["status"], "STARTED")
        self.assertEqual(response.data[0]["task_type"], "YOUTUBE_IMPORT")
        self.assertEqual(
            response.data[0]["metadata"], {"affects": {"channel": self.channel.id}}
        )

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

        task = self.create_new_task(type="NONE", metadata={})
        url = reverse("task-detail", kwargs={"task_id": task.task_id})
        response = self.put(url, data=self.task_data)
        self.assertEqual(response.status_code, 405)

    def test_delete_task(self):
        """
        Ensure that a call to DELETE the specified task results in its deletion.
        """
        task = self.create_new_task(
            type="YOUTUBE_IMPORT", metadata={"channel": self.channel.id}
        )

        url = reverse("task-detail", kwargs={"task_id": task.task_id})
        response = self.get(url)
        self.assertEqual(response.status_code, 200)

        response = self.delete(url)
        self.assertEqual(response.status_code, 204)

        response = self.get(url)
        self.assertEqual(response.status_code, 404)
