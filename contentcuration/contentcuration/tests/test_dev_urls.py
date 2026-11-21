from django.test import override_settings
from django.test import SimpleTestCase


@override_settings(
    ROOT_URLCONF="contentcuration.dev_urls",
    GCS_BUCKET_NAME="content",
    ALLOWED_HOSTS=["testserver", "studio.example"],
)
class FileServerTestCase(SimpleTestCase):
    @override_settings(GCS_EMULATOR_HOST="http://gcs:4567")
    def test_emulator_redirect_uses_browser_hostname(self):
        response = self.client.get(
            "/content/storage/a/b/abc.mp3", HTTP_HOST="studio.example:8080"
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            response.url,
            "http://studio.example:4567/download/storage/v1/b/content/o/storage/a/b/abc.mp3",
        )

    @override_settings(
        GCS_EMULATOR_HOST=None, GCS_ENDPOINT_URL="https://storage.googleapis.com"
    )
    def test_real_bucket_redirect(self):
        response = self.client.get("/content/storage/a/b/abc.mp3")
        self.assertEqual(
            response.url, "https://storage.googleapis.com/content/storage/a/b/abc.mp3"
        )

    def test_missing_path(self):
        self.assertEqual(self.client.get("/content/").status_code, 404)
