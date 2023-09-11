from __future__ import absolute_import

import uuid

import mock
from django.urls import reverse
from le_utils.constants import content_kinds

from contentcuration import models
from contentcuration import models as cc
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.tests.viewsets.base import generate_create_event
from contentcuration.tests.viewsets.base import generate_delete_event
from contentcuration.tests.viewsets.base import generate_deploy_channel_event
from contentcuration.tests.viewsets.base import generate_sync_channel_event
from contentcuration.tests.viewsets.base import generate_update_event
from contentcuration.tests.viewsets.base import SyncTestMixin
from contentcuration.viewsets.sync.constants import CHANNEL


class SyncTestCase(SyncTestMixin, StudioAPITestCase):

    @property
    def channel_metadata(self):
        return {
            "name": "Aron's cool channel",
            "id": uuid.uuid4().hex,
            "description": "coolest channel this side of the Pacific",
        }

    def test_create_channel(self):
        user = testdata.user()
        self.client.force_authenticate(user=user)
        channel = self.channel_metadata
        response = self.sync_changes(
            [generate_create_event(channel["id"], CHANNEL, channel, channel_id=channel["id"])]
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.Channel.objects.get(id=channel["id"])
        except models.Channel.DoesNotExist:
            self.fail("Channel was not created")

    def test_create_channels(self):
        user = testdata.user()
        self.client.force_authenticate(user=user)
        channel1 = self.channel_metadata
        channel2 = self.channel_metadata
        response = self.sync_changes(
            [
                generate_create_event(channel1["id"], CHANNEL, channel1, channel_id=channel1["id"]),
                generate_create_event(channel2["id"], CHANNEL, channel2, channel_id=channel2["id"]),
            ]
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.Channel.objects.get(id=channel1["id"])
        except models.Channel.DoesNotExist:
            self.fail("Channel 1 was not created")

        try:
            models.Channel.objects.get(id=channel2["id"])
        except models.Channel.DoesNotExist:
            self.fail("Channel 2 was not created")

    def test_update_channel(self):
        user = testdata.user()
        channel = models.Channel.objects.create(**self.channel_metadata)
        channel.editors.add(user)
        new_name = "This is not the old name"

        self.client.force_authenticate(user=user)
        response = self.sync_changes(
            [generate_update_event(channel.id, CHANNEL, {"name": new_name}, channel_id=channel.id)]
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(models.Channel.objects.get(id=channel.id).name, new_name)

    def test_update_channel_thumbnail_encoding(self):
        user = testdata.user()
        channel = models.Channel.objects.create(**self.channel_metadata)
        channel.editors.add(user)
        new_encoding = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQA"
        self.client.force_authenticate(user=user)
        response = self.sync_changes(
            [generate_update_event(channel.id, CHANNEL, {
                "thumbnail_encoding.base64": new_encoding,
                "thumbnail_encoding.orientation": 1,
                "thumbnail_encoding.scale": 0.73602189113443,
                "thumbnail_encoding.startX": -96.66631072431669,
                "thumbnail_encoding.startY": -335.58116356397636,
            }, channel_id=channel.id)]
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(models.Channel.objects.get(id=channel.id).thumbnail_encoding["base64"], new_encoding)

    def test_cannot_update_channel(self):
        user = testdata.user()
        channel = models.Channel.objects.create(**self.channel_metadata)
        new_name = "This is not the old name"

        self.client.force_authenticate(user=user)
        response = self.sync_changes(
            [generate_update_event(channel.id, CHANNEL, {"name": new_name}, channel_id=channel.id)],
        )
        self.assertEqual(len(response.json()["disallowed"]), 1, response.content)
        self.assertNotEqual(models.Channel.objects.get(id=channel.id).name, new_name)

    def test_viewer_cannot_update_channel(self):
        user = testdata.user()
        channel = models.Channel.objects.create(**self.channel_metadata)
        channel.viewers.add(user)
        new_name = "This is not the old name"

        self.client.force_authenticate(user=user)
        response = self.sync_changes(
            [generate_update_event(channel.id, CHANNEL, {"name": new_name}, channel_id=channel.id)],
        )
        self.assertEqual(len(response.json()["disallowed"]), 1, response.content)
        self.assertNotEqual(models.Channel.objects.get(id=channel.id).name, new_name)

    def test_update_channel_defaults(self):
        user = testdata.user()
        channel = models.Channel.objects.create(**self.channel_metadata)
        channel.editors.add(user)
        author = "This is not the old author"

        self.client.force_authenticate(user=user)
        response = self.sync_changes(
            [
                generate_update_event(
                    channel.id, CHANNEL, {"content_defaults.author": author}, channel_id=channel.id
                )
            ]
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.Channel.objects.get(id=channel.id).content_defaults["author"], author
        )

        aggregator = "This is not the old aggregator"

        self.client.force_authenticate(user=user)
        response = self.sync_changes(
            [
                generate_update_event(
                    channel.id, CHANNEL, {"content_defaults.aggregator": aggregator}, channel_id=channel.id
                )
            ]
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.Channel.objects.get(id=channel.id).content_defaults["author"], author
        )
        self.assertEqual(
            models.Channel.objects.get(id=channel.id).content_defaults["aggregator"],
            aggregator,
        )

    def test_update_channels(self):
        user = testdata.user()
        channel1 = models.Channel.objects.create(**self.channel_metadata)
        channel1.editors.add(user)
        channel2 = models.Channel.objects.create(**self.channel_metadata)
        channel2.editors.add(user)
        new_name = "This is not the old name"

        self.client.force_authenticate(user=user)
        response = self.sync_changes(
            [
                generate_update_event(channel1.id, CHANNEL, {"name": new_name}, channel_id=channel1.id),
                generate_update_event(channel2.id, CHANNEL, {"name": new_name}, channel_id=channel2.id),
            ]
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(models.Channel.objects.get(id=channel1.id).name, new_name)
        self.assertEqual(models.Channel.objects.get(id=channel2.id).name, new_name)

    def test_cannot_update_some_channels(self):
        user = testdata.user()
        channel1 = models.Channel.objects.create(**self.channel_metadata)
        channel1.editors.add(user)
        channel2 = models.Channel.objects.create(**self.channel_metadata)
        new_name = "This is not the old name"

        self.client.force_authenticate(user=user)
        response = self.sync_changes(
            [
                generate_update_event(channel1.id, CHANNEL, {"name": new_name}, channel_id=channel1.id),
                generate_update_event(channel2.id, CHANNEL, {"name": new_name}, channel_id=channel2.id),
            ],
        )
        self.assertEqual(len(response.json()["disallowed"]), 1, response.content)
        self.assertEqual(models.Channel.objects.get(id=channel1.id).name, new_name)
        self.assertNotEqual(models.Channel.objects.get(id=channel2.id).name, new_name)

    def test_viewer_cannot_update_some_channels(self):
        user = testdata.user()
        channel1 = models.Channel.objects.create(**self.channel_metadata)
        channel1.editors.add(user)
        channel2 = models.Channel.objects.create(**self.channel_metadata)
        channel2.viewers.add(user)
        new_name = "This is not the old name"

        self.client.force_authenticate(user=user)
        response = self.sync_changes(
            [
                generate_update_event(channel1.id, CHANNEL, {"name": new_name}, channel_id=channel1.id),
                generate_update_event(channel2.id, CHANNEL, {"name": new_name}, channel_id=channel2.id),
            ],
        )
        self.assertEqual(len(response.json()["disallowed"]), 1, response.content)
        self.assertEqual(models.Channel.objects.get(id=channel1.id).name, new_name)
        self.assertNotEqual(models.Channel.objects.get(id=channel2.id).name, new_name)

    def test_delete_channel(self):
        user = testdata.user()
        channel = models.Channel.objects.create(**self.channel_metadata)
        channel.editors.add(user)

        self.client.force_authenticate(user=user)
        response = self.sync_changes([generate_delete_event(channel.id, CHANNEL, channel_id=channel.id)])
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(models.Channel.objects.get(id=channel.id).deleted)

    def test_cannot_delete_channel(self):
        user = testdata.user()
        channel = models.Channel.objects.create(**self.channel_metadata)

        self.client.force_authenticate(user=user)
        response = self.sync_changes(
            [generate_delete_event(channel.id, CHANNEL, channel_id=channel.id)],
        )
        # Returns a 200 as, as far as the frontend is concerned
        # the operation is done.
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.Channel.objects.get(id=channel.id)
        except models.Channel.DoesNotExist:
            self.fail("Channel was deleted")

    def test_delete_channels(self):
        user = testdata.user()
        channel1 = models.Channel.objects.create(**self.channel_metadata)
        channel1.editors.add(user)

        channel2 = models.Channel.objects.create(**self.channel_metadata)
        channel2.editors.add(user)

        self.client.force_authenticate(user=user)
        response = self.sync_changes(
            [
                generate_delete_event(channel1.id, CHANNEL, channel_id=channel1.id),
                generate_delete_event(channel2.id, CHANNEL, channel_id=channel2.id),
            ]
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(models.Channel.objects.get(id=channel1.id).deleted)
        self.assertTrue(models.Channel.objects.get(id=channel2.id).deleted)

    def test_cannot_delete_some_channels(self):
        user = testdata.user()
        channel1 = models.Channel.objects.create(**self.channel_metadata)
        channel1.editors.add(user)
        channel2 = models.Channel.objects.create(**self.channel_metadata)

        self.client.force_authenticate(user=user)
        response = self.sync_changes(
            [
                generate_delete_event(channel1.id, CHANNEL, channel_id=channel1.id),
                generate_delete_event(channel2.id, CHANNEL, channel_id=channel2.id),
            ],
        )
        # Returns a 200 as, as far as the frontend is concerned
        # the operation is done.
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(models.Channel.objects.get(id=channel1.id).deleted)
        self.assertFalse(models.Channel.objects.get(id=channel2.id).deleted)

    @mock.patch("contentcuration.viewsets.channel.sync_channel")
    def test_sync_channel_called_correctly(self, sync_channel_mock):
        user = testdata.user()
        channel = testdata.channel()
        channel.editors.add(user)
        channel_node = channel.main_tree.get_descendants().first()
        channel_node.copy_to(target=channel.main_tree)

        self.client.force_authenticate(user=user)
        for i in range(1, 5):
            print("here comess the debuggggggggggg")
            print(i)
            sync_channel_mock.reset_mock()
            args = [channel.id, False, False, False, False]
            args[i] = True

            response = self.sync_changes(
                [
                    generate_sync_channel_event(*args)
                ]
            )

            self.assertEqual(response.status_code, 200)
            sync_channel_mock.assert_called_once()
            self.assertEqual(sync_channel_mock.call_args.args[i], True)

    def test_deploy_channel_event(self):
        channel = testdata.channel()
        user = testdata.user()
        channel.editors.add(user)
        self.client.force_authenticate(
            user
        )  # This will skip all authentication checks
        channel.main_tree.refresh_from_db()

        channel.staging_tree = cc.ContentNode(
            kind_id=content_kinds.TOPIC, title="test", node_id="aaa"
        )
        channel.staging_tree.save()
        channel.previous_tree = cc.ContentNode(
            kind_id=content_kinds.TOPIC, title="test", node_id="bbb"
        )
        channel.previous_tree.save()
        channel.chef_tree = cc.ContentNode(
            kind_id=content_kinds.TOPIC, title="test", node_id="ccc"
        )
        channel.chef_tree.save()
        channel.save()

        self.contentnode = cc.ContentNode.objects.create(kind_id="video")

        response = self.sync_changes(
                    [
                        generate_deploy_channel_event(channel.id, user.id)
                    ]
                )

        self.assertEqual(response.status_code, 200)
        modified_channel = models.Channel.objects.get(id=channel.id)
        self.assertEqual(modified_channel.main_tree, channel.staging_tree)
        self.assertEqual(modified_channel.staging_tree, None)
        self.assertEqual(modified_channel.previous_tree, channel.main_tree)

    def test_deploy_with_staging_tree_None(self):
        channel = testdata.channel()
        user = testdata.user()
        channel.editors.add(user)
        self.client.force_authenticate(
            user
        )  # This will skip all authentication checks
        channel.main_tree.refresh_from_db()

        channel.staging_tree = None
        channel.previous_tree = cc.ContentNode(
            kind_id=content_kinds.TOPIC, title="test", node_id="bbb"
        )
        channel.previous_tree.save()
        channel.chef_tree = cc.ContentNode(
            kind_id=content_kinds.TOPIC, title="test", node_id="ccc"
        )
        channel.chef_tree.save()
        channel.save()

        self.contentnode = cc.ContentNode.objects.create(kind_id="video")
        response = self.sync_changes(
                    [
                        generate_deploy_channel_event(channel.id, user.id)
                    ]
                )
        # Should raise validation error as staging tree was set to NONE
        self.assertEqual(len(response.json()["errors"]), 1, response.content)
        modified_channel = models.Channel.objects.get(id=channel.id)
        self.assertNotEqual(modified_channel.main_tree, channel.staging_tree)
        self.assertNotEqual(modified_channel.previous_tree, channel.main_tree)


class CRUDTestCase(StudioAPITestCase):
    @property
    def channel_metadata(self):
        return {
            "name": "Aron's cool channel",
            "id": uuid.uuid4().hex,
            "description": "coolest channel this side of the Pacific",
        }

    def test_fetch_channel_for_admin(self):
        channel = models.Channel.objects.create(**self.channel_metadata)
        user = testdata.user()
        user.is_admin = True
        user.save()
        self.client.force_authenticate(user=user)
        response = self.client.get(
            reverse("channel-detail", kwargs={"pk": channel.id}), format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_fetch_admin_channels_invalid_filter(self):
        models.Channel.objects.create(**self.channel_metadata)
        user = testdata.user()
        user.is_admin = True
        user.is_staff = True
        user.save()
        self.client.force_authenticate(user=user)
        response = self.client.get(
            reverse("admin-channels-list") + "?public=true&page_size=25&edit=true", format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_create_channel(self):
        user = testdata.user()
        self.client.force_authenticate(user=user)
        channel = self.channel_metadata
        response = self.client.post(reverse("channel-list"), channel, format="json",)
        self.assertEqual(response.status_code, 201, response.content)
        try:
            models.Channel.objects.get(id=channel["id"])
        except models.Channel.DoesNotExist:
            self.fail("Channel was not created")

    def test_update_channel(self):
        user = testdata.user()
        channel = models.Channel.objects.create(**self.channel_metadata)
        channel.editors.add(user)
        new_name = "This is not the old name"

        self.client.force_authenticate(user=user)
        response = self.client.patch(
            reverse("channel-detail", kwargs={"pk": channel.id}),
            {"name": new_name},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(models.Channel.objects.get(id=channel.id).name, new_name)

    def test_delete_channel(self):
        user = testdata.user()
        channel = models.Channel.objects.create(**self.channel_metadata)
        channel.editors.add(user)

        self.client.force_authenticate(user=user)
        response = self.client.delete(
            reverse("channel-detail", kwargs={"pk": channel.id})
        )
        self.assertEqual(response.status_code, 204, response.content)
        self.assertTrue(models.Channel.objects.get(id=channel.id).deleted)
