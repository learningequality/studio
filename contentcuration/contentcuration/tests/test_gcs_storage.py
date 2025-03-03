#!/usr/bin/env python
from io import BytesIO

import pytest
from django.core.files import File
from django.test import TestCase
from google.cloud.storage import Client
from google.cloud.storage.blob import Blob
from mixer.main import mixer
from mock import create_autospec
from mock import patch

from contentcuration.utils.gcs_storage import GoogleCloudStorage as gcs


class GoogleCloudStorageSaveTestCase(TestCase):
    """
    Tests for GoogleCloudStorage.save().
    """

    def setUp(self):
        self.blob_class = create_autospec(Blob)
        self.blob_obj = self.blob_class("blob", "blob")
        self.mock_client = create_autospec(Client)
        self.storage = gcs(client=self.mock_client())
        self.content = BytesIO(b"content")

    def test_calls_upload_from_file(self):
        """
        Check if upload_from_file is called when we call GoogleCloudStorage.save().
        """
        self.storage.save("myfile.jpg", self.content, blob_object=self.blob_obj)

        # Check that blob.upload_from_file() has been called inside storage.save()
        self.blob_obj.upload_from_file.assert_called()

    def test_calls_upload_from_file_with_a_file_object_and_content_type(self):
        """
        Check that we call upload_from_file with a file object and content type when
        we call GoogleCloudStorage.save().
        """
        self.storage.save("myfile.jpg", self.content, blob_object=self.blob_obj)

        # Check that we pass self.content file_object to upload_from_file
        self.blob_obj.upload_from_file.assert_called_once_with(self.content, content_type="image/jpeg")

    def test_checks_does_not_upload_file_if_empty(self):
        """
        Check that it doesn't call upload_from_file if the file is empty.
        """
        content = BytesIO()
        self.storage.save("myfile.jpg", content, blob_object=self.blob_obj)

        # check that upload_from_file is never called
        self.blob_obj.upload_from_file.assert_not_called()

    def test_uploads_max_age_of_5_if_content_database(self):
        """
        Check that we set a max-age of 5 if we're uploading a content database
        """
        filename = "content/databases/myfile.sqlite3"
        self.storage.save(filename, self.content, blob_object=self.blob_obj)
        assert "max-age=5" in self.blob_obj.cache_control

    def test_uploads_cache_control_private_if_content_database(self):
        """
        Check that set set a cache-control of private if we're uploading a content database.
        This ensures that no proxy will cache this file.
        """
        filename = "content/databases/myfile.sqlite3"
        self.storage.save(filename, self.content, blob_object=self.blob_obj)
        assert "private" in self.blob_obj.cache_control

    @patch("contentcuration.utils.gcs_storage.BytesIO")
    @patch("contentcuration.utils.gcs_storage.GoogleCloudStorage._is_file_empty", return_value=False)
    def test_gzip_if_content_database(self, bytesio_mock, file_empty_mock):
        """
        Check that if we're uploading a gzipped content database and
        if the BytesIO object has been closed.
        """
        filename = "content/databases/myfile.sqlite3"
        self.storage.save(filename, self.content, blob_object=self.blob_obj)
        assert self.blob_obj.content_encoding == "gzip"
        assert bytesio_mock.called


class GoogleCloudStorageOpenTestCase(TestCase):
    """
    Tests for GoogleCloudStorage.open().
    """

    class RandomFileSchema:
        """
        A schema for a file we're about to upload.
        """
        contents = str
        filename = str

    def setUp(self):
        self.blob_class = create_autospec(Blob)
        self.blob_obj = self.blob_class("blob", "blob")
        self.mock_client = create_autospec(Client)
        self.storage = gcs(client=self.mock_client())
        self.local_file = mixer.blend(self.RandomFileSchema)

    def test_raises_error_if_mode_is_not_rb(self):
        """
        open() should raise an assertion error if passed in a mode flag that's not "rb".
        """
        with pytest.raises(AssertionError):
            self.storage.open("randfile", mode="wb")

    def test_calls_blob_download_to_file(self):
        """
        Check that open() eventually calls blob.download_to_file().
        """
        self.storage.open(self.local_file.filename, blob_object=self.blob_obj)

        # assert that we called download_from_file
        self.blob_obj.download_to_file.assert_called()

    def test_returns_django_file(self):
        """
        Test that we return a Django File instance.
        """
        f = self.storage.open(self.local_file.filename, blob_object=self.blob_obj)

        assert isinstance(f, File)
        # This checks that an actual temp file was written on disk for the file.git
        assert f.name
