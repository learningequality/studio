from __future__ import absolute_import

import uuid

from django.core.urlresolvers import reverse
from le_utils.constants import content_kinds
from le_utils.constants import file_formats
from le_utils.constants import format_presets

from contentcuration import models
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.viewsets.sync.constants import FILE
from contentcuration.viewsets.sync.utils import generate_create_event
from contentcuration.viewsets.sync.utils import generate_delete_event
from contentcuration.viewsets.sync.utils import generate_update_event


class SyncTestCase(StudioAPITestCase):
    @property
    def sync_url(self):
        return reverse("sync")

    @property
    def file_metadata(self):
        return {
            "id": uuid.uuid4().hex,
            "contentnode": self.channel.main_tree.get_descendants().first().id,
            "checksum": uuid.uuid4().hex,
            "preset": format_presets.AUDIO,
            "file_format": file_formats.MP3,
            "uploaded_by": self.user.id,
        }

    @property
    def file_db_metadata(self):
        return {
            "id": uuid.uuid4().hex,
            "contentnode_id": self.channel.main_tree.get_descendants().first().id,
            "checksum": uuid.uuid4().hex,
            "preset_id": format_presets.AUDIO,
            "file_format_id": file_formats.MP3,
            "uploaded_by": self.user,
        }

    def setUp(self):
        super(SyncTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)

    def test_create_file(self):
        self.client.force_authenticate(user=self.user)
        file = self.file_metadata
        response = self.client.post(
            self.sync_url,
            [generate_create_event(file["id"], FILE, file,)],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.File.objects.get(id=file["id"])
        except models.File.DoesNotExist:
            self.fail("File was not created")

    def test_create_files(self):
        self.client.force_authenticate(user=self.user)
        file1 = self.file_metadata
        file2 = self.file_metadata
        response = self.client.post(
            self.sync_url,
            [
                generate_create_event(file1["id"], FILE, file1,),
                generate_create_event(file2["id"], FILE, file2,),
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.File.objects.get(id=file1["id"])
        except models.File.DoesNotExist:
            self.fail("File 1 was not created")

        try:
            models.File.objects.get(id=file2["id"])
        except models.File.DoesNotExist:
            self.fail("File 2 was not created")

    def test_update_file(self):

        file = models.File.objects.create(**self.file_db_metadata)
        new_preset = format_presets.VIDEO_HIGH_RES

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.sync_url,
            [generate_update_event(file.id, FILE, {"preset": new_preset},)],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.File.objects.get(id=file.id).preset_id, new_preset,
        )

    def test_update_files(self):

        file1 = models.File.objects.create(**self.file_db_metadata)
        file2 = models.File.objects.create(**self.file_db_metadata)
        new_preset = format_presets.VIDEO_HIGH_RES

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.sync_url,
            [
                generate_update_event(file1.id, FILE, {"preset": new_preset},),
                generate_update_event(file2.id, FILE, {"preset": new_preset},),
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.File.objects.get(id=file1.id).preset_id, new_preset,
        )
        self.assertEqual(
            models.File.objects.get(id=file2.id).preset_id, new_preset,
        )

    def test_update_file_empty(self):

        file = models.File.objects.create(**self.file_db_metadata)
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.sync_url, [generate_update_event(file.id, FILE, {},)], format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_update_file_unwriteable_fields(self):

        file = models.File.objects.create(**self.file_db_metadata)
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.sync_url,
            [generate_update_event(file.id, FILE, {"not_a_field": "not_a_value"},)],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_delete_file(self):

        file = models.File.objects.create(**self.file_db_metadata)

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.sync_url, [generate_delete_event(file.id, FILE,)], format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.File.objects.get(id=file.id)
            self.fail("File was not deleted")
        except models.File.DoesNotExist:
            pass

    def test_delete_files(self):
        file1 = models.File.objects.create(**self.file_db_metadata)

        file2 = models.File.objects.create(**self.file_db_metadata)

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.sync_url,
            [
                generate_delete_event(file1.id, FILE,),
                generate_delete_event(file2.id, FILE,),
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.File.objects.get(id=file1.id)
            self.fail("File 1 was not deleted")
        except models.File.DoesNotExist:
            pass

        try:
            models.File.objects.get(id=file2.id)
            self.fail("File 2 was not deleted")
        except models.File.DoesNotExist:
            pass


class CRUDTestCase(StudioAPITestCase):
    @property
    def file_metadata(self):
        return {
            "id": uuid.uuid4().hex,
            "contentnode": self.channel.main_tree.get_descendants().first().id,
            "checksum": uuid.uuid4().hex,
            "preset": format_presets.AUDIO,
            "file_format": file_formats.MP3,
            "uploaded_by": self.user.id,
        }

    @property
    def file_db_metadata(self):
        return {
            "id": uuid.uuid4().hex,
            "contentnode_id": self.channel.main_tree.get_descendants().first().id,
            "checksum": uuid.uuid4().hex,
            "preset_id": format_presets.AUDIO,
            "file_format_id": file_formats.MP3,
            "uploaded_by": self.user,
        }

    def setUp(self):
        super(CRUDTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)

    def test_create_file(self):
        self.client.force_authenticate(user=self.user)
        file = self.file_metadata
        response = self.client.post(reverse("file-list"), file, format="json",)
        self.assertEqual(response.status_code, 201, response.content)
        try:
            models.File.objects.get(id=file["id"])
        except models.File.DoesNotExist:
            self.fail("File was not created")

    def test_create_file_no_node_permission(self):
        self.client.force_authenticate(user=self.user)
        new_channel = testdata.channel()
        new_channel_node = new_channel.main_tree.get_descendants().first().id
        file = self.file_metadata
        file["contentnode"] = new_channel_node
        response = self.client.post(reverse("file-list"), file, format="json",)
        self.assertEqual(response.status_code, 400, response.content)

    def test_create_file_no_assessmentitem_permission(self):
        self.client.force_authenticate(user=self.user)
        new_channel = testdata.channel()
        new_channel_exercise = (
            new_channel.main_tree.get_descendants()
            .filter(kind_id=content_kinds.EXERCISE)
            .first()
        )
        new_channel_assessmentitem = new_channel_exercise.assessment_items.first().id
        file = self.file_metadata
        file["assessment_item"] = new_channel_assessmentitem
        del file["contentnode"]
        response = self.client.post(reverse("file-list"), file, format="json",)
        self.assertEqual(response.status_code, 400, response.content)

    def test_update_file(self):
        file = models.File.objects.create(**self.file_db_metadata)
        new_preset = format_presets.VIDEO_HIGH_RES

        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            reverse("file-detail", kwargs={"pk": file.id}),
            {"preset": new_preset},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.File.objects.get(id=file.id).preset_id, new_preset,
        )

    def test_update_file_empty(self):

        file = models.File.objects.create(**self.file_db_metadata)
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            reverse("file-detail", kwargs={"pk": file.id}), {}, format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_update_file_unwriteable_fields(self):

        file = models.File.objects.create(**self.file_db_metadata)
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            reverse("file-detail", kwargs={"pk": file.id}),
            {"not_a_field": "not_a_value"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_delete_file(self):
        file = models.File.objects.create(**self.file_db_metadata)

        self.client.force_authenticate(user=self.user)
        response = self.client.delete(reverse("file-detail", kwargs={"pk": file.id}))
        self.assertEqual(response.status_code, 204, response.content)
        try:
            models.File.objects.get(id=file.id)
            self.fail("File was not deleted")
        except models.File.DoesNotExist:
            pass
