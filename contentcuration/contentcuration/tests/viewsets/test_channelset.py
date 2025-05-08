import uuid

from django.urls import reverse

from contentcuration import models
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.tests.viewsets.base import generate_create_event
from contentcuration.tests.viewsets.base import generate_delete_event
from contentcuration.tests.viewsets.base import generate_update_event
from contentcuration.tests.viewsets.base import SyncTestMixin
from contentcuration.viewsets.sync.constants import CHANNELSET


class SyncTestCase(SyncTestMixin, StudioAPITestCase):
    @property
    def channelset_metadata(self):
        return {
            "id": uuid.uuid4().hex,
            "channels": {self.channel.id: True},
            "name": "channel set test",
        }

    @property
    def channelset_db_metadata(self):
        return {
            "id": uuid.uuid4().hex,
            "name": "channel set test",
        }

    def setUp(self):
        super(SyncTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)

    def test_create_channelset(self):
        self.client.force_authenticate(user=self.user)
        channelset = self.channelset_metadata
        response = self.sync_changes(
            [
                generate_create_event(
                    channelset["id"], CHANNELSET, channelset, user_id=self.user.id
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.ChannelSet.objects.get(id=channelset["id"])
        except models.ChannelSet.DoesNotExist:
            self.fail("ChannelSet was not created")

    def test_create_channelsets(self):
        self.client.force_authenticate(user=self.user)
        channelset1 = self.channelset_metadata
        channelset2 = self.channelset_metadata
        response = self.sync_changes(
            [
                generate_create_event(
                    channelset1["id"], CHANNELSET, channelset1, user_id=self.user.id
                ),
                generate_create_event(
                    channelset2["id"], CHANNELSET, channelset2, user_id=self.user.id
                ),
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.ChannelSet.objects.get(id=channelset1["id"])
        except models.ChannelSet.DoesNotExist:
            self.fail("ChannelSet 1 was not created")

        try:
            models.ChannelSet.objects.get(id=channelset2["id"])
        except models.ChannelSet.DoesNotExist:
            self.fail("ChannelSet 2 was not created")

    def test_update_channelset(self):

        channelset = models.ChannelSet.objects.create(**self.channelset_db_metadata)
        channelset.editors.add(self.user)

        self.client.force_authenticate(user=self.user)
        response = self.sync_changes(
            [
                generate_update_event(
                    channelset.id, CHANNELSET, {"channels": {}}, user_id=self.user.id
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(
            models.ChannelSet.objects.get(id=channelset.id)
            .secret_token.channels.filter(pk=self.channel.id)
            .exists()
        )

    def test_update_channelsets(self):

        channelset1 = models.ChannelSet.objects.create(**self.channelset_db_metadata)
        channelset1.editors.add(self.user)
        channelset2 = models.ChannelSet.objects.create(**self.channelset_db_metadata)
        channelset2.editors.add(self.user)

        self.client.force_authenticate(user=self.user)
        response = self.sync_changes(
            [
                generate_update_event(
                    channelset1.id, CHANNELSET, {"channels": {}}, user_id=self.user.id
                ),
                generate_update_event(
                    channelset2.id, CHANNELSET, {"channels": {}}, user_id=self.user.id
                ),
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertFalse(
            models.ChannelSet.objects.get(id=channelset1.id)
            .secret_token.channels.filter(pk=self.channel.id)
            .exists()
        )
        self.assertFalse(
            models.ChannelSet.objects.get(id=channelset2.id)
            .secret_token.channels.filter(pk=self.channel.id)
            .exists()
        )

    def test_update_channelset_empty(self):

        channelset = models.ChannelSet.objects.create(**self.channelset_db_metadata)
        channelset.editors.add(self.user)
        self.client.force_authenticate(user=self.user)
        response = self.sync_changes(
            [
                generate_update_event(
                    channelset.id, CHANNELSET, {}, user_id=self.user.id
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_update_channelset_unwriteable_fields(self):

        channelset = models.ChannelSet.objects.create(**self.channelset_db_metadata)
        channelset.editors.add(self.user)
        self.client.force_authenticate(user=self.user)
        response = self.sync_changes(
            [
                generate_update_event(
                    channelset.id,
                    CHANNELSET,
                    {"not_a_field": "not_a_value"},
                    user_id=self.user.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_update_channelset_channels(self):
        channelset = models.ChannelSet.objects.create(**self.channelset_db_metadata)
        channelset.editors.add(self.user)

        channel1 = testdata.channel()

        channel1.public = True
        channel1.save()

        self.client.force_authenticate(user=self.user)
        response = self.sync_changes(
            [
                generate_update_event(
                    channelset.id,
                    CHANNELSET,
                    {"channels.{}".format(channel1.id): True},
                    user_id=self.user.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(
            models.ChannelSet.objects.get(id=channelset.id)
            .secret_token.channels.filter(id=channel1.id)
            .exists()
        )

        channel2 = testdata.channel()
        channel2.viewers.add(self.user)

        response = self.sync_changes(
            [
                generate_update_event(
                    channelset.id,
                    CHANNELSET,
                    {"channels.{}".format(channel2.id): True},
                    user_id=self.user.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(
            models.ChannelSet.objects.get(id=channelset.id)
            .secret_token.channels.filter(id=channel1.id)
            .exists()
        )
        self.assertTrue(
            models.ChannelSet.objects.get(id=channelset.id)
            .secret_token.channels.filter(id=channel2.id)
            .exists()
        )

        response = self.sync_changes(
            [
                generate_update_event(
                    channelset.id,
                    CHANNELSET,
                    {"channels.{}".format(channel2.id): None},
                    user_id=self.user.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertTrue(
            models.ChannelSet.objects.get(id=channelset.id)
            .secret_token.channels.filter(id=channel1.id)
            .exists()
        )
        self.assertFalse(
            models.ChannelSet.objects.get(id=channelset.id)
            .secret_token.channels.filter(id=channel2.id)
            .exists()
        )

    def test_update_channelset_channels_no_permission(self):
        channelset = models.ChannelSet.objects.create(**self.channelset_db_metadata)
        channelset.editors.add(self.user)

        channel1 = testdata.channel()

        channel1.save()

        self.client.force_authenticate(user=self.user)
        response = self.sync_changes(
            [
                generate_update_event(
                    channelset.id,
                    CHANNELSET,
                    {"channels.{}".format(channel1.id): True},
                    user_id=self.user.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.data["errors"]), 1, response.content)
        self.assertFalse(
            models.ChannelSet.objects.get(id=channelset.id)
            .secret_token.channels.filter(id=channel1.id)
            .exists()
        )

    def test_delete_channelset(self):

        channelset = models.ChannelSet.objects.create(**self.channelset_db_metadata)
        channelset.editors.add(self.user)

        self.client.force_authenticate(user=self.user)
        response = self.sync_changes(
            [generate_delete_event(channelset.id, CHANNELSET, user_id=self.user.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.ChannelSet.objects.get(id=channelset.id)
            self.fail("ChannelSet was not deleted")
        except models.ChannelSet.DoesNotExist:
            pass

    def test_delete_channelsets(self):
        channelset1 = models.ChannelSet.objects.create(**self.channelset_db_metadata)
        channelset2 = models.ChannelSet.objects.create(**self.channelset_db_metadata)
        channelset1.editors.add(self.user)
        channelset2.editors.add(self.user)

        self.client.force_authenticate(user=self.user)
        response = self.sync_changes(
            [
                generate_delete_event(channelset1.id, CHANNELSET, user_id=self.user.id),
                generate_delete_event(channelset2.id, CHANNELSET, user_id=self.user.id),
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.ChannelSet.objects.get(id=channelset1.id)
            self.fail("ChannelSet 1 was not deleted")
        except models.ChannelSet.DoesNotExist:
            pass

        try:
            models.ChannelSet.objects.get(id=channelset2.id)
            self.fail("ChannelSet 2 was not deleted")
        except models.ChannelSet.DoesNotExist:
            pass


class CRUDTestCase(StudioAPITestCase):
    @property
    def channelset_metadata(self):
        return {
            "id": uuid.uuid4().hex,
            "channels": {self.channel.id: True},
            "name": "channel set test",
        }

    @property
    def channelset_db_metadata(self):
        return {
            "id": uuid.uuid4().hex,
            "name": "channel set test",
        }

    def setUp(self):
        super(CRUDTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)

    def test_create_channelset(self):
        self.client.force_authenticate(user=self.user)
        channelset = self.channelset_metadata
        response = self.client.post(
            reverse("channelset-list"),
            channelset,
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
        try:
            models.ChannelSet.objects.get(id=channelset["id"])
        except models.ChannelSet.DoesNotExist:
            self.fail("ChannelSet was not created")

    def test_create_channelset_no_channel_permission(self):
        self.client.force_authenticate(user=self.user)
        new_channel = testdata.channel()
        channelset = self.channelset_metadata
        channelset["channels"] = {new_channel.id: True}
        response = self.client.post(
            reverse("channelset-list"),
            channelset,
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)

    def test_update_channelset(self):
        channelset = models.ChannelSet.objects.create(**self.channelset_db_metadata)
        channelset.editors.add(self.user)

        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            reverse("channelset-detail", kwargs={"pk": channelset.id}),
            {"channels": {self.channel.id: True}},
            format="json",
        )
        self.assertEqual(response.status_code, 405, response.content)

    def test_delete_channelset(self):
        channelset = models.ChannelSet.objects.create(**self.channelset_db_metadata)
        channelset.editors.add(self.user)

        self.client.force_authenticate(user=self.user)
        response = self.client.delete(
            reverse("channelset-detail", kwargs={"pk": channelset.id})
        )
        self.assertEqual(response.status_code, 405, response.content)
