# -*- coding: utf-8 -*-
import json

import pytest
from base import BaseAPITestCase
from base import StudioTestCase
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.urlresolvers import reverse_lazy
from le_utils.constants import content_kinds
from le_utils.constants import format_presets
from mock import patch

from .testdata import base64encoding
from .testdata import fileobj_video
from .testdata import generated_base64encoding
from .testdata import node
from .testdata import srt_subtitle
from contentcuration.api import write_raw_content_to_storage
from contentcuration.models import AssessmentItem
from contentcuration.models import ContentNode
from contentcuration.models import DEFAULT_CONTENT_DEFAULTS
from contentcuration.models import delete_empty_file_reference
from contentcuration.models import File
from contentcuration.models import generate_object_storage_name
from contentcuration.serializers import FileSerializer
from contentcuration.utils.files import create_thumbnail_from_base64
from contentcuration.utils.files import get_thumbnail_encoding
from contentcuration.utils.nodes import map_files_to_node
from contentcuration.utils.publish import create_associated_thumbnail
from contentcuration.views.files import file_create
from contentcuration.views.files import generate_thumbnail
from contentcuration.views.files import image_upload
from contentcuration.views.files import multilanguage_file_upload
from contentcuration.views.files import thumbnail_upload


pytestmark = pytest.mark.django_db


class FileSaveTestCase(BaseAPITestCase):

    def setUp(self):
        super(FileSaveTestCase, self).setUp()
        self.video = self.channel.main_tree.get_descendants().filter(kind_id='video').first()
        self.video_file = self.video.files.first()
        self.testnode = node({"kind_id": "video", "title": "test node", "node_id": "abcdef"})
        self.newfile = fileobj_video()
        self.newfile.contentnode = self.testnode
        self.newfile.save()

    def test_file_update(self):
        self.video_file.contentnode = self.testnode
        response = self.put("/api/file", FileSerializer([self.video_file], many=True).data)
        self.assertEqual(response.status_code, 200)
        self.video_file.refresh_from_db()
        self.assertEqual(self.video_file.contentnode.pk, self.testnode.pk)

    def test_file_add(self):
        self.newfile.preset_id = 'low_res_video'
        self.newfile.save()
        self.newfile.contentnode = self.video
        self.put("/api/file", FileSerializer([self.video_file, self.newfile], many=True).data)
        self.video.refresh_from_db()
        self.assertTrue(self.video.files.filter(pk=self.newfile.pk).exists())
        self.assertTrue(self.video.files.filter(pk=self.video_file.pk).exists())

    def test_file_replace(self):
        self.newfile.contentnode = self.video
        self.put("/api/file", FileSerializer([self.video_file, self.newfile], many=True).data)
        self.video.refresh_from_db()
        self.assertTrue(self.video.files.filter(pk=self.newfile.pk).exists())
        self.assertFalse(self.video.files.filter(pk=self.video_file.pk).exists())
        self.assertFalse(File.objects.filter(pk=self.video_file.pk).exists())

    def test_file_delete(self):
        self.newfile.contentnode = self.video
        self.put("/api/file", FileSerializer([self.video_file, self.newfile], many=True).data)  # Add the file
        self.put("/api/file", FileSerializer([self.newfile], many=True).data)  # Now delete the file
        self.video.refresh_from_db()
        self.assertTrue(self.video.files.filter(pk=self.newfile.pk).exists())
        self.assertFalse(self.video.files.filter(pk=self.video_file.pk).exists())
        self.assertFalse(File.objects.filter(pk=self.video_file.pk).exists())


class FileCreateTestCase(BaseAPITestCase):
    def test_file_create_no_content_defaults(self):
        post_data = {'file': SimpleUploadedFile("file.pdf", b"contents")}
        request = self.create_post_request(reverse_lazy('file_create'), post_data)
        response = file_create(request)
        self.assertTrue(response.status_code, 201)

    def test_file_create_content_defaults(self):
        content_defaults = DEFAULT_CONTENT_DEFAULTS
        post_data = {
            'file': SimpleUploadedFile("file.pdf", b"contents"),
            'content_defaults': json.dumps(content_defaults)
        }
        request = self.create_post_request(reverse_lazy('file_create'), post_data)
        response = file_create(request)
        self.assertTrue(response.status_code, 201)

    def test_file_create_non_ascii_defaults(self):
        content_defaults = DEFAULT_CONTENT_DEFAULTS
        content_defaults['author'] = 'José'
        post_data = {
            'file': SimpleUploadedFile("file.pdf", b"contents"),
            'content_defaults': json.dumps(content_defaults)
        }
        request = self.create_post_request(reverse_lazy('file_create'), post_data)
        response = file_create(request)
        self.assertTrue(response.status_code, 201)


