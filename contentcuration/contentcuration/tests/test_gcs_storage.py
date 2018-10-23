#!/usr/bin/env python
from cStringIO import StringIO

import pytest
from django.core.files import File
from django.test import TestCase
from google.cloud.storage import Client
from google.cloud.storage.blob import Blob
from mixer.main import mixer
from mock import create_autospec

from contentcuration.utils.gcs_storage import GoogleCloudStorage as gcs


class MimeTypesTestCase(TestCase):
    """
    Tests for determining and setting mimetypes.
    """

    def test_determine_function_returns_a_string(self):
        """
        Sanity check that _determine_content_type returns a string
        for the happy path.
        """
        typ = gcs._determine_content_type("me.pdf")

        assert isinstance(typ, str)

    def test_determine_function_returns_pdf_for_pdfs(self):
        """
        Check that _determine_content_type returns an application/pdf
        for .pdf suffixed strings.
        """
        assert gcs._determine_content_type("me.pdf") == "application/pdf"

    def test_determine_function_returns_octet_stream_for_unknown_formats(self):
        """
        Check that we return application/octet-stream when we give a filename
        with an unknown extension.
        """
        typ = gcs._determine_content_type("unknown.format")
        assert typ == "application/octet-stream"


class GoogleCloudStorageSaveTestCase(TestCase):
    """
    Tests for GoogleCloudStorage.save().
    """

    def setUp(self):
        self.blob_class = create_autospec(Blob)
        self.blob_obj = self.blob_class("blob", "blob")
        self.mock_client = create_autospec(Client)
        self.storage = gcs(client=self.mock_client())
        self.content = StringIO("content")

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

    def test_save_an_existing_exercise(self):
        """
        Test if an existing exercise would be saved again
        """
        self.storage.save("testuploadexercises.perseus", self.content, blob_object=self.blob_obj)
        self.blob_obj.upload_from_file.assert_not_called()

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
