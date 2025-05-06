import codecs
import hashlib
from datetime import timedelta
from io import BytesIO

import pytest
import requests
from django.core.files.storage import FileSystemStorage
from django.test import TestCase
from django_s3_storage.storage import S3Storage
from mock import MagicMock

from ..base import StudioTestCase
from contentcuration.models import generate_object_storage_name
from contentcuration.utils.storage.common import _get_gcs_presigned_put_url
from contentcuration.utils.storage.common import determine_content_type
from contentcuration.utils.storage.common import get_presigned_upload_url
from contentcuration.utils.storage.common import UnknownStorageBackendError
# The modules we'll test


class MimeTypesTestCase(TestCase):
    """
    Tests for determining and setting mimetypes.
    """

    def test_determine_function_returns_a_string(self):
        """
        Sanity check that _etermine_content_type returns a string
        for the happy path.
        """
        typ = determine_content_type("me.pdf")

        assert isinstance(typ, str)

    def test_determine_function_returns_pdf_for_pdfs(self):
        """
        Check that determine_content_type returns an application/pdf
        for .pdf suffixed strings.
        """
        assert determine_content_type("me.pdf") == "application/pdf"

    def test_determine_function_returns_zip_for_zips(self):
        """
        Check that determine_content_type returns an application/zip
        for .pdf suffixed strings.
        """
        assert determine_content_type("me.zip") == "application/zip"

    def test_determine_function_returns_epub_for_epubs(self):
        """
        Check that determine_content_type returns an application/epub+zip
        for .pdf suffixed strings.
        """
        assert determine_content_type("me.epub") == "application/epub+zip"

    def test_determine_function_returns_octet_stream_for_unknown_formats(self):
        """
        Check that we return application/octet-stream when we give a filename
        with an unknown extension.
        """
        typ = determine_content_type("unknown.format")
        assert typ == "application/octet-stream"


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
        self.generate_signed_url_method = (
            self.client.get_bucket.return_value.blob.return_value.generate_signed_url
        )
        self.generate_signed_url_method.return_value = (
            "https://storage.googleapis.com/fake/object.jpg"
        )

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
        ret = _get_gcs_presigned_put_url(
            self.client, bucket, "/object.jpg", "aBc", 0, 0
        )
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
        mimetype = "doesntmatter"

        _get_gcs_presigned_put_url(
            self.client, bucket_name, filepath, content_md5, lifetime, mimetype
        )

        # assert that we're creating the right object
        self.client.get_bucket.assert_called_once_with(bucket_name)
        self.client.get_bucket.return_value.blob.assert_called_once_with(filepath)

        lifetime_timedelta = timedelta(seconds=lifetime)

        # assert that we call generate_signed_url with other parameters we want to guarantee
        self.generate_signed_url_method.assert_called_once_with(
            method=method,
            content_md5=content_md5,
            expiration=lifetime_timedelta,
            content_type=mimetype,
        )


class S3StoragePresignedURLUnitTestCase(StudioTestCase):
    """
    Test cases for generating presigned URLs for S3 storage, i.e. Minio.
    """

    STORAGE = S3Storage()

    def setUp(self):
        self.client = MagicMock()
        super().setUp()

    def test_returns_string_if_inputs_are_valid(self):
        """
        Sanity check that get_presigned_upload_url returns a string if all arguments
        are valid.
        """

        # use a real connection here as a sanity check
        ret = get_presigned_upload_url(
            "a/b/abc.jpg", "aBc", 10, 1, storage=self.STORAGE, client=None
        )
        url = ret["uploadURL"]

        assert isinstance(url, str)

    def test_can_upload_file_to_presigned_url(self):
        """
        Test that we can get a 200 OK when we upload a file to the URL returned by get_presigned_upload_url.
        """
        file_contents = b"blahfilecontents"
        file = BytesIO(file_contents)
        # S3 expects a base64-encoded MD5 checksum
        md5 = hashlib.md5(file_contents)
        md5_checksum = md5.hexdigest()
        md5_checksum_base64 = codecs.encode(codecs.decode(md5_checksum, "hex"), "base64").decode()

        filename = "blahfile.jpg"
        filepath = generate_object_storage_name(md5_checksum, filename)

        ret = get_presigned_upload_url(filepath, md5_checksum_base64, 1000, len(file_contents))
        url = ret["uploadURL"]
        content_type = ret["mimetype"]

        resp = requests.put(
            url,
            data=file,
            headers={
                "Content-Type": content_type,
            }
        )
        resp.raise_for_status()
