from __future__ import absolute_import

import uuid

from django.core.urlresolvers import reverse

from contentcuration import models
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.viewsets.sync.constants import CHANNEL
from contentcuration.viewsets.sync.utils import generate_create_event
from contentcuration.viewsets.sync.utils import generate_delete_event
from contentcuration.viewsets.sync.utils import generate_update_event


class SyncTestCase(StudioAPITestCase):
    @property
    def sync_url(self):
        return reverse("sync")

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
        response = self.client.post(
            self.sync_url,
            [generate_create_event(channel["id"], CHANNEL, channel)],
            format="json",
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
        response = self.client.post(
            self.sync_url,
            [
                generate_create_event(channel1["id"], CHANNEL, channel1),
                generate_create_event(channel2["id"], CHANNEL, channel2),
            ],
            format="json",
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
        response = self.client.post(
            self.sync_url,
            [generate_update_event(channel.id, CHANNEL, {"name": new_name})],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(models.Channel.objects.get(id=channel.id).name, new_name)

    def test_update_channel_thumbnail_encoding(self):
        user = testdata.user()
        channel = models.Channel.objects.create(**self.channel_metadata)
        channel.editors.add(user)
        new_encoding = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQA"
        self.client.force_authenticate(user=user)
        response = self.client.post(
            self.sync_url,
            [generate_update_event(channel.id, CHANNEL, {
                "thumbnail_encoding.base64": new_encoding,
                "thumbnail_encoding.orientation": 1,
                "thumbnail_encoding.scale": 0.73602189113443,
                "thumbnail_encoding.startX": -96.66631072431669,
                "thumbnail_encoding.startY": -335.58116356397636,
            })],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(models.Channel.objects.get(id=channel.id).thumbnail_encoding["base64"], new_encoding)

    def test_cannot_update_channel(self):
        user = testdata.user()
        channel = models.Channel.objects.create(**self.channel_metadata)
        new_name = "This is not the old name"

        self.client.force_authenticate(user=user)
        with self.settings(TEST_ENV=False):
            # Override test env here to check what will happen in production
            response = self.client.post(
                self.sync_url,
                [generate_update_event(channel.id, CHANNEL, {"name": new_name})],
                format="json",
            )
        self.assertEqual(response.status_code, 400, response.content)
        self.assertNotEqual(models.Channel.objects.get(id=channel.id).name, new_name)

    def test_viewer_cannot_update_channel(self):
        user = testdata.user()
        channel = models.Channel.objects.create(**self.channel_metadata)
        channel.viewers.add(user)
        new_name = "This is not the old name"

        self.client.force_authenticate(user=user)
        with self.settings(TEST_ENV=False):
            # Override test env here to check what will happen in production
            response = self.client.post(
                self.sync_url,
                [generate_update_event(channel.id, CHANNEL, {"name": new_name})],
                format="json",
            )
        self.assertEqual(response.status_code, 400, response.content)
        self.assertNotEqual(models.Channel.objects.get(id=channel.id).name, new_name)

    def test_update_channel_defaults(self):
        user = testdata.user()
        channel = models.Channel.objects.create(**self.channel_metadata)
        channel.editors.add(user)
        author = "This is not the old author"

        self.client.force_authenticate(user=user)
        response = self.client.post(
            self.sync_url,
            [
                generate_update_event(
                    channel.id, CHANNEL, {"content_defaults.author": author}
                )
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.Channel.objects.get(id=channel.id).content_defaults["author"], author
        )

        aggregator = "This is not the old aggregator"

        self.client.force_authenticate(user=user)
        response = self.client.post(
            self.sync_url,
            [
                generate_update_event(
                    channel.id, CHANNEL, {"content_defaults.aggregator": aggregator}
                )
            ],
            format="json",
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
        response = self.client.post(
            self.sync_url,
            [
                generate_update_event(channel1.id, CHANNEL, {"name": new_name}),
                generate_update_event(channel2.id, CHANNEL, {"name": new_name}),
            ],
            format="json",
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
        with self.settings(TEST_ENV=False):
            # Override test env here to check what will happen in production
            response = self.client.post(
                self.sync_url,
                [
                    generate_update_event(channel1.id, CHANNEL, {"name": new_name}),
                    generate_update_event(channel2.id, CHANNEL, {"name": new_name}),
                ],
                format="json",
            )
        self.assertEqual(response.status_code, 207, response.content)
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
        with self.settings(TEST_ENV=False):
            # Override test env here to check what will happen in production
            response = self.client.post(
                self.sync_url,
                [
                    generate_update_event(channel1.id, CHANNEL, {"name": new_name}),
                    generate_update_event(channel2.id, CHANNEL, {"name": new_name}),
                ],
                format="json",
            )
        self.assertEqual(response.status_code, 207, response.content)
        self.assertEqual(models.Channel.objects.get(id=channel1.id).name, new_name)
        self.assertNotEqual(models.Channel.objects.get(id=channel2.id).name, new_name)

    def test_delete_channel(self):
        user = testdata.user()
        channel = models.Channel.objects.create(**self.channel_metadata)
        channel.editors.add(user)

        self.client.force_authenticate(user=user)
        response = self.client.post(
            self.sync_url, [generate_delete_event(channel.id, CHANNEL)], format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.Channel.objects.get(id=channel.id)
            self.fail("Channel was not deleted")
        except models.Channel.DoesNotExist:
            pass

    def test_cannot_delete_channel(self):
        user = testdata.user()
        channel = models.Channel.objects.create(**self.channel_metadata)

        self.client.force_authenticate(user=user)
        with self.settings(TEST_ENV=False):
            # Override test env here to check what will happen in production
            response = self.client.post(
                self.sync_url,
                [generate_delete_event(channel.id, CHANNEL)],
                format="json",
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
        response = self.client.post(
            self.sync_url,
            [
                generate_delete_event(channel1.id, CHANNEL),
                generate_delete_event(channel2.id, CHANNEL),
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.Channel.objects.get(id=channel1.id)
            self.fail("Channel 1 was not deleted")
        except models.Channel.DoesNotExist:
            pass

        try:
            models.Channel.objects.get(id=channel2.id)
            self.fail("Channel 2 was not deleted")
        except models.Channel.DoesNotExist:
            pass

    def test_cannot_delete_some_channels(self):
        user = testdata.user()
        channel1 = models.Channel.objects.create(**self.channel_metadata)
        channel1.editors.add(user)
        channel2 = models.Channel.objects.create(**self.channel_metadata)

        self.client.force_authenticate(user=user)
        with self.settings(TEST_ENV=False):
            # Override test env here to check what will happen in production
            response = self.client.post(
                self.sync_url,
                [
                    generate_delete_event(channel1.id, CHANNEL),
                    generate_delete_event(channel2.id, CHANNEL),
                ],
                format="json",
            )
        # Returns a 200 as, as far as the frontend is concerned
        # the operation is done.
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.Channel.objects.get(id=channel1.id)
            self.fail("Channel 1 was not deleted")
        except models.Channel.DoesNotExist:
            pass

        try:
            models.Channel.objects.get(id=channel2.id)
        except models.Channel.DoesNotExist:
            self.fail("Channel 2 was deleted")


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
        try:
            models.Channel.objects.get(id=channel.id)
            self.fail("Channel was not deleted")
        except models.Channel.DoesNotExist:
            pass
