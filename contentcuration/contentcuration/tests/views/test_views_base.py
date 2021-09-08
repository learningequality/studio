# -*- coding: utf-8 -*-
"""
Tests for contentcuration.views.internal functions.
"""
from django.urls import reverse_lazy

from ..base import BaseAPITestCase
from contentcuration.models import Channel
from contentcuration.utils.db_tools import TreeBuilder


class APIActivateChannelEndpointTestCase(BaseAPITestCase):
    def test_200_post(self):
        main_tree = TreeBuilder(user=self.user)
        staging_tree = TreeBuilder(user=self.user)
        self.channel.main_tree = main_tree.root
        self.channel.staging_tree = staging_tree.root
        self.channel.save()
        response = self.post(
            reverse_lazy("activate_channel"), {"channel_id": self.channel.id}
        )
        self.assertEqual(response.status_code, 200)

    def test_404_no_permission(self):
        new_channel = Channel.objects.create()
        staging_tree = TreeBuilder(user=self.user, levels=1)
        new_channel.staging_tree = staging_tree.root
        new_channel.save()
        response = self.post(
            reverse_lazy("activate_channel"), {"channel_id": new_channel.id}
        )
        self.assertEqual(response.status_code, 404)

    def test_200_no_change_in_space(self):
        main_tree = TreeBuilder(user=self.user)
        staging_tree = TreeBuilder(user=self.user)
        self.channel.main_tree = main_tree.root
        self.channel.staging_tree = staging_tree.root
        self.channel.save()
        self.user.disk_space = self.user.get_space_used(active_files=self.user.get_user_active_files())
        self.user.save()
        response = self.post(
            reverse_lazy("activate_channel"), {"channel_id": self.channel.id}
        )
        self.assertEqual(response.status_code, 200)


class PublishingStatusEndpointTestCase(BaseAPITestCase):
    def test_200_get(self):
        self.user.is_admin = True
        self.user.save()
        main_tree = TreeBuilder(user=self.user)
        self.channel.main_tree = main_tree.root
        self.channel.save()
        self.channel.mark_publishing(self.user)
        response = self.get(
            reverse_lazy("publishing_status"),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(1, len(response.data))
        self.assertIn("channel_id", response.data[0])
