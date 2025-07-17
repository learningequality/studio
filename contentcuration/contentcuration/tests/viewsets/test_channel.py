import uuid

import mock
from django.db.models import Exists
from django.db.models import OuterRef
from django.urls import reverse
from kolibri_public.models import ContentNode as PublicContentNode
from le_utils.constants import content_kinds
from mock import patch

from contentcuration import models
from contentcuration import models as cc
from contentcuration.constants import channel_history
from contentcuration.models import ContentNode
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.tests.viewsets.base import generate_create_event
from contentcuration.tests.viewsets.base import generate_delete_event
from contentcuration.tests.viewsets.base import generate_deploy_channel_event
from contentcuration.tests.viewsets.base import generate_publish_channel_event
from contentcuration.tests.viewsets.base import generate_publish_next_event
from contentcuration.tests.viewsets.base import generate_sync_channel_event
from contentcuration.tests.viewsets.base import generate_update_event
from contentcuration.tests.viewsets.base import SyncTestMixin
from contentcuration.viewsets.channel import _unpublished_changes_query
from contentcuration.viewsets.sync.constants import CHANNEL


class SyncTestCase(SyncTestMixin, StudioAPITestCase):
    @classmethod
    def setUpClass(cls):
        super(SyncTestCase, cls).setUpClass()
        cls.patch_copy_db = patch("contentcuration.utils.publish.save_export_database")
        cls.mock_save_export = cls.patch_copy_db.start()

    @classmethod
    def tearDownClass(cls):
        super(SyncTestCase, cls).tearDownClass()
        cls.patch_copy_db.stop()

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
            [
                generate_create_event(
                    channel["id"], CHANNEL, channel, channel_id=channel["id"]
                )
            ]
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
                generate_create_event(
                    channel1["id"], CHANNEL, channel1, channel_id=channel1["id"]
                ),
                generate_create_event(
                    channel2["id"], CHANNEL, channel2, channel_id=channel2["id"]
                ),
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
        channel = models.Channel.objects.create(
            actor_id=user.id, **self.channel_metadata
        )
        channel.editors.add(user)
        new_name = "This is not the old name"

        self.client.force_authenticate(user=user)
        response = self.sync_changes(
            [
                generate_update_event(
                    channel.id, CHANNEL, {"name": new_name}, channel_id=channel.id
                )
            ]
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(models.Channel.objects.get(id=channel.id).name, new_name)

    def test_update_channel_thumbnail_encoding(self):
        user = testdata.user()
        channel = models.Channel.objects.create(
            actor_id=user.id, **self.channel_metadata
        )
        channel.editors.add(user)
        new_encoding = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQA"
        self.client.force_authenticate(user=user)
        response = self.sync_changes(
            [
                generate_update_event(
                    channel.id,
                    CHANNEL,
                    {
                        "thumbnail_encoding.base64": new_encoding,
                        "thumbnail_encoding.orientation": 1,
                        "thumbnail_encoding.scale": 0.73602189113443,
                        "thumbnail_encoding.startX": -96.66631072431669,
                        "thumbnail_encoding.startY": -335.58116356397636,
                    },
                    channel_id=channel.id,
                )
            ]
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.Channel.objects.get(id=channel.id).thumbnail_encoding["base64"],
            new_encoding,
        )

    def test_cannot_update_channel(self):
        user = testdata.user()
        channel = models.Channel.objects.create(
            actor_id=user.id, **self.channel_metadata
        )
        new_name = "This is not the old name"

        self.client.force_authenticate(user=user)
        response = self.sync_changes(
            [
                generate_update_event(
                    channel.id, CHANNEL, {"name": new_name}, channel_id=channel.id
                )
            ],
        )
        self.assertEqual(len(response.json()["disallowed"]), 1, response.content)
        self.assertNotEqual(models.Channel.objects.get(id=channel.id).name, new_name)

    def test_viewer_cannot_update_channel(self):
        user = testdata.user()
        channel = models.Channel.objects.create(
            actor_id=user.id, **self.channel_metadata
        )
        channel.viewers.add(user)
        new_name = "This is not the old name"

        self.client.force_authenticate(user=user)
        response = self.sync_changes(
            [
                generate_update_event(
                    channel.id, CHANNEL, {"name": new_name}, channel_id=channel.id
                )
            ],
        )
        self.assertEqual(len(response.json()["disallowed"]), 1, response.content)
        self.assertNotEqual(models.Channel.objects.get(id=channel.id).name, new_name)

    def test_update_channel_defaults(self):
        user = testdata.user()
        channel = models.Channel.objects.create(
            actor_id=user.id, **self.channel_metadata
        )
        channel.editors.add(user)
        author = "This is not the old author"

        self.client.force_authenticate(user=user)
        response = self.sync_changes(
            [
                generate_update_event(
                    channel.id,
                    CHANNEL,
                    {"content_defaults.author": author},
                    channel_id=channel.id,
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
                    channel.id,
                    CHANNEL,
                    {"content_defaults.aggregator": aggregator},
                    channel_id=channel.id,
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
        channel1 = models.Channel.objects.create(
            actor_id=user.id, **self.channel_metadata
        )
        channel1.editors.add(user)
        channel2 = models.Channel.objects.create(
            actor_id=user.id, **self.channel_metadata
        )
        channel2.editors.add(user)
        new_name = "This is not the old name"

        self.client.force_authenticate(user=user)
        response = self.sync_changes(
            [
                generate_update_event(
                    channel1.id, CHANNEL, {"name": new_name}, channel_id=channel1.id
                ),
                generate_update_event(
                    channel2.id, CHANNEL, {"name": new_name}, channel_id=channel2.id
                ),
            ]
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(models.Channel.objects.get(id=channel1.id).name, new_name)
        self.assertEqual(models.Channel.objects.get(id=channel2.id).name, new_name)

    def test_cannot_update_some_channels(self):
        user = testdata.user()
        channel1 = models.Channel.objects.create(
            actor_id=user.id, **self.channel_metadata
        )
        channel1.editors.add(user)
        channel2 = models.Channel.objects.create(
            actor_id=user.id, **self.channel_metadata
        )
        new_name = "This is not the old name"

        self.client.force_authenticate(user=user)
        response = self.sync_changes(
            [
                generate_update_event(
                    channel1.id, CHANNEL, {"name": new_name}, channel_id=channel1.id
                ),
                generate_update_event(
                    channel2.id, CHANNEL, {"name": new_name}, channel_id=channel2.id
                ),
            ],
        )
        self.assertEqual(len(response.json()["disallowed"]), 1, response.content)
        self.assertEqual(models.Channel.objects.get(id=channel1.id).name, new_name)
        self.assertNotEqual(models.Channel.objects.get(id=channel2.id).name, new_name)

    def test_viewer_cannot_update_some_channels(self):
        user = testdata.user()
        channel1 = models.Channel.objects.create(
            actor_id=user.id, **self.channel_metadata
        )
        channel1.editors.add(user)
        channel2 = models.Channel.objects.create(
            actor_id=user.id, **self.channel_metadata
        )
        channel2.viewers.add(user)
        new_name = "This is not the old name"

        self.client.force_authenticate(user=user)
        response = self.sync_changes(
            [
                generate_update_event(
                    channel1.id, CHANNEL, {"name": new_name}, channel_id=channel1.id
                ),
                generate_update_event(
                    channel2.id, CHANNEL, {"name": new_name}, channel_id=channel2.id
                ),
            ],
        )
        self.assertEqual(len(response.json()["disallowed"]), 1, response.content)
        self.assertEqual(models.Channel.objects.get(id=channel1.id).name, new_name)
        self.assertNotEqual(models.Channel.objects.get(id=channel2.id).name, new_name)

    def test_delete_channel(self):
        user = testdata.user()
        channel = models.Channel.objects.create(
            actor_id=user.id, **self.channel_metadata
        )
        channel.editors.add(user)

        self.client.force_authenticate(user=user)
        response = self.sync_changes(
            [generate_delete_event(channel.id, CHANNEL, channel_id=channel.id)]
        )
        self.assertEqual(response.status_code, 200, response.content)
        channel = models.Channel.objects.get(id=channel.id)
        self.assertTrue(channel.deleted)
        self.assertEqual(1, channel.deletion_history.filter(actor=user).count())

    def test_cannot_delete_channel(self):
        user = testdata.user()
        channel = models.Channel.objects.create(
            actor_id=user.id, **self.channel_metadata
        )

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
        channel1 = models.Channel.objects.create(
            actor_id=user.id, **self.channel_metadata
        )
        channel1.editors.add(user)

        channel2 = models.Channel.objects.create(
            actor_id=user.id, **self.channel_metadata
        )
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
        channel1 = models.Channel.objects.create(
            actor_id=user.id, **self.channel_metadata
        )
        channel1.editors.add(user)
        channel2 = models.Channel.objects.create(
            actor_id=user.id, **self.channel_metadata
        )

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
            sync_channel_mock.reset_mock()
            args = [channel.id, False, False, False, False]
            args[i] = True

            response = self.sync_changes([generate_sync_channel_event(*args)])

            self.assertEqual(response.status_code, 200)
            sync_channel_mock.assert_called_once()
            self.assertEqual(sync_channel_mock.call_args.args[i], True)

    def test_deploy_channel_event(self):
        channel = testdata.channel()
        user = testdata.user()
        channel.editors.add(user)
        self.client.force_authenticate(user)  # This will skip all authentication checks
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
            [generate_deploy_channel_event(channel.id, user.id)]
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
        self.client.force_authenticate(user)  # This will skip all authentication checks
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
            [generate_deploy_channel_event(channel.id, user.id)]
        )
        # Should raise validation error as staging tree was set to NONE
        self.assertEqual(len(response.json()["errors"]), 1, response.content)
        modified_channel = models.Channel.objects.get(id=channel.id)
        self.assertNotEqual(modified_channel.main_tree, channel.staging_tree)
        self.assertNotEqual(modified_channel.previous_tree, channel.main_tree)

    def test_publish_does_not_make_publishable(self):
        user = testdata.user()
        channel = models.Channel.objects.create(
            actor_id=user.id, **self.channel_metadata
        )
        channel.editors.add(user)

        self.sync_changes([generate_publish_channel_event(channel.id)])

        self.assertEqual(_unpublished_changes_query(channel).count(), 0)

    def test_publish_next(self):
        channel = testdata.channel()
        user = testdata.user()
        channel.editors.add(user)
        self.client.force_authenticate(user)  # This will skip all authentication checks

        channel.staging_tree = testdata.tree()
        node = testdata.node({"kind_id": "video", "title": "title", "children": []})
        node.complete = True
        node.parent = channel.staging_tree
        node.save()
        channel.staging_tree.save()
        channel.save()
        self.assertEqual(channel.staging_tree.published, False)

        response = self.sync_changes([generate_publish_next_event(channel.id)])

        self.assertEqual(response.status_code, 200)
        modified_channel = models.Channel.objects.get(id=channel.id)
        self.assertEqual(modified_channel.staging_tree.published, True)

    def test_publish_next_with_incomplete_staging_tree(self):
        channel = testdata.channel()
        user = testdata.user()
        channel.editors.add(user)
        self.client.force_authenticate(user)  # This will skip all authentication checks

        channel.staging_tree = cc.ContentNode(
            kind_id=content_kinds.TOPIC, title="test", node_id="aaa"
        )
        channel.staging_tree.save()
        channel.save()
        self.assertEqual(channel.staging_tree.published, False)

        response = self.sync_changes([generate_publish_next_event(channel.id)])

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            "Channel is not ready to be published"
            in response.json()["errors"][0]["errors"][0]
        )
        modified_channel = models.Channel.objects.get(id=channel.id)
        self.assertEqual(modified_channel.staging_tree.published, False)


class CRUDTestCase(StudioAPITestCase):
    @property
    def channel_metadata(self):
        return {
            "name": "Aron's cool channel",
            "id": uuid.uuid4().hex,
            "description": "coolest channel this side of the Pacific",
        }

    def test_fetch_channel_for_admin(self):
        user = testdata.user()
        channel = models.Channel.objects.create(
            actor_id=user.id, **self.channel_metadata
        )
        user.is_admin = True
        user.save()
        self.client.force_authenticate(user=user)
        response = self.client.get(
            reverse("channel-detail", kwargs={"pk": channel.id}),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_fetch_admin_channels_invalid_filter(self):
        user = testdata.user()
        models.Channel.objects.create(actor_id=user.id, **self.channel_metadata)
        user.is_admin = True
        user.is_staff = True
        user.save()
        self.client.force_authenticate(user=user)
        response = self.client.get(
            reverse("admin-channels-list") + "?public=true&page_size=25&edit=true",
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_create_channel(self):
        user = testdata.user()
        self.client.force_authenticate(user=user)
        channel = self.channel_metadata
        response = self.client.post(
            reverse("channel-list"),
            channel,
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        try:
            models.Channel.objects.get(id=channel["id"])
        except models.Channel.DoesNotExist:
            self.fail("Channel was not created")

    def test_update_channel(self):
        user = testdata.user()
        channel = models.Channel.objects.create(
            actor_id=user.id, **self.channel_metadata
        )
        channel.editors.add(user)
        new_name = "This is not the old name"

        self.client.force_authenticate(user=user)
        response = self.client.patch(
            reverse("channel-detail", kwargs={"pk": channel.id}),
            {"name": new_name},
            format="json",
        )
        self.assertEqual(response.status_code, 405, response.content)

    def test_delete_channel(self):
        user = testdata.user()
        channel = models.Channel.objects.create(
            actor_id=user.id, **self.channel_metadata
        )
        channel.editors.add(user)

        self.client.force_authenticate(user=user)
        response = self.client.delete(
            reverse("channel-detail", kwargs={"pk": channel.id})
        )
        self.assertEqual(response.status_code, 204, response.content)
        channel = models.Channel.objects.get(id=channel.id)
        self.assertTrue(channel.deleted)
        self.assertEqual(1, channel.deletion_history.filter(actor=user).count())

    def test_admin_restore_channel(self):
        user = testdata.user()
        user.is_admin = True
        user.is_staff = True
        user.save()
        channel = models.Channel.objects.create(
            actor_id=user.id, **self.channel_metadata
        )
        channel.editors.add(user)
        channel.deleted = True
        channel.save(actor_id=user.id)

        self.client.force_authenticate(user=user)
        response = self.client.patch(
            reverse("admin-channels-detail", kwargs={"pk": channel.id}),
            {"deleted": False},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        channel = models.Channel.objects.get(id=channel.id)
        self.assertFalse(channel.deleted)
        self.assertEqual(
            1,
            channel.history.filter(actor=user, action=channel_history.RECOVERY).count(),
        )


class UnpublishedChangesQueryTestCase(StudioAPITestCase):
    def test_unpublished_changes_query_with_channel_object(self):
        channel = testdata.channel()
        user = testdata.user()
        models.Change.create_change(
            generate_update_event(
                channel.id, CHANNEL, {"name": "new name"}, channel_id=channel.id
            ),
            created_by_id=user.id,
        )
        models.Change.create_change(
            generate_publish_channel_event(channel.id), created_by_id=user.id
        )
        models.Change.create_change(
            generate_update_event(
                channel.id, CHANNEL, {"name": "new name 2"}, channel_id=channel.id
            ),
            created_by_id=user.id,
        )

        queryset = _unpublished_changes_query(channel)
        self.assertEqual(queryset.count(), 1)
        self.assertEqual(queryset[0].kwargs["mods"]["name"], "new name 2")

    def test_unpublished_changes_query_with_channel_object_none_since_publish(self):
        channel = testdata.channel()
        user = testdata.user()
        models.Change.create_change(
            generate_update_event(
                channel.id, CHANNEL, {"name": "new name"}, channel_id=channel.id
            ),
            created_by_id=user.id,
        )
        models.Change.create_change(
            generate_update_event(
                channel.id, CHANNEL, {"name": "new name 2"}, channel_id=channel.id
            ),
            created_by_id=user.id,
        )
        models.Change.create_change(
            generate_publish_channel_event(channel.id), created_by_id=user.id
        )

        queryset = _unpublished_changes_query(channel)
        self.assertEqual(queryset.count(), 0)

    def test_unpublished_changes_query_with_channel_object_no_publishable_since_publish(
        self,
    ):
        channel = testdata.channel()
        user = testdata.user()
        models.Change.create_change(
            generate_update_event(
                channel.id, CHANNEL, {"name": "new name"}, channel_id=channel.id
            ),
            created_by_id=user.id,
        )
        models.Change.create_change(
            generate_publish_channel_event(channel.id), created_by_id=user.id
        )
        models.Change.create_change(
            generate_update_event(
                channel.id, CHANNEL, {"name": "new name 2"}, channel_id=channel.id
            ),
            created_by_id=user.id,
            unpublishable=True,
        )

        queryset = _unpublished_changes_query(channel)
        self.assertEqual(queryset.count(), 0)

    def test_unpublished_changes_query_with_channel_object_no_publishable_since_publish_if_publish_fails_through_error(
        self,
    ):
        channel = testdata.channel()
        user = testdata.user()
        channel.main_tree = None
        channel.save()
        models.Change.create_change(
            generate_publish_channel_event(channel.id), created_by_id=user.id
        )

        queryset = _unpublished_changes_query(channel)
        self.assertEqual(queryset.count(), 0)

    def test_unpublished_changes_query_with_channel_object_no_publishable_since_publish_if_publish_fails_because_incomplete(
        self,
    ):
        channel = testdata.channel()
        user = testdata.user()
        channel.main_tree.complete = False
        channel.save()
        models.Change.create_change(
            generate_publish_channel_event(channel.id), created_by_id=user.id
        )

        queryset = _unpublished_changes_query(channel)
        self.assertEqual(queryset.count(), 0)

    def test_unpublished_changes_query_with_outerref(self):
        channel = testdata.channel()
        user = testdata.user()
        models.Change.create_change(
            generate_update_event(
                channel.id, CHANNEL, {"name": "new name"}, channel_id=channel.id
            ),
            created_by_id=user.id,
        )
        models.Change.create_change(
            generate_publish_channel_event(channel.id), created_by_id=user.id
        )
        models.Change.create_change(
            generate_update_event(
                channel.id, CHANNEL, {"name": "new name 2"}, channel_id=channel.id
            ),
            created_by_id=user.id,
        )

        outer_ref = OuterRef("id")
        unpublished_changes = _unpublished_changes_query(outer_ref)
        channels = models.Channel.objects.filter(pk=channel.pk).annotate(
            unpublished_changes=Exists(unpublished_changes)
        )
        self.assertTrue(channels[0].unpublished_changes)

    def test_unpublished_changes_query_with_outerref_none_since_publish(self):
        channel = testdata.channel()
        user = testdata.user()
        models.Change.create_change(
            generate_update_event(
                channel.id, CHANNEL, {"name": "new name"}, channel_id=channel.id
            ),
            created_by_id=user.id,
        )
        models.Change.create_change(
            generate_update_event(
                channel.id, CHANNEL, {"name": "new name 2"}, channel_id=channel.id
            ),
            created_by_id=user.id,
        )
        models.Change.create_change(
            generate_publish_channel_event(channel.id), created_by_id=user.id
        )

        outer_ref = OuterRef("id")
        unpublished_changes = _unpublished_changes_query(outer_ref)
        channels = models.Channel.objects.filter(pk=channel.pk).annotate(
            unpublished_changes=Exists(unpublished_changes)
        )
        self.assertFalse(channels[0].unpublished_changes)

    def test_unpublished_changes_query_with_outerref_no_publishable_since_publish(self):
        channel = testdata.channel()
        user = testdata.user()
        models.Change.create_change(
            generate_update_event(
                channel.id, CHANNEL, {"name": "new name"}, channel_id=channel.id
            ),
            created_by_id=user.id,
        )
        models.Change.create_change(
            generate_publish_channel_event(channel.id), created_by_id=user.id
        )
        models.Change.create_change(
            generate_update_event(
                channel.id, CHANNEL, {"name": "new name 2"}, channel_id=channel.id
            ),
            created_by_id=user.id,
            unpublishable=True,
        )

        outer_ref = OuterRef("id")
        unpublished_changes = _unpublished_changes_query(outer_ref)
        channels = models.Channel.objects.filter(pk=channel.pk).annotate(
            unpublished_changes=Exists(unpublished_changes)
        )
        self.assertFalse(channels[0].unpublished_changes)

    def test_unpublished_changes_query_no_publishable_since_publish_if_publish_fails_through_error(
        self,
    ):
        channel = testdata.channel()
        user = testdata.user()
        channel.main_tree = None
        channel.save()
        models.Change.create_change(
            generate_publish_channel_event(channel.id), created_by_id=user.id
        )

        outer_ref = OuterRef("id")
        unpublished_changes = _unpublished_changes_query(outer_ref)
        channels = models.Channel.objects.filter(pk=channel.pk).annotate(
            unpublished_changes=Exists(unpublished_changes)
        )
        self.assertFalse(channels[0].unpublished_changes)

    def test_unpublished_changes_query_no_publishable_since_publish_if_publish_fails_because_incomplete(
        self,
    ):
        channel = testdata.channel()
        user = testdata.user()
        channel.main_tree.complete = False
        channel.save()
        models.Change.create_change(
            generate_publish_channel_event(channel.id), created_by_id=user.id
        )

        outer_ref = OuterRef("id")
        unpublished_changes = _unpublished_changes_query(outer_ref)
        channels = models.Channel.objects.filter(pk=channel.pk).annotate(
            unpublished_changes=Exists(unpublished_changes)
        )
        self.assertFalse(channels[0].unpublished_changes)


class ChannelLanguageTestCase(StudioAPITestCase):
    def setUp(self):
        super(ChannelLanguageTestCase, self).setUp()
        self.channel = testdata.channel()
        self.channel.language_id = "en"
        self.channel.save()

        self.channel_id = self.channel.id
        self.node_id = "00000000000000000000000000000003"
        self.public_node = PublicContentNode.objects.create(
            id=uuid.UUID(self.node_id),
            title="Video 1",
            content_id=uuid.uuid4(),
            channel_id=uuid.UUID(self.channel.id),
            lang_id="en",
        )

    def test_channel_language_exists_valid_channel(self):

        ContentNode.objects.filter(node_id=self.public_node.id).update(language_id="en")
        response = self._perform_action("channel-language-exists", self.channel.id)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.json()["exists"])

    def test_channel_language_doesnt_exists_valid_channel(self):

        PublicContentNode.objects.filter(id=self.public_node.id).update(lang_id="es")
        response = self._perform_action("channel-language-exists", self.channel.id)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(response.json()["exists"])

    def test_channel_language_exists_invalid_channel(self):

        response = self._perform_action("channel-language-exists", "unknown_channel_id")
        self.assertEqual(response.status_code, 404, response.content)

    def test_channel_language_exists_invalid_request(self):

        response = self._perform_action("channel-language-exists", None)
        self.assertEqual(response.status_code, 404, response.content)

    def test_get_languages_in_channel_success_languages(self):
        new_language = "swa"
        self.channel.language_id = new_language
        self.channel.save()
        PublicContentNode.objects.filter(id=self.public_node.id).update(
            lang_id=new_language
        )
        ContentNode.objects.filter(node_id=self.public_node.id).update(
            language_id=new_language
        )

        response = self._perform_action("channel-languages", self.channel.id)
        languages = response.json()["languages"]

        self.assertEqual(response.status_code, 200, response.content)
        self.assertListEqual(languages, [new_language])

    def test_get_languages_in_channel_success_channel_language_excluded(self):
        new_language = "fr"
        channel_lang = "en"
        self.channel.language_id = channel_lang
        self.channel.save()
        PublicContentNode.objects.filter(id=self.public_node.id).update(
            lang_id=new_language
        )
        ContentNode.objects.filter(node_id=self.public_node.id).update(
            language_id=new_language
        )

        response = self._perform_action("channel-languages", self.channel.id)
        languages = response.json()["languages"]

        self.assertEqual(response.status_code, 200, response.content)
        self.assertListEqual(languages, [new_language])
        self.assertFalse(channel_lang in languages)

    def test_get_languages_in_channel_success_no_languages(self):

        response = self._perform_action("channel-languages", self.channel.id)
        languages = response.json()["languages"]

        self.assertEqual(response.status_code, 200, response.content)
        self.assertListEqual(languages, [])

    def test_get_languages_in_channel_invalid_request(self):

        response = self._perform_action("channel-languages", None)
        self.assertEqual(response.status_code, 404, response.content)

    def _perform_action(self, url_path, channel_id):
        user = testdata.user()
        self.client.force_authenticate(user=user)
        response = self.client.get(
            reverse(url_path, kwargs={"pk": channel_id}), format="json"
        )
        return response


class GetPublishedDataTestCase(StudioAPITestCase):
    def setUp(self):
        super().setUp()

        self.editor_user = testdata.user(email="editor@user.com")
        self.forbidden_user = testdata.user(email="forbidden@user.com")

        self.channel = testdata.channel()
        self.channel.editors.add(self.editor_user)

        self.channel.published_data = {
            "key1": "value1",
            "key2": "value2",
        }
        self.channel.save()

    def test_get_published_data__is_editor(self):
        self.client.force_authenticate(user=self.editor_user)

        response = self.client.get(
            reverse("channel-published-data", kwargs={"pk": self.channel.id}),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json(), self.channel.published_data)

    def test_get_published_data__is_admin(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(
            reverse("channel-published-data", kwargs={"pk": self.channel.id}),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json(), self.channel.published_data)

    def test_get_published_data__is_forbidden_user(self):
        self.client.force_authenticate(user=self.forbidden_user)

        response = self.client.get(
            reverse("channel-published-data", kwargs={"pk": self.channel.id}),
            format="json",
        )
        self.assertEqual(response.status_code, 404, response.content)
