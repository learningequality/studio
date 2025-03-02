# -*- coding: utf-8 -*-
import json

import pytest
from django.core.files.storage import default_storage
from le_utils.constants import content_kinds
from mock import patch

from .base import BaseAPITestCase
from .base import StudioTestCase
from .testdata import base64encoding
from .testdata import generated_base64encoding
from contentcuration.api import write_raw_content_to_storage
from contentcuration.models import ContentNode
from contentcuration.models import delete_empty_file_reference
from contentcuration.models import File
from contentcuration.models import generate_object_storage_name
from contentcuration.utils.files import create_thumbnail_from_base64
from contentcuration.utils.files import get_thumbnail_encoding
from contentcuration.utils.nodes import map_files_to_node
from contentcuration.utils.publish import create_associated_thumbnail


pytestmark = pytest.mark.django_db


class FileThumbnailTestCase(BaseAPITestCase):
    def setUp(self):
        super(FileThumbnailTestCase, self).setUp()
        self.thumbnail_fobj = create_thumbnail_from_base64(base64encoding())
        filepath = generate_object_storage_name(
            self.thumbnail_fobj.checksum, str(self.thumbnail_fobj)
        )
        with default_storage.open(filepath, "rb") as fobj:
            self.thumbnail_contents = fobj.read()

    def test_get_thumbnail_encoding(self):
        encoding = get_thumbnail_encoding(str(self.thumbnail_fobj))
        self.assertEqual(encoding, generated_base64encoding())

    @patch("contentcuration.api.default_storage.save")
    @patch("contentcuration.api.default_storage.exists", return_value=True)
    def test_existing_thumbnail_is_not_created(
        self, storage_exists_mock, storage_save_mock
    ):
        create_thumbnail_from_base64(base64encoding())
        storage_exists_mock.assert_called()
        storage_save_mock.assert_not_called()

    def test_internal_thumbnail(self):
        # Create exercise node (generated images are more predictable)
        node = ContentNode(title="Test Node", kind_id=content_kinds.VIDEO)
        node.save()

        file_data = [
            {
                "preset": None,
                "filename": str(self.thumbnail_fobj),
                "language": "en",
                "size": self.thumbnail_fobj.file_size,
            }
        ]
        map_files_to_node(self.user, node, file_data)
        self.assertTrue(isinstance(node.thumbnail_encoding, str))
        thumbnail_data = json.loads(node.thumbnail_encoding)
        self.assertEqual(thumbnail_data["base64"], generated_base64encoding())

    def test_exportchannel_thumbnail(self):
        node = ContentNode(title="Test Node", kind_id=content_kinds.VIDEO)
        node.save()
        newfile = create_associated_thumbnail(node, self.thumbnail_fobj)
        self.assertTrue(isinstance(newfile, File))
        thumbnail_data = json.loads(node.thumbnail_encoding)
        self.assertEqual(thumbnail_data["base64"], generated_base64encoding())


class NodeFileDeletionTestCase(StudioTestCase):
    def test_delete_empty_file_reference(self):
        checksum, _, storage_path = write_raw_content_to_storage(
            b"some fake PDF data", ext=".pdf"
        )
        assert default_storage.exists(storage_path), "file should be saved"
        delete_empty_file_reference(checksum, "pdf")
        assert not default_storage.exists(storage_path), "file should be deleted"
