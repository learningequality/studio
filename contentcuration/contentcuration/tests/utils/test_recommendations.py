from automation.utils.appnexus import errors
from django.test import TestCase
from mock import MagicMock
from mock import patch

from contentcuration.utils.recommendations import EmbeddingsResponse
from contentcuration.utils.recommendations import Recommendations
from contentcuration.utils.recommendations import RecommendationsAdapter


class RecommendationsTestCase(TestCase):
    def test_backend_initialization(self):
        recomendations = Recommendations()
        self.assertIsNotNone(recomendations)
        self.assertIsInstance(recomendations, Recommendations)


class RecommendationsAdapterTestCase(TestCase):
    def setUp(self):
        self.adapter = RecommendationsAdapter(MagicMock())
        self.topic = {
            'id': 'topic_id',
            'title': 'topic_title',
            'description': 'topic_description',
            'language': 'en',
            'ancestors': [
                {
                    'id': 'ancestor_id',
                    'title': 'ancestor_title',
                    'description': 'ancestor_description',
                }
            ]
        }

    def test_adapter_initialization(self):
        self.assertIsNotNone(self.adapter)
        self.assertIsInstance(self.adapter, RecommendationsAdapter)

    @patch('contentcuration.utils.recommendations.EmbedTopicsRequest')
    def test_embed_topics_backend_connect_success(self, embed_topics_request_mock):
        self.adapter.backend.connect.return_value = True
        self.adapter.backend.make_request.return_value = MagicMock(spec=EmbeddingsResponse)
        response = self.adapter.embed_topics(self.topic)
        self.adapter.backend.connect.assert_called_once()
        self.adapter.backend.make_request.assert_called_once()
        self.assertIsInstance(response, EmbeddingsResponse)

    def test_embed_topics_backend_connect_failure(self):
        self.adapter.backend.connect.return_value = False
        with self.assertRaises(errors.ConnectionError):
            self.adapter.embed_topics(self.topic)
        self.adapter.backend.connect.assert_called_once()
        self.adapter.backend.make_request.assert_not_called()

    @patch('contentcuration.utils.recommendations.EmbedTopicsRequest')
    def test_embed_topics_make_request_exception(self, embed_topics_request_mock):
        self.adapter.backend.connect.return_value = True
        self.adapter.backend.make_request.side_effect = Exception("Mocked exception")
        response = self.adapter.embed_topics(self.topic)
        self.adapter.backend.connect.assert_called_once()
        self.adapter.backend.make_request.assert_called_once()
        self.assertIsInstance(response, EmbeddingsResponse)
        self.assertEqual(str(response.error), "Mocked exception")
