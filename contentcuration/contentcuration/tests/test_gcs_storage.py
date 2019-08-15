#!/usr/bin/env python
from cStringIO import StringIO

import pytest
from django.core.files import File
from django.test import TestCase
from google.cloud.exceptions import NotFound
from google.cloud.storage import Bucket
from google.cloud.storage import Client
from google.cloud.storage.blob import Blob
from mixer.main import mixer
from mock import create_autospec
from mock import MagicMock

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

    def test_checks_does_not_upload_file_if_empty(self):
        """
        Check that it doesn't call upload_from_file if the file is empty.
        """
        content = StringIO("")
        self.storage.save("myfile.jpg", content, blob_object=self.blob_obj)

        # check that upload_from_file is never called
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


class GoogleCloudStorageExistsTestCase(TestCase):
    class RandomFileSchema:
        """
        A schema for a file we're about to upload.
        """
        contents = str
        filename = str

    def setUp(self):
        self.blob_class = create_autospec(Blob)
        self.blob_obj = self.blob_class("blob", "blob")

        self.mock_client = create_autospec(Client)()
        self.mock_bucket = create_autospec(Bucket)(self.mock_client)
        self.mock_client.get_bucket.return_value = self.mock_bucket

        self.storage = gcs(client=self.mock_client)

    def test_exists__yes(self):
        self.mock_bucket.get_blob.return_value = self.blob_obj
        self.assertTrue(self.storage.exists('some blob name'))
        self.mock_bucket.get_blob.assert_called_once_with('some blob name')

    def test_exists__no(self):
        self.mock_bucket.get_blob.return_value = None
        self.assertFalse(self.storage.exists('some blob name'))
        self.mock_bucket.get_blob.assert_called_once_with('some blob name')

    def test_all_exist__yes(self):
        batch = MagicMock()
        self.mock_client.batch.return_value = batch
        batch.__enter__.return_value = batch

        self.mock_bucket.blob.return_value = self.blob_obj

        self.assertTrue(self.storage.all_exist([
            'blob name 1',
            'blob name 2',
        ]))

        args, _ = self.mock_bucket.blob.call_args_list[0]
        self.assertEqual(1, len(args))
        self.assertEqual('blob name 1', args[0])

        args, _ = self.mock_bucket.blob.call_args_list[1]
        self.assertEqual(1, len(args))
        self.assertEqual('blob name 2', args[0])

        self.assertEqual(2, self.blob_obj.exists.call_count)

    def test_all_exist__no(self):
        batch = MagicMock()
        err = NotFound('Blob not found')

        # NotFound errors will be thrown on __exit__ of batch
        self.mock_client.batch.return_value = batch
        batch.__enter__.return_value = batch
        batch.__exit__.side_effect = err

        self.mock_bucket.blob.return_value = self.blob_obj

        result, actual_err = self.storage.all_exist([
            'blob name 1',
            'blob name 2',
        ])
        self.assertFalse(result)
        self.assertIs(err, actual_err)

        args, _ = self.mock_bucket.blob.call_args_list[0]
        self.assertEqual(1, len(args))
        self.assertEqual('blob name 1', args[0])

        args, _ = self.mock_bucket.blob.call_args_list[1]
        self.assertEqual(1, len(args))
        self.assertEqual('blob name 2', args[0])

        self.assertEqual(2, self.blob_obj.exists.call_count)
