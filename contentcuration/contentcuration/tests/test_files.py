# -*- coding: utf-8 -*-
from __future__ import absolute_import

import json

import pytest
from builtins import str
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.urlresolvers import reverse_lazy
from le_utils.constants import content_kinds
from le_utils.constants import format_presets
from mock import patch
from past.builtins import basestring

from .base import BaseAPITestCase
from .base import StudioTestCase
from .testdata import base64encoding
from .testdata import generated_base64encoding
from .testdata import srt_subtitle
from contentcuration.api import write_raw_content_to_storage
from contentcuration.models import ContentNode
from contentcuration.models import DEFAULT_CONTENT_DEFAULTS
from contentcuration.models import delete_empty_file_reference
from contentcuration.models import File
from contentcuration.models import generate_object_storage_name
from contentcuration.utils.files import create_thumbnail_from_base64
from contentcuration.utils.files import get_thumbnail_encoding
from contentcuration.utils.nodes import map_files_to_node
from contentcuration.utils.publish import create_associated_thumbnail
from contentcuration.views.files import file_create
from contentcuration.views.files import image_upload
from contentcuration.views.files import multilanguage_file_upload
from contentcuration.views.files import thumbnail_upload


pytestmark = pytest.mark.django_db


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
        upload_file = SimpleUploadedFile("test_file.txt", b"file contents")
        request = self.create_post_request(reverse_lazy('multilanguage_file_upload'), {'file': upload_file})

        file_response = multilanguage_file_upload(request)
        self.assertEqual(file_response.status_code, 400)
        self.assertEqual(file_response.content.decode('utf-8'), 'Language is required')

    def test_upload_no_preset(self):
        upload_file = SimpleUploadedFile("test_file.txt", b"file contents")
        request = self.create_post_request(reverse_lazy('multilanguage_file_upload'), {'file': upload_file})
        request.META.update({'HTTP_LANGUAGE': 'en'})

        file_response = multilanguage_file_upload(request)
        self.assertEqual(file_response.status_code, 400)
        self.assertEqual(file_response.content.decode('utf-8'), 'Preset is required')

    def test_upload_unsupported_preset(self):
        upload_file = SimpleUploadedFile("test_file.txt", b"file contents")
        request = self.create_post_request(reverse_lazy('multilanguage_file_upload'), {'file': upload_file})
        request.META.update({'HTTP_LANGUAGE': 'en'})
        request.META.update({'HTTP_PRESET': 'unsupported_preset'})

        file_response = multilanguage_file_upload(request)
        self.assertEqual(file_response.status_code, 400)
        self.assertEqual(file_response.content.decode('utf-8'), 'Unsupported preset')


class FileSubtitleTestCase(BaseAPITestCase):
    def test_upload(self):
        upload_file = SimpleUploadedFile("test.srt", srt_subtitle().encode('utf-8'))
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
