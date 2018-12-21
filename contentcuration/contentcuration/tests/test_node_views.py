from base import StudioTestCase
from mock import patch

from contentcuration.models import Channel
from contentcuration.views.nodes import get_channel_thumbnail


class NodeViewsUtilityTestCase(StudioTestCase):

    def test_get_channel_thumbnail_empty_thumbnail(self):
        channel = Channel.objects.create()
        self.assertEqual(None, get_channel_thumbnail(channel.__dict__))

    def test_get_channel_thumbnail_path_thumbnail(self):
        return_path = "flapping_bird.jpg"
        with patch("contentcuration.views.nodes.generate_storage_url", return_value=return_path):
            channel = Channel.objects.create(thumbnail="/static/kolibri_flapping_bird.png")
            self.assertEqual(return_path, get_channel_thumbnail(channel.__dict__))

    def test_get_channel_thumbnail_encoding_valid(self):
        channel = Channel.objects.create(thumbnail="/content/kolibri_flapping_bird.png", thumbnail_encoding={"base64": "flappy_bird"})
        self.assertEqual("flappy_bird", get_channel_thumbnail(channel.__dict__))

    def test_get_channel_thumbnail_encoding_invalid(self):
        return_path = "flapping_bird.jpg"
        with patch("contentcuration.views.nodes.generate_storage_url", return_value=return_path):
            channel = Channel.objects.create(thumbnail="/content/kolibri_flapping_bird.png", thumbnail_encoding={})
            self.assertEquals(return_path, get_channel_thumbnail(channel.__dict__))
