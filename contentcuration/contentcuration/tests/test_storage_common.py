import hashlib
import StringIO

import pytest
import requests
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.test import TestCase
from django_s3_storage.storage import S3Storage
from mock import MagicMock

# The modules we'll test
from contentcuration.utils.storage_common import (UnknownStorageBackendError,
                                                  get_presigned_upload_url)


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
                "nice", "err", 5, storage=self.STORAGE,
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
        ret = get_presigned_upload_url("a/b/abc.jpg", "aBc", 10, storage=self.STORAGE, client=None)
        assert isinstance(ret, basestring)

    def test_can_upload_file_to_presigned_url(self):
        """
        Test that we can get a 200 OK when we upload a file to the URL returned by get_presigned_upload_url.
        """
        file_contents = "blahfilecontents"
        file = StringIO.StringIO(file_contents)
        # S3 expects a base64-encoded MD5 checksum
        md5 = hashlib.md5(file_contents)
        md5_checksum = md5.digest().encode("base64").strip()

        url = get_presigned_upload_url("a/b/blahfile.jpg", md5_checksum, 10)

        resp = requests.put(url, files={"blahfile.jpg": file})
        resp.raise_for_status()
