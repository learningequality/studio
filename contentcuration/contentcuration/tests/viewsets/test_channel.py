import uuid

import mock
from django.db.models import Exists
from django.db.models import OuterRef
from django.urls import reverse
from kolibri_public.models import ContentNode as PublicContentNode
from le_utils.constants import content_kinds
from mock import Mock
from mock import patch

from contentcuration import models
from contentcuration import models as cc
from contentcuration.constants import channel_history
from contentcuration.constants import community_library_submission
from contentcuration.models import Change
from contentcuration.models import CommunityLibrarySubmission
from contentcuration.models import ContentNode
from contentcuration.models import Country
from contentcuration.tasks import apply_channel_changes_task
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.tests.helpers import reverse_with_query
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
from contentcuration.viewsets.sync.utils import (
    generate_added_to_community_library_event,
)


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
        self.assertEqual(modified_channel.staging_tree.published, False)

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

        response = self.sync_changes(
            [generate_publish_next_event(channel.id, use_staging_tree=True)]
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            "Channel is not ready to be published"
            in response.json()["errors"][0]["errors"][0]
        )
        modified_channel = models.Channel.objects.get(id=channel.id)
        self.assertEqual(modified_channel.staging_tree.published, False)

    def test_sync_added_to_community_library_change(self):
        # Syncing the change from the frontend should be disallowed
        self.client.force_authenticate(self.admin_user)

        channel = testdata.channel()
        channel.version = 1
        channel.public = True
        channel.save()

        added_to_community_library_change = generate_added_to_community_library_event(
            key=channel.id,
            channel_version=1,
        )
        response = self.sync_changes([added_to_community_library_change])

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.json()["allowed"]), 0, response.content)
        self.assertEqual(len(response.json()["disallowed"]), 1, response.content)

    @mock.patch("contentcuration.utils.publish.ensure_versioned_database_exists")
    @mock.patch("contentcuration.viewsets.channel.export_channel_to_kolibri_public")
    def test_process_added_to_community_library_change(
        self, mock_export_func, mock_ensure_db_exists
    ):
        # Creating the change on the backend should be supported
        self.client.force_authenticate(self.admin_user)

        editor_user = testdata.user("channel@editor.com")

        channel = testdata.channel()
        channel.version = 2
        channel.public = False
        channel.editors.add(editor_user)
        channel.save()

        current_live_submission = CommunityLibrarySubmission.objects.create(
            channel=channel,
            channel_version=1,
            author=editor_user,
            status=community_library_submission.STATUS_LIVE,
        )
        new_submission = CommunityLibrarySubmission.objects.create(
            channel=channel,
            channel_version=2,
            author=editor_user,
            status=community_library_submission.STATUS_APPROVED,
        )

        categories = {
            "category1": True,
            "category2": True,
        }

        country1 = Country.objects.create(code="C1", name="Country 1")
        country2 = Country.objects.create(code="C2", name="Country 2")
        countries = [country1, country2]
        country_codes = [country.code for country in countries]

        added_to_community_library_change = generate_added_to_community_library_event(
            key=channel.id,
            channel_version=2,
            categories=categories,
            country_codes=country_codes,
        )
        Change.create_change(
            added_to_community_library_change, created_by_id=self.admin_user.id
        )

        # This task will run immediately thanks to SyncTestMixin
        apply_channel_changes_task.fetch_or_enqueue(
            user=self.admin_user,
            channel_id=channel.id,
        )

        # We cannot easily use the assert_called_once_with method here
        # because we are not checking countries for strict equality,
        # so we need to check the call arguments manually
        mock_export_func.assert_called_once()

        (call_args, call_kwargs) = mock_export_func.call_args
        self.assertEqual(len(call_args), 0)
        self.assertCountEqual(
            call_kwargs.keys(),
            [
                "channel_id",
                "channel_version",
                "categories",
                "countries",
                "public",
            ],
        )
        self.assertEqual(call_kwargs["channel_id"], channel.id)
        self.assertEqual(call_kwargs["channel_version"], 2)
        self.assertCountEqual(call_kwargs["categories"], categories.keys())

        # The countries argument used when creating the mapper is in fact
        # not a list, but a QuerySet, but it contains the same elements
        self.assertCountEqual(call_kwargs["countries"], countries)
        self.assertEqual(call_kwargs["public"], False)

        # Check that the current submission became the live one
        current_live_submission.refresh_from_db()
        new_submission.refresh_from_db()
        self.assertEqual(
            current_live_submission.status,
            community_library_submission.STATUS_APPROVED,
        )
        self.assertEqual(
            new_submission.status,
            community_library_submission.STATUS_LIVE,
        )


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

    def test_admin_channel_detail__latest_community_library_submission__exists(self):
        older_submission = testdata.community_library_submission()
        older_submission.channel.version = 2
        older_submission.channel_version = 1
        older_submission.status = community_library_submission.STATUS_LIVE
        older_submission.channel.save()
        older_submission.save()

        latest_submission = CommunityLibrarySubmission.objects.create(
            channel=older_submission.channel,
            channel_version=2,
            author=older_submission.author,
        )

        self.client.force_authenticate(self.admin_user)
        response = self.client.get(
            reverse(
                "admin-channels-detail", kwargs={"pk": older_submission.channel.id}
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            response.data["latest_community_library_submission_id"],
            latest_submission.id,
        )
        self.assertEqual(
            response.data["latest_community_library_submission_status"],
            community_library_submission.STATUS_PENDING,
        )
        self.assertTrue(response.data["has_any_live_community_library_submission"])

    def test_admin_channel_detail__latest_community_library_submission__none_exist(
        self,
    ):
        channel = testdata.channel()

        self.client.force_authenticate(self.admin_user)
        response = self.client.get(
            reverse("admin-channels-detail", kwargs={"pk": channel.id}),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIsNone(response.data["latest_community_library_submission_id"])
        self.assertIsNone(response.data["latest_community_library_submission_status"])
        self.assertFalse(response.data["has_any_live_community_library_submission"])

    def test_admin_channel_filter__latest_community_library_submission_status__any(
        self,
    ):
        self.client.force_authenticate(user=self.admin_user)

        submission = testdata.community_library_submission()

        response = self.client.get(
            reverse_with_query(
                "admin-channels-list",
                query={
                    "id__in": submission.channel.id,
                },
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.data), 1)

    def test_admin_channel_filter__latest_community_library_submission_status__multiple(
        self,
    ):
        self.client.force_authenticate(user=self.admin_user)

        submission1 = testdata.community_library_submission()
        submission1.status = community_library_submission.STATUS_LIVE
        submission1.save()

        submission2 = testdata.community_library_submission()
        submission2.status = community_library_submission.STATUS_PENDING
        submission2.save()

        submission3 = testdata.community_library_submission()
        submission3.status = community_library_submission.STATUS_APPROVED
        submission3.save()

        response = self.client.get(
            reverse_with_query(
                "admin-channels-list",
                query=[
                    (
                        "latest_community_library_submission_status",
                        community_library_submission.STATUS_LIVE,
                    ),
                    (
                        "latest_community_library_submission_status",
                        community_library_submission.STATUS_PENDING,
                    ),
                ],
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertCountEqual(
            [ch["id"] for ch in response.data],
            [
                submission1.channel.id,
                submission2.channel.id,
            ],
        )

    def test_admin_channel_filter__community_library_live(self):
        self.client.force_authenticate(user=self.admin_user)

        submission1 = testdata.community_library_submission()
        submission1.channel.version = 2
        submission1.channel.save()
        submission1.status = community_library_submission.STATUS_LIVE
        submission1.channel_version = 1
        submission1.save()

        CommunityLibrarySubmission.objects.create(
            channel=submission1.channel,
            channel_version=2,
            author=submission1.author,
            status=community_library_submission.STATUS_PENDING,
        )

        other_channel_submission = testdata.community_library_submission()
        other_channel_submission.status = community_library_submission.STATUS_PENDING
        other_channel_submission.save()

        response = self.client.get(
            reverse_with_query(
                "admin-channels-list",
                query={"community_library_live": True},
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertCountEqual(
            [ch["id"] for ch in response.data],
            [submission1.channel.id],
        )

    def test_has_community_library_submission_endpoint(self):
        """Test the on-demand has_community_library_submission endpoint"""
        user = testdata.user()
        channel_with_submission = testdata.channel()
        channel_with_submission.editors.add(user)
        channel_with_submission.version = 1
        channel_with_submission.save()
        submission = testdata.community_library_submission()
        submission.channel = channel_with_submission
        submission.author = user
        submission.channel_version = channel_with_submission.version
        submission.save()

        channel_without_submission = testdata.channel()
        channel_without_submission.editors.add(user)

        self.client.force_authenticate(user=user)

        response = self.client.get(
            reverse(
                "channel-has-community-library-submission",
                kwargs={"pk": channel_with_submission.id},
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(response.data["has_community_library_submission"])

        response = self.client.get(
            reverse(
                "channel-has-community-library-submission",
                kwargs={"pk": channel_without_submission.id},
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(response.data["has_community_library_submission"])

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

    def test_published_data_in_channel_list(self):
        """Test that published_data is included in channel list response"""
        self.client.force_authenticate(user=self.editor_user)

        response = self.client.get(
            reverse("channel-list") + "?edit=true", format="json"
        )
        self.assertEqual(response.status_code, 200, response.content)

        response_data = response.json()
        channels = (
            response_data
            if isinstance(response_data, list)
            else response_data["results"]
        )
        channel = next((c for c in channels if c["id"] == self.channel.id), None)
        self.assertIsNotNone(channel)
        self.assertIn("published_data", channel)
        self.assertEqual(channel["published_data"], self.channel.published_data)


class AuditLicensesActionTestCase(StudioAPITestCase):
    def setUp(self):
        super().setUp()

        self.editor_user = testdata.user(email="editor@user.com")
        self.forbidden_user = testdata.user(email="forbidden@user.com")
        self.admin_user = self.admin_user

        self.channel = testdata.channel()
        self.channel.editors.add(self.editor_user)
        # Mark channel as published
        self.channel.main_tree.published = True
        self.channel.main_tree.save()
        self.channel.version = 1
        self.channel.save()

    def test_audit_licenses__is_editor(self):
        """Test that an editor can trigger license audit"""
        from contentcuration.tasks import audit_channel_licenses_task

        self.client.force_authenticate(user=self.editor_user)

        with patch.object(
            audit_channel_licenses_task, "fetch_or_enqueue"
        ) as mock_enqueue:
            mock_async_result = Mock()
            mock_async_result.task_id = "test-task-id-123"
            mock_enqueue.return_value = mock_async_result

            response = self.client.post(
                reverse("channel-audit-licenses", kwargs={"pk": self.channel.id}),
                format="json",
            )

            self.assertEqual(response.status_code, 200, response.content)
            data = response.json()
            self.assertIn("task_id", data)
            self.assertEqual(data["task_id"], "test-task-id-123")
            mock_enqueue.assert_called_once()

    def test_audit_licenses__is_admin(self):
        """Test that an admin can trigger license audit"""
        from contentcuration.tasks import audit_channel_licenses_task

        self.client.force_authenticate(user=self.admin_user)

        with patch.object(
            audit_channel_licenses_task, "fetch_or_enqueue"
        ) as mock_enqueue:
            mock_async_result = Mock()
            mock_async_result.task_id = "test-task-id-456"
            mock_enqueue.return_value = mock_async_result

            response = self.client.post(
                reverse("channel-audit-licenses", kwargs={"pk": self.channel.id}),
                format="json",
            )

            self.assertEqual(response.status_code, 200, response.content)
            data = response.json()
            self.assertIn("task_id", data)

    def test_audit_licenses__is_forbidden_user(self):
        """Test that a non-editor cannot trigger license audit"""
        self.client.force_authenticate(user=self.forbidden_user)

        response = self.client.post(
            reverse("channel-audit-licenses", kwargs={"pk": self.channel.id}),
            format="json",
        )

        self.assertEqual(response.status_code, 404, response.content)

    def test_audit_licenses__channel_not_published(self):
        """Test that audit fails when channel is not published"""
        self.channel.main_tree.published = False
        self.channel.main_tree.save()

        self.client.force_authenticate(user=self.editor_user)

        response = self.client.post(
            reverse("channel-audit-licenses", kwargs={"pk": self.channel.id}),
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.content)
        response_data = response.json()
        error_message = (
            response_data["detail"]
            if isinstance(response_data, dict)
            else response_data[0]
        )
        self.assertIn("must be published", str(error_message))
