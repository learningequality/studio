import mock
from django.test import override_settings
from django.test import RequestFactory
from django.test import SimpleTestCase

from contentcuration.views.pwa import ServiceWorkerView


@override_settings(
    DEBUG=True,
    WEBPACK_DEV_PORT=34567,
    WEBPACK_DEV_PUBLIC_HOST="studio.test",
    WEBPACK_DEV_PUBLIC_PORT=45678,
)
class ServiceWorkerViewTestCase(SimpleTestCase):
    def test_dev_service_worker_is_fetched_from_the_bind_address(self):
        view = ServiceWorkerView()
        view.setup(RequestFactory().get("/serviceWorker.js"))

        with mock.patch(
            "requests.get", return_value=mock.Mock(content=b"// dev service worker")
        ) as get:
            context = view.get_context_data()

        get.assert_called_once_with("http://127.0.0.1:34567/dist/serviceWorker.js")
        self.assertEqual(context["webpack_service_worker"], "// dev service worker")
