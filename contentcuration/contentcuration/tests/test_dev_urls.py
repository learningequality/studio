import os
from unittest.mock import patch

from django.test import override_settings
from django.test import RequestFactory
from django.test import SimpleTestCase

from contentcuration.dev_urls import file_server


@override_settings(AWS_S3_BUCKET_NAME="content")
class FileServerTestCase(SimpleTestCase):
    def setUp(self):
        storage_url = patch(
            "contentcuration.models.default_storage.url",
            return_value="https://storage.invalid/missing",
        )
        storage_url.start()
        self.addCleanup(storage_url.stop)

    @patch.dict(os.environ, {"STORAGE_EMULATOR_HOST": "http://gcs:4567"})
    def test_emulator_redirect_uses_browser_hostname(self):
        response = file_server(
            RequestFactory().get(
                "/content/storage/a/b/abc.mp3", HTTP_HOST="studio.example:8080"
            ),
            "storage/a/b/abc.mp3",
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            response.url,
            "http://studio.example:4567/download/storage/v1/b/content/o/storage/a/b/abc.mp3",
        )

    @patch.dict(os.environ, {"STORAGE_EMULATOR_HOST": ""})
    @override_settings(AWS_S3_ENDPOINT_URL="https://storage.googleapis.com")
    def test_real_bucket_redirect(self):
        response = file_server(RequestFactory().get("/"), "storage/a/b/abc.mp3")
        self.assertEqual(
            response.url, "https://storage.googleapis.com/content/storage/a/b/abc.mp3"
        )

    def test_missing_path(self):
        self.assertEqual(file_server(RequestFactory().get("/")).status_code, 404)
