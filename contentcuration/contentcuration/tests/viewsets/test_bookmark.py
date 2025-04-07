from django.urls import reverse

from contentcuration import models
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.tests.viewsets.base import generate_create_event
from contentcuration.tests.viewsets.base import generate_delete_event
from contentcuration.tests.viewsets.base import SyncTestMixin
from contentcuration.viewsets.sync.constants import BOOKMARK


class SyncTestCase(SyncTestMixin, StudioAPITestCase):

    @property
    def bookmark_metadata(self):
        return {
            "channel": self.channel.id,
        }

    @property
    def bookmark_db_metadata(self):
        return {
            "channel_id": self.channel.id,
            "user_id": self.user.id,
        }

    def setUp(self):
        super(SyncTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)
        self.channel2 = testdata.channel()
        self.channel2.editors.add(self.user)

    def test_create_bookmark(self):
        self.client.force_authenticate(user=self.user)
        bookmark = self.bookmark_metadata
        response = self.sync_changes(
            [
                generate_create_event(
                    bookmark["channel"],
                    BOOKMARK,
                    bookmark,
                    user_id=self.user.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.Channel.bookmarked_by.through.objects.get(
                user=self.user, channel_id=bookmark["channel"]
            )
        except models.Channel.bookmarked_by.through.DoesNotExist:
            self.fail("Bookmark was not created")

    def test_create_bookmarks(self):
        self.client.force_authenticate(user=self.user)
        bookmark1 = self.bookmark_metadata
        bookmark2 = self.bookmark_metadata
        bookmark2["channel"] = self.channel2.id
        response = self.sync_changes(
            [
                generate_create_event(
                    bookmark1["channel"],
                    BOOKMARK,
                    bookmark1,
                    user_id=self.user.id,
                ),
                generate_create_event(
                    bookmark2["channel"],
                    BOOKMARK,
                    bookmark2,
                    user_id=self.user.id,
                ),
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.Channel.bookmarked_by.through.objects.get(
                user=self.user, channel_id=bookmark1["channel"]
            )
        except models.Channel.bookmarked_by.through.DoesNotExist:
            self.fail("Bookmark 1 was not created")

        try:
            models.Channel.bookmarked_by.through.objects.get(
                user=self.user, channel_id=bookmark2["channel"]
            )
        except models.Channel.bookmarked_by.through.DoesNotExist:
            self.fail("Bookmark 2 was not created")

    def test_delete_bookmark(self):

        bookmark = models.Channel.bookmarked_by.through.objects.create(
            **self.bookmark_db_metadata
        )

        self.client.force_authenticate(user=self.user)
        response = self.sync_changes(
            [
                generate_delete_event(
                    bookmark.channel_id,
                    BOOKMARK,
                    user_id=self.user.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.Channel.bookmarked_by.through.objects.get(id=bookmark.id)
            self.fail("Bookmark was not deleted")
        except models.Channel.bookmarked_by.through.DoesNotExist:
            pass

    def test_delete_bookmarks(self):
        bookmark1 = models.Channel.bookmarked_by.through.objects.create(
            **self.bookmark_db_metadata
        )
        data2 = self.bookmark_db_metadata
        data2["channel_id"] = self.channel2.id
        bookmark2 = models.Channel.bookmarked_by.through.objects.create(
            **data2
        )

        self.client.force_authenticate(user=self.user)
        response = self.sync_changes(
            [
                generate_delete_event(
                    bookmark1.channel_id,
                    BOOKMARK,
                    user_id=self.user.id,
                ),
                generate_delete_event(
                    bookmark2.channel_id,
                    BOOKMARK,
                    user_id=self.user.id,
                ),
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.Channel.bookmarked_by.through.objects.get(id=bookmark1.id)
            self.fail("Bookmark 1 was not deleted")
        except models.Channel.bookmarked_by.through.DoesNotExist:
            pass

        try:
            models.Channel.bookmarked_by.through.objects.get(id=bookmark2.id)
            self.fail("Bookmark 2 was not deleted")
        except models.Channel.bookmarked_by.through.DoesNotExist:
            pass


class CRUDTestCase(StudioAPITestCase):
    @property
    def bookmark_metadata(self):
        return {
            "channel": self.channel.id,
        }

    @property
    def bookmark_db_metadata(self):
        return {
            "channel_id": self.channel.id,
            "user_id": self.user.id,
        }

    def setUp(self):
        super(CRUDTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)

    def test_create_bookmark(self):
        self.client.force_authenticate(user=self.user)
        bookmark = self.bookmark_metadata
        response = self.client.post(
            reverse("bookmark-list"), bookmark, format="json",
        )
        self.assertEqual(response.status_code, 405, response.content)

    def test_delete_bookmark(self):
        bookmark = models.Channel.bookmarked_by.through.objects.create(
            **self.bookmark_db_metadata
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.delete(
            reverse("bookmark-detail", kwargs={"pk": bookmark.id})
        )
        self.assertEqual(response.status_code, 405, response.content)
