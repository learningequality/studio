# -*- coding: utf-8 -*-
"""
Tests for contentcuration.views.internal functions.
"""
import uuid

from django.urls import reverse_lazy
from django_celery_results.models import TaskResult

from ..base import BaseAPITestCase
from contentcuration.models import CustomTaskMetadata
from contentcuration.tests import testdata
from contentcuration.utils.db_tools import TreeBuilder


class PublishingStatusEndpointTestCase(BaseAPITestCase):
    def test_200_get(self):
        self.user.is_admin = True
        self.user.save()
        main_tree = TreeBuilder(user=self.user)
        self.channel.main_tree = main_tree.root
        channel_2 = testdata.channel()
        self.channel.save()
        channel_2.save()
        self.channel.mark_publishing(self.user)
        channel_2.mark_publishing(self.user)
        task_id = uuid.uuid4().hex
        task_id_2 = uuid.uuid4().hex
        task = TaskResult.objects.create(
            task_id=task_id,
            task_name="export-channel",
            status="QUEUED",
        )
        task_2 = TaskResult.objects.create(
            task_id=task_id_2,
            task_name="export-channel",
            status="QUEUED",
        )
        CustomTaskMetadata(
            task_id=task_id, user=self.user, channel_id=self.channel.id
        ).save()
        CustomTaskMetadata(
            task_id=task_id_2, user=self.user, channel_id=channel_2.id
        ).save()
        response = self.get(
            reverse_lazy("publishing_status"),
        )

        expected_channel_ids = [self.channel.id, channel_2.id]
        expected_channel_ids.sort()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(2, len(response.data))

        for i, item in enumerate(response.data):
            self.assertEqual(expected_channel_ids[i], item["channel_id"])
            expected_task_id = (
                task.task_id
                if item["channel_id"] == self.channel.id
                else task_2.task_id
            )
            self.assertEqual(expected_task_id, item["task_id"])
            self.assertIn("performed", item)
