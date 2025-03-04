from __future__ import absolute_import

import uuid

from django.urls import reverse
from le_utils.constants import content_kinds
from le_utils.constants import file_formats
from le_utils.constants import format_presets

from contentcuration import models
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.tests.viewsets.base import generate_create_event
from contentcuration.tests.viewsets.base import generate_delete_event
from contentcuration.tests.viewsets.base import generate_update_event
from contentcuration.tests.viewsets.base import SyncTestMixin
from contentcuration.viewsets.sync.constants import CONTENTNODE
from contentcuration.viewsets.sync.constants import FILE


class SyncTestCase(SyncTestMixin, StudioAPITestCase):

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
        self.client.force_authenticate(user=self.user)

    def test_cannot_create_file(self):
        file = self.file_metadata
        response = self.sync_changes(
            [generate_create_event(file["id"], FILE, file, channel_id=self.channel.id)],
        )
        self.assertEqual(len(response.data["errors"]), 1)
        try:
            models.File.objects.get(id=file["id"])
            self.fail("File was created")
        except models.File.DoesNotExist:
            pass

    def test_cannot_create_files(self):
        file1 = self.file_metadata
        file2 = self.file_metadata
        response = self.sync_changes(
            [
                generate_create_event(file1["id"], FILE, file1, channel_id=self.channel.id),
                generate_create_event(file2["id"], FILE, file2, channel_id=self.channel.id),
            ],
        )
        self.assertEqual(len(response.data["errors"]), 2)
        try:
            models.File.objects.get(id=file1["id"])
            self.fail("File 1 was created")
        except models.File.DoesNotExist:
            pass

        try:
            models.File.objects.get(id=file2["id"])
            self.fail("File 2 was created")
        except models.File.DoesNotExist:
            pass

    def test_update_file(self):

        file = models.File.objects.create(**self.file_db_metadata)
        new_preset = format_presets.VIDEO_HIGH_RES

        response = self.sync_changes(
            [generate_update_event(file.id, FILE, {"preset": new_preset}, channel_id=self.channel.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.File.objects.get(id=file.id).preset_id, new_preset,
        )

    def test_update_file_no_channel(self):
        file_metadata = self.file_db_metadata
        contentnode_id = file_metadata.pop("contentnode_id")
        file = models.File.objects.create(**file_metadata)

        response = self.sync_changes(
            [generate_update_event(file.id, FILE, {"contentnode": contentnode_id}, channel_id=self.channel.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.File.objects.get(id=file.id).contentnode_id, contentnode_id,
        )

    def test_update_file_with_complete_contentnode(self):
        file_data = self.file_db_metadata
        del file_data["contentnode_id"]
        file = models.File.objects.create(**file_data)

        complete_except_no_file = models.ContentNode(
            title="yes",
            kind_id=file.preset,
            parent=self.channel.main_tree,
            license_id=models.License.objects.first().id,
            license_description="don't do this!",
            copyright_holder="Some person"
        )
        errors = complete_except_no_file.mark_complete()
        complete_except_no_file.save()

        self.assertTrue(len(errors) > 0)

        self.assertEqual(complete_except_no_file.complete, False)

        self.sync_changes(
            [generate_update_event(file.id, FILE, {"contentnode": complete_except_no_file.id}, channel_id=self.channel.id)],
        )

        # We should see two Changes, one of them should be for the CONTENTNODE table
        self.assertEqual(models.Change.objects.count(), 2)
        self.assertEqual(
            models.Change.objects.filter(table=CONTENTNODE).count(),
            1
        )

        complete_except_no_file.refresh_from_db()

        self.assertTrue(complete_except_no_file.complete)

    def test_update_file_no_channel_permission(self):
        file = models.File.objects.create(**self.file_db_metadata)
        new_preset = format_presets.VIDEO_HIGH_RES

        self.channel.editors.remove(self.user)

        response = self.sync_changes(
            [generate_update_event(file.id, FILE, {"preset": new_preset}, channel_id=self.channel.id)],
        )
        self.assertEqual(len(response.data["disallowed"]), 1)
        self.assertNotEqual(
            models.File.objects.get(id=file.id).preset_id, new_preset,
        )

    def test_update_file_no_channel_edit_permission(self):
        file = models.File.objects.create(**self.file_db_metadata)
        new_preset = format_presets.VIDEO_HIGH_RES

        self.channel.editors.remove(self.user)
        self.channel.viewers.add(self.user)

        response = self.sync_changes(
            [generate_update_event(file.id, FILE, {"preset": new_preset}, channel_id=self.channel.id)],
        )
        self.assertEqual(len(response.data["disallowed"]), 1)
        self.assertNotEqual(
            models.File.objects.get(id=file.id).preset_id, new_preset,
        )

    def test_update_file_no_node_permission(self):
        file = models.File.objects.create(**self.file_db_metadata)
        new_channel = testdata.channel()
        new_channel_node = new_channel.main_tree.get_descendants().first().id

        self.sync_changes(
            [generate_update_event(file.id, FILE, {"contentnode": new_channel_node}, channel_id=self.channel.id)],
        )
        self.assertNotEqual(
            models.File.objects.get(id=file.id).contentnode, new_channel_node,
        )

    def test_update_file_no_assessmentitem_permission(self):
        file = models.File.objects.create(**self.file_db_metadata)
        new_channel = testdata.channel()
        new_channel_exercise = (
            new_channel.main_tree.get_descendants()
            .filter(kind_id=content_kinds.EXERCISE)
            .first()
        )
        new_channel_assessmentitem = new_channel_exercise.assessment_items.first().id

        self.sync_changes(
            [generate_update_event(file.id, FILE, {"assessment_item": new_channel_assessmentitem}, channel_id=self.channel.id)],
        )
        self.assertNotEqual(
            models.File.objects.get(id=file.id).assessment_item, new_channel_assessmentitem,
        )

    def test_update_files(self):

        file1 = models.File.objects.create(**self.file_db_metadata)
        file2 = models.File.objects.create(**self.file_db_metadata)
        new_preset = format_presets.VIDEO_HIGH_RES

        response = self.sync_changes(
            [
                generate_update_event(file1.id, FILE, {"preset": new_preset}, channel_id=self.channel.id),
                generate_update_event(file2.id, FILE, {"preset": new_preset}, channel_id=self.channel.id),
            ],
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
        response = self.sync_changes([generate_update_event(file.id, FILE, {}, channel_id=self.channel.id)])
        self.assertEqual(response.status_code, 200, response.content)

    def test_update_file_unwriteable_fields(self):

        file = models.File.objects.create(**self.file_db_metadata)
        response = self.sync_changes(
            [generate_update_event(file.id, FILE, {"not_a_field": "not_a_value"}, channel_id=self.channel.id)],
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_delete_file(self):

        file = models.File.objects.create(**self.file_db_metadata)

        self.client.force_authenticate(user=self.user)
        response = self.sync_changes([generate_delete_event(file.id, FILE, channel_id=self.channel.id)])
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
        response = self.sync_changes(
            [
                generate_delete_event(file1.id, FILE, channel_id=self.channel.id),
                generate_delete_event(file2.id, FILE, channel_id=self.channel.id),
            ],
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

    def test_cannot_create_file(self):
        self.client.force_authenticate(user=self.user)
        file = self.file_metadata
        response = self.client.post(reverse("file-list"), file, format="json",)
        self.assertEqual(response.status_code, 405, response.content)
        try:
            models.File.objects.get(id=file["id"])
            self.fail("File was created")
        except models.File.DoesNotExist:
            pass

    def test_update_file(self):
        file = models.File.objects.create(**self.file_db_metadata)
        new_preset = format_presets.VIDEO_HIGH_RES

        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            reverse("file-detail", kwargs={"pk": file.id}),
            {"preset": new_preset},
            format="json",
        )
        self.assertEqual(response.status_code, 405, response.content)

    def test_delete_file(self):
        file = models.File.objects.create(**self.file_db_metadata)

        self.client.force_authenticate(user=self.user)
        response = self.client.delete(reverse("file-detail", kwargs={"pk": file.id}))
        self.assertEqual(response.status_code, 405, response.content)


class UploadFileURLTestCase(StudioAPITestCase):
    def setUp(self):
        super(UploadFileURLTestCase, self).setUp()
        self.user = testdata.user()
        self.file = {
            "size": 1000,
            "checksum": uuid.uuid4().hex,
            "name": "le_studio",
            "file_format": file_formats.MP3,
            "preset": format_presets.AUDIO,
            "duration": 10.123
        }

    def test_required_keys(self):
        del self.file["name"]
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("file-upload-url"), self.file, format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_duration_invalid(self):
        self.file["duration"] = '1.23'

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("file-upload-url"), self.file, format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_invalid_file_format_upload(self):
        self.client.force_authenticate(user=self.user)
        file = {
            "size": 1000,
            "checksum": uuid.uuid4().hex,
            "name": "le_studio",
            "file_format": "ppx",
            "preset": format_presets.AUDIO,
            "duration": 10.123
        }
        response = self.client.post(
            reverse("file-upload-url"), file, format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_invalid_preset_upload(self):
        self.client.force_authenticate(user=self.user)
        file = {
            "size": 1000,
            "checksum": uuid.uuid4().hex,
            "name": "le_studio",
            "file_format": file_formats.MP3,
            "preset": "invalid_preset",  # Deliberately invalid
            "duration": 10.123
        }
        response = self.client.post(reverse("file-upload-url"), file, format="json")
        self.assertEqual(response.status_code, 400)

    def test_insufficient_storage(self):
        self.file["size"] = 100000000000000

        self.client.force_authenticate(user=self.user)
        response = self.client.post(reverse("file-upload-url"), self.file, format="json",)

        self.assertEqual(response.status_code, 412)

    def test_upload_url(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(reverse("file-upload-url"), self.file, format="json",)
        self.assertEqual(response.status_code, 200)
        file = models.File.objects.get(checksum=self.file["checksum"])
        self.assertEqual(10, file.duration)

    def test_upload_url_doesnot_sets_contentnode(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(reverse("file-upload-url"), self.file, format="json",)
        file = models.File.objects.get(checksum=self.file["checksum"])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(file.contentnode, None)

    def test_duration_zero(self):
        self.file["duration"] = 0

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("file-upload-url"), self.file, format="json",
        )

        self.assertEqual(response.status_code, 400)


class ContentIDTestCase(SyncTestMixin, StudioAPITestCase):
    def setUp(self):
        super(ContentIDTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)
        self.client.force_authenticate(user=self.user)

    def _get_file_metadata(self):
        return {
            "size": 2500,
            "checksum": uuid.uuid4().hex,
            "name": "le_studio_file",
            "file_format": file_formats.MP3,
            "preset": format_presets.AUDIO,
        }

    def _upload_file_to_contentnode(self, file_metadata=None, contentnode_id=None):
        """
        This method mimics the frontend file upload process which is a two-step
        process for the backend.
        First, file's upload URL is fetched and then that file's ORM object is updated
        to point to the contentnode.
        """
        file = file_metadata or self._get_file_metadata()
        self.client.post(reverse("file-upload-url"), file, format="json",)
        file_from_db = models.File.objects.get(checksum=file["checksum"])
        self.sync_changes(
            [generate_update_event(
                file_from_db.id,
                FILE,
                {
                    "contentnode": contentnode_id or self.channel.main_tree.get_descendants().first().id
                },
                channel_id=self.channel.id)],)
        file_from_db.refresh_from_db()
        return file_from_db

    def _delete_file_from_contentnode(self, file_from_db):
        self.sync_changes(
            [
                generate_delete_event(file_from_db.id, FILE, channel_id=self.channel.id),
            ],
        )

    def test_content_id__same_on_copy_file_node(self):
        file = self._upload_file_to_contentnode()
        file_contentnode_copy = file.contentnode.copy_to(target=self.channel.main_tree)

        # Assert content_id same after copying.
        file.contentnode.refresh_from_db()
        file_contentnode_copy.refresh_from_db()
        self.assertEqual(file.contentnode.content_id, file_contentnode_copy.content_id)

    def test_content_id__changes_on_upload_file_to_node(self):
        file = self._upload_file_to_contentnode()
        file_contentnode_copy = file.contentnode.copy_to(target=self.channel.main_tree)

        # Upload a new file to the copied contentnode.
        self._upload_file_to_contentnode(contentnode_id=file_contentnode_copy.id)

        # Assert after new file upload, content_id changes.
        file.contentnode.refresh_from_db()
        file_contentnode_copy.refresh_from_db()
        self.assertNotEqual(file.contentnode.content_id, file_contentnode_copy.content_id)

    def test_content_id__changes_on_delete_file_from_node(self):
        file = self._upload_file_to_contentnode()
        file_contentnode_copy = file.contentnode.copy_to(target=self.channel.main_tree)

        # Delete file from the copied contentnode.
        self._delete_file_from_contentnode(file_from_db=file_contentnode_copy.files.first())

        # Assert after deleting file, content_id changes.
        file.contentnode.refresh_from_db()
        file_contentnode_copy.refresh_from_db()
        self.assertNotEqual(file.contentnode.content_id, file_contentnode_copy.content_id)

    def test_content_id__doesnot_changes_on_update_original_file_node(self):
        file = self._upload_file_to_contentnode()
        file.contentnode.copy_to(target=self.channel.main_tree)

        # Upload and delete file from the original contentnode.
        content_id_before_updates = file.contentnode.content_id
        self._upload_file_to_contentnode(contentnode_id=file.contentnode.id)
        self._delete_file_from_contentnode(file_from_db=file)

        # Assert after changes to original contentnode, content_id remains same.
        file.contentnode.refresh_from_db()
        content_id_after_updates = file.contentnode.content_id
        self.assertEqual(content_id_before_updates, content_id_after_updates)

    def test_content_id__doesnot_update_if_unique(self):
        file = self._upload_file_to_contentnode()
        file_contentnode_copy = file.contentnode.copy_to(target=self.channel.main_tree)

        # Upload a new file to the copied contentnode.
        self._upload_file_to_contentnode(contentnode_id=file_contentnode_copy.id)
        file_contentnode_copy.refresh_from_db()
        content_id_after_first_update = file_contentnode_copy.content_id

        # Upload another new file to the copied contentnode. At this point,
        # the content_id of copied node is already unique so it should not be updated.
        self._upload_file_to_contentnode(contentnode_id=file_contentnode_copy.id)
        file_contentnode_copy.refresh_from_db()
        content_id_after_second_update = file_contentnode_copy.content_id

        self.assertEqual(content_id_after_first_update, content_id_after_second_update)

    def test_content_id__thumbnails_dont_update_content_id(self):
        file = self._upload_file_to_contentnode()
        file_contentnode_copy = file.contentnode.copy_to(target=self.channel.main_tree)

        thumbnail_file_meta_1 = self._get_file_metadata()
        thumbnail_file_meta_2 = self._get_file_metadata()
        thumbnail_file_meta_1.update({"preset": format_presets.AUDIO_THUMBNAIL, "file_format": file_formats.JPEG, })
        thumbnail_file_meta_2.update({"preset": format_presets.AUDIO_THUMBNAIL, "file_format": file_formats.JPEG, })

        # Upload thumbnail to original contentnode and copied contentnode.
        # content_id should remain same for both these nodes.
        original_node_content_id_before_upload = file.contentnode.content_id
        copied_node_content_id_before_upload = file_contentnode_copy.content_id
        self._upload_file_to_contentnode(file_metadata=thumbnail_file_meta_1, contentnode_id=file.contentnode.id)
        self._upload_file_to_contentnode(file_metadata=thumbnail_file_meta_2, contentnode_id=file_contentnode_copy.id)

        # Assert content_id is same after uploading thumbnails to nodes.
        file.contentnode.refresh_from_db()
        file_contentnode_copy.refresh_from_db()
        original_node_content_id_after_upload = file.contentnode.content_id
        copied_node_content_id_after_upload = file_contentnode_copy.content_id

        self.assertEqual(original_node_content_id_before_upload, original_node_content_id_after_upload)
        self.assertEqual(copied_node_content_id_before_upload, copied_node_content_id_after_upload)
