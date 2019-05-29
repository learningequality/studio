import pytest
from base import BaseAPITestCase
from django.core.files.storage import default_storage
from django.core.urlresolvers import reverse_lazy
from le_utils.constants import content_kinds

from contentcuration.utils.export_writer import ChannelDetailsCSVWriter
from contentcuration.utils.export_writer import ChannelDetailsPDFWriter
from contentcuration.utils.export_writer import ChannelDetailsPPTWriter
from contentcuration.views.channels import get_channel_details_csv_endpoint
from contentcuration.views.channels import get_channel_details_pdf_endpoint
from contentcuration.views.channels import get_channel_details_ppt_endpoint


pytestmark = pytest.mark.django_db


class ChannelDetailsTestCase(BaseAPITestCase):

    def test_csv_exporter(self):
        filepath = ChannelDetailsCSVWriter([self.channel.pk]).write()
        self.assertTrue(default_storage.exists(filepath))

    def test_ppt_exporter(self):
        filepath = ChannelDetailsPPTWriter([self.channel.pk]).write()
        self.assertTrue(default_storage.exists(filepath))

    def test_pdf_condensed_exporter(self):
        filepath = ChannelDetailsPDFWriter([self.channel.pk], condensed=True).write()
        self.assertTrue(default_storage.exists(filepath))

    def test_pdf_exporter(self):
        filepath = ChannelDetailsPDFWriter([self.channel.pk]).write()
        self.assertTrue(default_storage.exists(filepath))

    def test_download_pdf_endpoint(self):
        request = self.create_get_request(reverse_lazy('get_channel_details_pdf_endpoint', kwargs={'channel_id': self.channel.pk}))
        response = get_channel_details_pdf_endpoint(request, self.channel.pk)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')

    def test_download_ppt_endpoint(self):
        request = self.create_get_request(reverse_lazy('get_channel_details_ppt_endpoint', kwargs={'channel_id': self.channel.pk}))
        response = get_channel_details_ppt_endpoint(request, self.channel.pk)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/vnd.openxmlformats-officedocument.presentationml.presentation')

    def test_download_csv_endpoint(self):
        request = self.create_get_request(reverse_lazy('get_channel_details_csv_endpoint', kwargs={'channel_id': self.channel.pk}))
        response = get_channel_details_csv_endpoint(request, self.channel.pk)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'text/csv')

    def test_pluralize_constant(self):
        exporter = ChannelDetailsPPTWriter([self.channel.pk])
        to_test = {content_kinds.TOPIC: '1 Topic',
                   content_kinds.VIDEO: '1 Video',
                   content_kinds.AUDIO: '1 Audio',
                   content_kinds.EXERCISE: '1 Exercise',
                   content_kinds.DOCUMENT: '1 Document',
                   content_kinds.HTML5: '1 Html App',
                   content_kinds.SLIDESHOW: '1 Slideshow',
                   'resource': '1 Total Resource'}
        for kind, result in to_test.items():
            self.assertEqual(exporter.pluralize_constant(1, kind), result)
