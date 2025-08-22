from django.conf import settings as ccsettings
from django.template.loader import render_to_string
from mock import mock

from contentcuration.forms import StorageRequestForm
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.views.settings import StorageSettingsView


class StorageSettingsViewTestCase(StudioAPITestCase):
    def setUp(self):
        super(StorageSettingsViewTestCase, self).setUp()
        self.view = StorageSettingsView()
        self.view.request = mock.Mock()
        self.view.request.user = testdata.user(email="tester@tester.com")

    def test_storage_request(self):

        with mock.patch("contentcuration.views.settings.send_mail") as send_mail:

            data = dict(
                storage="storage",
                kind="kind",
                resource_count="resource_count",
                resource_size="resource_size",
                creators="creators",
                sample_link="sample_link",
                license="license",
                public="channel1, channel2",
                audience="audience",
                import_count="import_count",
                location="location",
                uploading_for="uploading_for",
                organization_type="organization_type",
                time_constraint="time_constraint",
                message="message",
            )
            self.form = StorageRequestForm(data=data)

            self.assertTrue(self.form.is_valid())
            self.view.form_valid(self.form)

            message = render_to_string(
                "settings/storage_request_email.txt",
                {
                    "data": self.form.cleaned_data,
                    "user": self.view.request.user,
                    "channels": ["channel1", "channel2"],
                },
            )

            send_mail.assert_called_once()
            send_mail.assert_called_with(
                f"Kolibri Studio storage request from {self.view.request.user.email}",
                message,
                ccsettings.DEFAULT_FROM_EMAIL,
                [ccsettings.SPACE_REQUEST_EMAIL, self.view.request.user.email],
            )
