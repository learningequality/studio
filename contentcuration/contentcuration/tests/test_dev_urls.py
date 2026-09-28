from django.test import override_settings
from django.test import RequestFactory
from django.test import SimpleTestCase

from contentcuration.dev_urls import file_server
from contentcuration.dev_urls import webpack_redirect_view


@override_settings(
    DEBUG=True,
    WEBPACK_DEV_PORT=34567,
    WEBPACK_DEV_PUBLIC_HOST="studio.test",
    WEBPACK_DEV_PUBLIC_PORT=45678,
)
class WebpackRedirectViewTestCase(SimpleTestCase):
    def test_redirects_to_the_advertised_address(self):
        request = RequestFactory().get("/__open-in-editor/", {"file": "Thing.vue"})
        response = webpack_redirect_view(request)
        self.assertEqual(
            response["Location"],
            "http://studio.test:45678/__open-in-editor?file=Thing.vue",
        )


class FileServerTestCase(SimpleTestCase):
    def get_redirect_host(self, http_host):
        request = RequestFactory().get(
            "/content/storage/8/8/8818ed27d0a84b016eb7907b5b4766c4.vtt",
            HTTP_HOST=http_host,
        )
        response = file_server(request, storage_path="storage/8/8/abc.vtt")
        return response["Location"].split("/")[2]

    @override_settings(AWS_S3_PUBLIC_ENDPOINT_URL=None)
    def test_unset_endpoint_follows_the_request_host(self):
        self.assertEqual(self.get_redirect_host("192.168.1.5:8080"), "192.168.1.5:9000")

    @override_settings(AWS_S3_PUBLIC_ENDPOINT_URL="http://minio.test:32768")
    def test_set_endpoint_wins(self):
        self.assertEqual(self.get_redirect_host("192.168.1.5:8080"), "minio.test:32768")
