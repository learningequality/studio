import base64
import hashlib
from io import BytesIO

import pytest
import requests
from django.core.files.storage import FileSystemStorage
from django.test import TestCase
from django_s3_storage.storage import S3Storage
from mock import MagicMock

# The modules we'll test
from contentcuration.utils.storage_common import (
    UnknownStorageBackendError,
    _get_gcs_presigned_put_url,
    get_presigned_upload_url, )


class FileSystemStoragePresignedURLTestCase(TestCase):
    """
    Test cases for generating presigned URLs with the FileSystemStorage backend.
    """

    STORAGE = FileSystemStorage()

    def test_raises_error(self):
        """
        Check that we raise an error, since we don't handle creating presigned URLs
        for any storage other than GCS and S3.
        """
        with pytest.raises(UnknownStorageBackendError):
            get_presigned_upload_url(
                "nice", "err", 5, 0, storage=self.STORAGE,
            )


class GoogleCloudStoragePresignedURLUnitTestCase(TestCase):
    """
    Test cases for generating presigned URLs for GCS.

    Note that most of the tests here deal with mocks, since
    we have no way to replicate GCS calls locally.
    """

    def setUp(self):
        self.client = MagicMock()
        self.generate_signed_url_method = self.client.get_bucket.return_value.get_blob.return_value.generate_signed_url
        self.generate_signed_url_method.return_value = "https://storage.googleapis.com/fake/object.jpg"

    def test_that_generate_signed_url_is_called(self):
        """
        Check that we even call blob.generate_signed_url in the first place.
        """
        bucket = "fake"
        _get_gcs_presigned_put_url(self.client, bucket, "/object.jpg", "aBc", 0, 0)
        self.generate_signed_url_method.assert_called_once()

    def test_that_we_return_a_string(self):
        """
        Check that _get_gcs_presigned_put_url returns a string.
        """
        bucket = "fake"
        ret = _get_gcs_presigned_put_url(self.client, bucket, "/object.jpg", "aBc", 0, 0)
        assert isinstance(ret, str)

    def test_generate_signed_url_called_with_required_arguments(self):
        """
        Check that we call generate_signed_url with the following arguments:

        - method: make sure we use "PUT" as the HTTP method
        - content_md5 the Content-MD5 we passed in to _get_gcs_presigned_put_url. This ensures the client
            uploads the Content-MD5 we promised.
        - expiration: the lifetime_sec field we passed in to _get_gcs_presigned_put_url should match the
            value we pass in to generate_signed_url.
        """
        # Required parameters
        method = "PUT"
        content_md5 = "abc"
        bucket_name = "fake"
        filepath = "object.jpg"
        lifetime = 20  # seconds
        content_length = 90  # content length doesn't matter since we actually don't upload

        _get_gcs_presigned_put_url(self.client, bucket_name, filepath, content_md5, lifetime, content_length)

        # assert that we're creating the right object
        self.client.get_bucket.assert_called_once_with(bucket_name)
        self.client.get_bucket.return_value.get_blob.assert_called_once_with(filepath)

        # assert that we call generate_signed_url with other parameters we want to guarantee
        self.generate_signed_url_method.assert_called_once_with(
            method=method,
            content_md5=content_md5,
            expiration=lifetime,
            headers={"Content-Length": content_length}
        )


class S3StoragePresignedURLUnitTestCase(TestCase):
    """
    Test cases for generating presigned URLs for S3 storage, i.e. Minio.
    """

    STORAGE = S3Storage()

    def setUp(self):
        self.client = MagicMock()

    def test_returns_string_if_inputs_are_valid(self):
        """
        Sanity check that get_presigned_upload_url returns a string if all arguments
        are valid.
        """

        # use a real connection here as a sanity check
        ret = get_presigned_upload_url("a/b/abc.jpg", "aBc", 10, 1, storage=self.STORAGE, client=None)
        assert isinstance(ret, str)

    def test_can_upload_file_to_presigned_url(self):
        """
        Test that we can get a 200 OK when we upload a file to the URL returned by get_presigned_upload_url.
        """
        file_contents = b"blahfilecontents"
        file = BytesIO(file_contents)
        # S3 expects a base64-encoded MD5 checksum
        md5 = hashlib.md5(file_contents)
        md5_checksum = base64.encodebytes(md5.digest())

        url = get_presigned_upload_url("a/b/blahfile.jpg", md5_checksum, 10, len(file_contents))

        resp = requests.put(url, files={"blahfile.jpg": file})
        resp.raise_for_status()
