from __future__ import absolute_import

import json
import uuid

from contentcuration.models import CaptionCue, CaptionFile, Language
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.tests.viewsets.base import (
    SyncTestMixin,
    generate_create_event,
    generate_delete_event,
    generate_update_event,
)
from contentcuration.viewsets.caption import CaptionCueSerializer, CaptionFileSerializer
from contentcuration.viewsets.sync.constants import CAPTION_CUES, CAPTION_FILE


class SyncTestCase(SyncTestMixin, StudioAPITestCase):
    @property
    def caption_file_metadata(self):
        return {
            "file_id": uuid.uuid4().hex,
            "language": Language.objects.get(pk="en").pk,
        }

    @property
    def same_file_different_language_metadata(self):
        id = uuid.uuid4().hex
        return [
            {
                "file_id": id,
                "language":  Language.objects.get(pk="en"),
            },
            {
                "file_id": id,
                "language":  Language.objects.get(pk="ru"),
            },
        ]

    @property
    def caption_cue_metadata(self):
        return {
            "file": {
                "file_id": uuid.uuid4().hex,
                "language":  Language.objects.get(pk="en").pk,
            },
            "cue": {
                "text": "This is the beginning!",
                "starttime": 0.0,
                "endtime": 12.0,
            },
        }

    @property
    def caption_cue_metadata(self):
        return {
            "file": {
                "file_id": uuid.uuid4().hex,
                "language":  Language.objects.get(pk="en").pk,
            },
            "cue": {
                "text": "This is the beginning!",
                "starttime": 0.0,
                "endtime": 12.0,
            },
        }

    @property
    def caption_cue_metadata(self):
        return {
            "file": {
                "file_id": uuid.uuid4().hex,
                "language":  Language.objects.get(pk="en").pk,
            },
            "cue": {
                "text": "This is the beginning!",
                "starttime": 0.0,
                "endtime": 12.0,
            },
        }

    @property
    def caption_cue_metadata(self):
        return {
            "file": {
                "file_id": uuid.uuid4().hex,
                "language":  Language.objects.get(pk="en").pk,
            },
            "cue": {
                "text": "This is the beginning!",
                "starttime": 0.0,
                "endtime": 12.0,
            },
        }

    @property
    def caption_cue_metadata(self):
        return {
            "file": {
                "file_id": uuid.uuid4().hex,
                "language": "en",
            },
            "cue": {
                "text": "This is the beginning!",
                "starttime": 0.0,
                "endtime": 12.0,
            },
        }

    def setUp(self):
        super(SyncTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)

    # Test for CaptionFile model
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
                language_id=caption_file["language"],
            )
        except CaptionFile.DoesNotExist:
            self.fail("caption file was not created")

        # Check the values of the object in the PostgreSQL
        self.assertEqual(caption_file_db.file_id, caption_file["file_id"])
        self.assertEqual(caption_file_db.language_id, caption_file["language"])

    def test_enqueue_caption_task(self):
        self.client.force_authenticate(user=self.user)
        caption_file = {
            "file_id": uuid.uuid4().hex,
            "language": Language.objects.get(pk="en").pk,
        }

        response = self.sync_changes([generate_create_event(
            uuid.uuid4().hex,
            CAPTION_FILE,
            caption_file,
            channel_id=self.channel.id,
        )],)
        self.assertEqual(response.status_code, 200, response.content)


    def test_delete_caption_file(self):
        self.client.force_authenticate(user=self.user)
        caption_file = self.caption_file_metadata
        # Explicitly set language to model object to follow Django ORM conventions
        caption_file['language'] = Language.objects.get(pk='en')
        caption_file_1 = CaptionFile(**caption_file)
        pk = caption_file_1.pk

        # Delete the caption file
        response = self.sync_changes(
            [generate_delete_event(pk, CAPTION_FILE, channel_id=self.channel.id)]
        )
        self.assertEqual(response.status_code, 200, response.content)

        with self.assertRaises(CaptionFile.DoesNotExist):
            caption_file_db = CaptionFile.objects.get(
                file_id=caption_file["file_id"], language_id=caption_file["language"]
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
                file_id=caption_file_2.file_id, language_id=caption_file_2.language
            )

    def test_caption_file_serialization(self):
        metadata = self.caption_file_metadata
        # Explicitly set language to model object to follow Django ORM conventions 
        metadata['language'] = Language.objects.get(pk="en")
        caption_file = CaptionFile.objects.create(**metadata)
        serializer = CaptionFileSerializer(instance=caption_file)
        try:
            jd = json.dumps(serializer.data)  # Try to serialize the data to JSON
        except Exception as e:
            self.fail(f"CaptionFile serialization failed. Error: {str(e)}")

    def test_caption_cue_serialization(self):
        metadata = self.caption_cue_metadata
        # Explicitly set language to model object to follow Django ORM conventions 
        metadata['file']['language'] = Language.objects.get(pk="en")
        caption_file = CaptionFile.objects.create(**metadata["file"])
        caption_cue = metadata["cue"]
        caption_cue.update(
            {
                "caption_file": caption_file,
            }
        )
        caption_cue_1 = CaptionCue.objects.create(**caption_cue)
        caption_cue_2 = CaptionCue.objects.create(
            text="How are you?", starttime=2.0, endtime=3.0, caption_file=caption_file
        )
        serializer = CaptionFileSerializer(instance=caption_file)
        try:
            json.dumps(serializer.data)  # Try to serialize the data to JSON
        except Exception as e:
            self.fail(f"CaptionFile serialization failed. Error: {str(e)}")

    def test_create_caption_cue(self):
        self.client.force_authenticate(user=self.user)
        metadata = self.caption_cue_metadata

        # Explicitly set language to model object to follow Django ORM conventions 
        metadata['file']['language'] = Language.objects.get(pk="en") 

        caption_file_1 = CaptionFile.objects.create(**metadata["file"])
        caption_cue = metadata["cue"]
        caption_cue["caption_file_id"] = caption_file_1.pk

        response = self.sync_changes(
            [
                generate_create_event(
                    uuid.uuid4(),
                    CAPTION_CUES,
                    caption_cue,
                    channel_id=self.channel.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)

        try:
            caption_cue_db = CaptionCue.objects.get(
                text=caption_cue["text"],
                starttime=caption_cue["starttime"],
                endtime=caption_cue["endtime"],
            )
        except CaptionCue.DoesNotExist:
            self.fail("Caption cue not found!")

    def test_delete_caption_cue(self):
        self.client.force_authenticate(user=self.user)
        metadata = self.caption_cue_metadata
        # Explicitly set language to model object to follow Django ORM conventions 
        metadata['file']['language'] = Language.objects.get(pk="en") 
        caption_file_1 = CaptionFile.objects.create(**metadata["file"])
        caption_cue = metadata["cue"]
        caption_cue.update({"caption_file": caption_file_1})
        caption_cue_1 = CaptionCue.objects.create(**caption_cue)
        try:
            caption_cue_db = CaptionCue.objects.get(
                text=caption_cue["text"],
                starttime=caption_cue["starttime"],
                endtime=caption_cue["endtime"],
            )
        except CaptionCue.DoesNotExist:
            self.fail("Caption cue not found!")

        # Delete the caption Cue that we just created
        response = self.sync_changes(
            [
                generate_delete_event(
                    caption_cue_db.pk, CAPTION_CUES, channel_id=self.channel.id
                )
            ]
        )
        self.assertEqual(response.status_code, 200, response.content)

        caption_cue_db_exists = CaptionCue.objects.filter(
            text=caption_cue["text"],
            starttime=caption_cue["starttime"],
            endtime=caption_cue["endtime"],
        ).exists()
        if caption_cue_db_exists:
            self.fail("Caption Cue still exists!")

    def test_update_caption_cue(self):
        self.client.force_authenticate(user=self.user)
        metadata = self.caption_cue_metadata
        # Explicitly set language to model object to follow Django ORM conventions 
        metadata['file']['language'] = Language.objects.get(pk="en") 
        caption_file_1 = CaptionFile.objects.create(**metadata["file"])

        caption_cue = metadata["cue"]
        caption_cue.update({"caption_file": caption_file_1})

        caption_cue_1 = CaptionCue.objects.create(**caption_cue)
        try:
            caption_cue_db = CaptionCue.objects.get(
                text=caption_cue["text"],
                starttime=caption_cue["starttime"],
                endtime=caption_cue["endtime"],
            )
        except CaptionCue.DoesNotExist:
            self.fail("Caption cue not found!")

        # Update the cue
        pk = caption_cue_1.pk
        new_text = "Yo"
        new_starttime = 10
        new_endtime = 20

        response = self.sync_changes(
            [
                generate_update_event(
                    pk,
                    CAPTION_CUES,
                    {
                        "text": new_text,
                        "starttime": new_starttime,
                        "endtime": new_endtime,
                        "caption_file_id": caption_file_1.pk,
                    },
                    channel_id=self.channel.id,
                )
            ]
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            CaptionCue.objects.get(id=pk).text,
            new_text,
        )
        self.assertEqual(
            CaptionCue.objects.get(id=pk).starttime,
            new_starttime,
        )
        self.assertEqual(
            CaptionCue.objects.get(id=pk).endtime,
            new_endtime,
        )

    def test_invalid_caption_cue_data_serialization(self):
        metadata = self.caption_cue_metadata
        # Explicitly set language to model object to follow Django ORM conventions 
        metadata['file']['language'] = Language.objects.get(pk="en") 
        caption_file = CaptionFile.objects.create(**metadata["file"])
        caption_cue = metadata["cue"]
        caption_cue.update(
            {
                "starttime": float(20),
                "endtime": float(10),
                "caption_file": caption_file,
            }
        )
        serializer = CaptionCueSerializer(data=caption_cue)
        assert not serializer.is_valid()
        errors = serializer.errors
        assert "non_field_errors" in errors
        assert str(errors["non_field_errors"][0]) == "The cue must finish after start."
