from __future__ import absolute_import

import uuid

from django.urls import reverse

from contentcuration.models import CaptionCue, CaptionFile
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.tests import testdata
from contentcuration.tests.viewsets.base import SyncTestMixin
from contentcuration.tests.viewsets.base import generate_create_event
from contentcuration.tests.viewsets.base import generate_update_event
from contentcuration.tests.viewsets.base import generate_delete_event
from contentcuration.viewsets.sync.constants import CAPTION_FILE

# class CRUDTestCase(StudioAPITestCase):


class SyncTestCase(SyncTestMixin, StudioAPITestCase):
    @property
    def caption_file_metadata(self):
        return {
            "file_id": uuid.uuid4().hex,
            "language": "en",
        }

    @property
    def same_file_different_language_metadata(self):
        id = uuid.uuid4().hex
        return [
            {
                "file_id": id,
                "language": "en",
            },
            {
                "file_id": id,
                "language": "ru",
            },
        ]

    @property
    def caption_file_db_metadata(self):
        return {
            "file_id": uuid.uuid4().hex,
            "language": "en",
        }

    def setUp(self):
        super(SyncTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)

    def test_create_caption(self):
        self.client.force_authenticate(user=self.user)
        caption_file = self.caption_file_metadata

        response = self.sync_changes(
            [
                generate_create_event(
                    uuid.uuid4().hex,
                    CAPTION_FILE,
                    caption_file,
                    channel_id=self.channel.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)

        try:
            caption_file_db = CaptionFile.objects.get(
                file_id=caption_file["file_id"],
                language=caption_file["language"],
            )
        except CaptionFile.DoesNotExist:
            self.fail("caption file was not created")

        # Check the values of the object in the PostgreSQL
        self.assertEqual(caption_file_db.file_id, caption_file["file_id"])
        self.assertEqual(caption_file_db.language, caption_file["language"])

    def test_delete_caption_file(self):
        self.client.force_authenticate(user=self.user)
        caption_file = self.caption_file_metadata
        pk = uuid.uuid4().hex
        response = self.sync_changes(
            [
                generate_create_event(
                    pk, CAPTION_FILE, caption_file, channel_id=self.channel.id
                )
            ]
        )
        self.assertEqual(response.status_code, 200, response.content)

        # Delete the caption file
        response = self.sync_changes(
            [generate_delete_event(pk, CAPTION_FILE, channel_id=self.channel.id)]
        )

        self.assertEqual(response.status_code, 200, response.content)

        with self.assertRaises(CaptionFile.DoesNotExist):
            caption_file_db = CaptionFile.objects.get(
                file_id=caption_file["file_id"], language=caption_file["language"]
            )

    def test_delete_file_with_same_file_id_different_language(self):
        self.client.force_authenticate(user=self.user)
        obj = self.same_file_different_language_metadata

        caption_file_1 = CaptionFile.objects.create(**obj[0])
        caption_file_2 = CaptionFile.objects.create(**obj[1])

        response = self.sync_changes(
            [
                generate_delete_event(
                    caption_file_2.pk,
                    CAPTION_FILE,
                    channel_id=self.channel.id,
                )
            ]
        )

        self.assertEqual(response.status_code, 200, response.content)

        with self.assertRaises(CaptionFile.DoesNotExist):
            caption_file_db = CaptionFile.objects.get(
                file_id=caption_file_2.file_id, language=caption_file_2.language
            )