class FileThumbnailTestCase(BaseAPITestCase):

    def setUp(self):
        super(FileThumbnailTestCase, self).setUp()
        self.thumbnail_fobj = create_thumbnail_from_base64(base64encoding())
        filepath = generate_object_storage_name(self.thumbnail_fobj.checksum, str(self.thumbnail_fobj))
        with default_storage.open(filepath, 'rb') as fobj:
            self.thumbnail_contents = fobj.read()

    def test_get_thumbnail_encoding(self):
        encoding = get_thumbnail_encoding(str(self.thumbnail_fobj))
        self.assertEqual(encoding, generated_base64encoding())

    def test_channel_thumbnail_upload(self):
        upload_file = SimpleUploadedFile("image.png", self.thumbnail_contents)
        request = self.create_post_request(reverse_lazy('image_upload'), {'file': upload_file})
        file_response = image_upload(request)
        self.assertEqual(file_response.status_code, 200)
        file_data = json.loads(file_response.content)
        self.assertEqual(file_data['encoding'], generated_base64encoding())

    def test_node_thumbnail_upload(self):
        upload_file = SimpleUploadedFile("image.png", self.thumbnail_contents)
        request = self.create_post_request(reverse_lazy('image_upload'), {'file': upload_file})
        file_response = thumbnail_upload(request)
        self.assertEqual(file_response.status_code, 200)
        file_data = json.loads(file_response.content)
        self.assertEqual(file_data['encoding'], generated_base64encoding())

    @patch('contentcuration.api.default_storage.save')
    @patch('contentcuration.api.default_storage.exists', return_value=True)
    def test_existing_node_thumbnail_upload(self, storage_exists_mock, storage_save_mock):
        upload_file = SimpleUploadedFile("image.png", self.thumbnail_contents)
        request = self.create_post_request(reverse_lazy('image_upload'), {'file': upload_file})
        file_response = thumbnail_upload(request)
        self.assertEqual(file_response.status_code, 200)
        file_data = json.loads(file_response.content)
        self.assertEqual(file_data['encoding'], generated_base64encoding())
        storage_save_mock.assert_not_called()

    @patch('contentcuration.api.default_storage.save')
    @patch('contentcuration.api.default_storage.exists', return_value=True)
    def test_existing_thumbnail_is_not_created(self, storage_exists_mock, storage_save_mock):
        create_thumbnail_from_base64(base64encoding())
        storage_exists_mock.assert_called()
        storage_save_mock.assert_not_called()

    def test_generate_thumbnail(self):
        # Create exercise node (generated images are more predictable)
        node = ContentNode(title="Test Node", kind_id=content_kinds.EXERCISE)
        node.save()

        # Create assessment item with image
        assessment_item = AssessmentItem(contentnode=node)
        assessment_item.save()
        self.thumbnail_fobj.assessment_item = assessment_item
        self.thumbnail_fobj.preset_id = format_presets.EXERCISE_IMAGE
        self.thumbnail_fobj.save()

        # Call generate_thumbnail endpoint
        request = self.create_post_request(reverse_lazy('generate_thumbnail', kwargs={'contentnode_id': node.pk}))
        response = generate_thumbnail(request, node.pk)
        self.assertEqual(response.status_code, 200)
        file_data = json.loads(response.content)
        self.assertEqual(file_data['encoding'], generated_base64encoding())

    def test_internal_thumbnail(self):
        # Create exercise node (generated images are more predictable)
        node = ContentNode(title="Test Node", kind_id=content_kinds.VIDEO)
        node.save()

        file_data = [{
            "preset": None,
            "filename": str(self.thumbnail_fobj),
            "language": "en",
            "size": self.thumbnail_fobj.file_size,
        }]
        map_files_to_node(self.user, node, file_data)
        self.assertTrue(isinstance(node.thumbnail_encoding, basestring))
        thumbnail_data = json.loads(node.thumbnail_encoding)
        self.assertEqual(thumbnail_data['base64'], generated_base64encoding())

    def test_exportchannel_thumbnail(self):
        node = ContentNode(title="Test Node", kind_id=content_kinds.VIDEO)
        node.save()
        newfile = create_associated_thumbnail(node, self.thumbnail_fobj)
        self.assertTrue(isinstance(newfile, File))
        thumbnail_data = json.loads(node.thumbnail_encoding)
        self.assertEqual(thumbnail_data['base64'], generated_base64encoding())


class FileMultilanguageTestCase(BaseAPITestCase):
    def test_upload_no_language(self):
        upload_file = SimpleUploadedFile("test_file.txt", "file contents")
        request = self.create_post_request(reverse_lazy('multilanguage_file_upload'), {'file': upload_file})

        file_response = multilanguage_file_upload(request)
        self.assertEqual(file_response.status_code, 400)
        self.assertEqual(file_response.content, 'Language is required')

    def test_upload_no_preset(self):
        upload_file = SimpleUploadedFile("test_file.txt", "file contents")
        request = self.create_post_request(reverse_lazy('multilanguage_file_upload'), {'file': upload_file})
        request.META.update({'HTTP_LANGUAGE': 'en'})

        file_response = multilanguage_file_upload(request)
        self.assertEqual(file_response.status_code, 400)
        self.assertEqual(file_response.content, 'Preset is required')

    def test_upload_unsupported_preset(self):
        upload_file = SimpleUploadedFile("test_file.txt", "file contents")
        request = self.create_post_request(reverse_lazy('multilanguage_file_upload'), {'file': upload_file})
        request.META.update({'HTTP_LANGUAGE': 'en'})
        request.META.update({'HTTP_PRESET': 'unsupported_preset'})

        file_response = multilanguage_file_upload(request)
        self.assertEqual(file_response.status_code, 400)
        self.assertEqual(file_response.content, 'Unsupported preset')


class FileSubtitleTestCase(BaseAPITestCase):
    def test_upload(self):
        upload_file = SimpleUploadedFile("test.srt", srt_subtitle())
        request = self.create_post_request(reverse_lazy('multilanguage_file_upload'), {'file': upload_file})
        request.META.update({'HTTP_LANGUAGE': 'ar'})
        request.META.update({'HTTP_PRESET': format_presets.VIDEO_SUBTITLE})

        file_response = multilanguage_file_upload(request)
        self.assertEqual(file_response.status_code, 200)


class NodeFileDeletionTestCase(StudioTestCase):

    def test_delete_empty_file_reference(self):
        checksum, _, storage_path = write_raw_content_to_storage('some fake PDF data', ext='.pdf')
        assert default_storage.exists(storage_path), 'file should be saved'
        delete_empty_file_reference(checksum, 'pdf')
        assert not default_storage.exists(storage_path), 'file should be deleted'


