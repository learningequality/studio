# -*- coding: utf-8 -*-
"""
Tests for contentcuration.views.internal functions.
"""
from django.urls import reverse_lazy

from ..base import BaseAPITestCase
from contentcuration.models import TaskResult
from contentcuration.utils.db_tools import TreeBuilder


class PublishingStatusEndpointTestCase(BaseAPITestCase):
    def test_200_get(self):
        self.user.is_admin = True
        self.user.save()
        main_tree = TreeBuilder(user=self.user)
        self.channel.main_tree = main_tree.root
        self.channel.save()
        self.channel.mark_publishing(self.user)
        task = TaskResult.objects.create(
            task_name="export-channel",
            channel_id=self.channel.id,
            user_id=self.user.id,
            status="QUEUED",
        )
        response = self.get(
            reverse_lazy("publishing_status"),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(1, len(response.data))
        self.assertEqual(self.channel.id, response.data[0]["channel_id"])
        self.assertEqual(task.task_id, response.data[0]["task_id"])
        self.assertIn("performed", response.data[0])
