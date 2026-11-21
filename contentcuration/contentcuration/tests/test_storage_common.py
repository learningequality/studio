import hashlib
from datetime import timedelta
from io import BytesIO

import requests
from django.core.files.storage import default_storage
from django.test import override_settings
from django.test import SimpleTestCase
from mock import MagicMock

from .base import StudioTestCase
from contentcuration.models import generate_object_storage_name
from contentcuration.utils.gcs_storage import GoogleCloudStorage
from contentcuration.utils.storage_common import determine_content_type
from contentcuration.utils.storage_common import get_presigned_upload_url

# The modules we'll test


class MimeTypesTestCase(SimpleTestCase):
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


@override_settings(GCS_EMULATOR_HOST=None)
class GoogleCloudStoragePresignedURLUnitTestCase(SimpleTestCase):
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

    def test_that_we_return_a_string(self):
        """
        Check that generate_upload_url returns a string.
        """
        storage = GoogleCloudStorage(self.client, "fake")
        ret = storage.generate_upload_url(
            "/object.jpg", "d41d8cd98f00b204e9800998ecf8427e", 0, 0
        )
        assert isinstance(ret, str)

    def test_generate_signed_url_called_with_required_arguments(self):
        """
        Check that we call generate_signed_url with the following arguments:

        - method: make sure we use "PUT" as the HTTP method
        - content_md5 the base64 encoding of the md5 we passed in to generate_upload_url. This ensures the client
            uploads the Content-MD5 we promised.
        - expiration: the lifetime_sec field we passed in to generate_upload_url should match the
            value we pass in to generate_signed_url.
        """
        bucket_name = "fake"
        filepath = "object.jpg"
        lifetime = 20  # seconds

        storage = GoogleCloudStorage(self.client, bucket_name)
        storage.generate_upload_url(
            filepath, "d41d8cd98f00b204e9800998ecf8427e", lifetime, 0
        )

        # assert that we're creating the right object
        self.client.get_bucket.assert_called_once_with(bucket_name)
        self.client.get_bucket.return_value.blob.assert_called_once_with(filepath)

        # assert that we call generate_signed_url with other parameters we want to guarantee
        self.generate_signed_url_method.assert_called_once_with(
            method="PUT",
            content_md5="1B2M2Y8AsgTpgAmY7PhCfg==",
            expiration=timedelta(seconds=lifetime),
            content_type="image/jpeg",
        )

    def test_create_resumable_session_pins_md5_size_and_returns_url(self):
        storage = GoogleCloudStorage(self.client, "bucket")
        blob = self.client.get_bucket.return_value.blob.return_value
        blob.create_resumable_upload_session.return_value = "https://session.url"

        url = storage.create_resumable_upload_session(
            "storage/a/b/abc.jpg",
            "d41d8cd98f00b204e9800998ecf8427e",
            2048,
        )

        assert url == "https://session.url"
        assert blob.md5_hash == "1B2M2Y8AsgTpgAmY7PhCfg=="  # hex checksum, b64-encoded
        assert blob.content_type == "image/jpeg"
        assert blob.metadata == {"declared-size": "2048"}
        blob.create_resumable_upload_session.assert_called_once()


class EmulatorStorageUploadTestCase(StudioTestCase):
    def test_can_upload_file_to_presigned_url(self):
        """
        Test that we can get a 200 OK when we upload a file to the URL returned by get_presigned_upload_url.
        """
        file_contents = b"blahfilecontents"
        file = BytesIO(file_contents)
        md5_checksum = hashlib.md5(file_contents).hexdigest()

        filename = "blahfile.jpg"
        filepath = generate_object_storage_name(md5_checksum, filename)

        ret = get_presigned_upload_url(filepath, md5_checksum, 1000, len(file_contents))
        url = ret["uploadURL"]
        content_type = ret["mimetype"]

        resp = requests.put(
            url,
            data=file,
            headers={
                "Content-Type": content_type,
            },
        )
        resp.raise_for_status()
        self.assertTrue(default_storage.exists(filepath))


class EmulatorUploadURLTestCase(SimpleTestCase):
    def test_uses_session_without_signing(self):
        client = MagicMock()
        storage = GoogleCloudStorage(client, "bucket")
        blob = client.get_bucket.return_value.blob.return_value
        blob.create_resumable_upload_session.return_value = "http://emulator/session"
        blob.generate_signed_url.side_effect = AssertionError("signing")
        with override_settings(GCS_EMULATOR_HOST="http://localhost:4443"):
            result = get_presigned_upload_url(
                "file.jpg", "d41d8cd98f00b204e9800998ecf8427e", 60, 12, storage=storage
            )
        self.assertEqual(result["uploadURL"], "http://emulator/session")
        self.assertEqual(blob.metadata, {"declared-size": "12"})

    def test_real_bucket_uses_signed_url(self):
        client = MagicMock()
        storage = GoogleCloudStorage(client, "bucket")
        blob = client.get_bucket.return_value.blob.return_value
        blob.generate_signed_url.return_value = "https://signed/upload"
        blob.create_resumable_upload_session.side_effect = AssertionError("session")
        with override_settings(GCS_EMULATOR_HOST=None):
            result = get_presigned_upload_url(
                "file.jpg", "d41d8cd98f00b204e9800998ecf8427e", 60, 12, storage=storage
            )
        self.assertEqual(result["uploadURL"], "https://signed/upload")
