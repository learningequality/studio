from automation.utils.appnexus import errors
from django.test import TestCase
from mock import MagicMock
from mock import patch

from contentcuration.models import ContentNode
from contentcuration.utils.recommendations import EmbeddingsResponse
from contentcuration.utils.recommendations import EmbedTopicsRequest
from contentcuration.utils.recommendations import Recommendations
from contentcuration.utils.recommendations import RecommendationsAdapter
from contentcuration.utils.recommendations import RecommendationsResponse


class RecommendationsTestCase(TestCase):
    def test_backend_initialization(self):
        recommendations = Recommendations()
        self.assertIsNotNone(recommendations)
        self.assertIsInstance(recommendations, Recommendations)


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
        self.resources = [
            MagicMock(spec=ContentNode),
        ]

    def test_adapter_initialization(self):
        self.assertIsNotNone(self.adapter)
        self.assertIsInstance(self.adapter, RecommendationsAdapter)

    @patch('contentcuration.utils.recommendations.EmbedTopicsRequest')
    def test_get_recommendations_backend_connect_success(self, get_recommendations_request_mock):
        mock_response = MagicMock(spec=RecommendationsResponse)
        mock_response.data = []
        mock_response.error = None

        self.adapter.backend.connect.return_value = True
        self.adapter.backend.make_request.return_value = mock_response
        response = self.adapter.get_recommendations(self.topic)
        self.adapter.backend.connect.assert_called_once()
        self.adapter.backend.make_request.assert_called_once()
        self.assertIsInstance(response, RecommendationsResponse)

    @patch('contentcuration.utils.recommendations.EmbedTopicsRequest')
    def test_get_recommendations_backend_connect_failure(self, embed_topics_request_mock):
        mock_request_instance = MagicMock(spec=EmbedTopicsRequest)
        embed_topics_request_mock.return_value = mock_request_instance

        self.adapter.backend.connect.return_value = False
        with self.assertRaises(errors.ConnectionError):
            self.adapter.get_recommendations(self.topic)
        self.adapter.backend.connect.assert_called_once()
        self.adapter.backend.make_request.assert_not_called()

    @patch('contentcuration.utils.recommendations.EmbedContentRequest')
    def test_embed_content_backend_connect_success(self, embed_content_request_mock):
        mock_response = MagicMock(spec=EmbeddingsResponse)
        mock_response.error = None

        self.adapter.backend.connect.return_value = True
        self.adapter.backend.make_request.return_value = mock_response
        response = self.adapter.embed_content(self.resources)
        self.adapter.backend.connect.assert_called_once()
        self.adapter.backend.make_request.assert_called_once()
        self.assertIsInstance(response, bool)
        self.assertTrue(response)

    @patch('contentcuration.utils.recommendations.EmbedContentRequest')
    def test_embed_content_backend_connect_failure(self, embed_content_request_mock):
        self.adapter.backend.connect.return_value = False
        with self.assertRaises(errors.ConnectionError):
            self.adapter.embed_content(self.resources)
        self.adapter.backend.connect.assert_called_once()
        self.adapter.backend.make_request.assert_not_called()
