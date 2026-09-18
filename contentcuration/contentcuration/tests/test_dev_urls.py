from django.test import override_settings
from django.test import RequestFactory
from django.test import SimpleTestCase

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
