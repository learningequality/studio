import copy
import uuid

from automation.models import RecommendationsCache
from automation.utils.appnexus import errors
from automation.utils.appnexus.base import BackendResponse
from django.test import TestCase
from kolibri_public.models import ContentNode as PublicContentNode
from mock import MagicMock
from mock import patch

from contentcuration.models import Channel
from contentcuration.models import ContentKind
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
    @classmethod
    def setUpTestData(cls):
        cls.adapter = RecommendationsAdapter(MagicMock())
        cls.topic = {
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
        cls.channel_id = 'test_channel_id'
        cls.resources = [MagicMock(spec=ContentNode)]

        cls.request = EmbedTopicsRequest(
            method='POST',
            url='http://test.com',
            path='/test/path',
            params={'override_threshold': False},
            json=cls.topic
        )
        cls.api_response = BackendResponse(data=[
            {'contentnode_id': '1234567890abcdef1234567890abcdef', 'rank': 0.9},
            {'contentnode_id': 'abcdef1234567890abcdef1234567890', 'rank': 0.8}
        ])
        cls.recommendations_response = [
            {
                'id': '1234567890abcdef1234567890abcdef',
                'node_id': '1234567890abcdef1234567890abcdef',
                'parent_id': None,
                'main_tree_id': '4387374055304864a731f3e705d64639'
            },
            {
                'id': 'abcdef1234567890abcdef1234567890',
                'node_id': 'abcdef1234567890abcdef1234567890',
                'parent_id': None,
                'main_tree_id': '0548a548dda8487b8ac2f81145737cfc'
            }
        ]

        cls.content_kind = ContentKind.objects.create(kind='topic')

        cls.channel_1 = Channel.objects.create(
            id='ddec09d74e834241a580c480ee37879c',
            name='Channel 1',
            main_tree=ContentNode.objects.create(
                id='4387374055304864a731f3e705d64639',
                title='Main tree 1',
                content_id=uuid.uuid4(),
                node_id='e947222469504e789476cf3ffc5e3801',
                kind=cls.content_kind
            )
        )
        cls.channel_2 = Channel.objects.create(
            id='84fcaec1e0514b62899d7f436384c401',
            name='Channel 2',
            main_tree=ContentNode.objects.create(
                id='0548a548dda8487b8ac2f81145737cfc',
                title='Main tree 2',
                content_id=uuid.uuid4(),
                node_id='f7547941d75d4712a53f566b4bf93250',
                kind=cls.content_kind
            )
        )

        cls.public_content_node_1 = PublicContentNode.objects.create(
            id=uuid.UUID('1234567890abcdef1234567890abcdef'),
            title='Public Content Node 1',
            content_id=uuid.uuid4(),
            channel_id=uuid.UUID('ddec09d74e834241a580c480ee37879c'),
        )
        cls.public_content_node_2 = PublicContentNode.objects.create(
            id=uuid.UUID('abcdef1234567890abcdef1234567890'),
            title='Public Content Node 2',
            content_id=uuid.uuid4(),
            channel_id=uuid.UUID('84fcaec1e0514b62899d7f436384c401'),
        )

        cls.content_node_1 = ContentNode.objects.create(
            id='1234567890abcdef1234567890abcdef',
            title='Content Node 1',
            content_id=uuid.uuid4(),
            node_id='1234567890abcdef1234567890abcdef',
            kind=cls.content_kind
        )
        cls.content_node_2 = ContentNode.objects.create(
            id='abcdef1234567890abcdef1234567890',
            title='Content Node 2',
            content_id=uuid.uuid4(),
            node_id='abcdef1234567890abcdef1234567890',
            kind=cls.content_kind
        )

        cls.cache = RecommendationsCache.objects.create(
            request_hash=cls.adapter._generate_request_hash(cls.request),
            contentnode=cls.public_content_node_1,
            rank=1.0,
            override_threshold=False
        )

    def assert_backend_call(self, mock_response_exists, response_exists_value, connect_value,
                            make_request_value, method, *args):
        mock_response_exists.return_value = response_exists_value
        self.adapter.backend.connect.return_value = connect_value
        self.adapter.backend.make_request.return_value = make_request_value

        if response_exists_value:
            result = method(*args)
            mock_response_exists.assert_called_once()
            self.adapter.backend.connect.assert_not_called()
            self.adapter.backend.make_request.assert_not_called()
            return result
        else:
            if connect_value:
                result = method(*args)
                self.adapter.backend.connect.assert_called_once()
                self.adapter.backend.make_request.assert_called_once()
                return result
            else:
                with self.assertRaises(errors.ConnectionError):
                    method(*args)
                self.adapter.backend.connect.assert_called_once()
                self.adapter.backend.make_request.assert_not_called()

    def test_adapter_initialization(self):
        self.assertIsNotNone(self.adapter)
        self.assertIsInstance(self.adapter, RecommendationsAdapter)

    @patch('contentcuration.utils.recommendations.RecommendationsAdapter.response_exists')
    def test_generate_embeddings_connect_failure(self, mock_response_exists):
        mock_response = MagicMock(spec=EmbeddingsResponse)
        self.assert_backend_call(mock_response_exists, None, False, mock_response,
                                 self.adapter.generate_embeddings, self.request)

    @patch('contentcuration.utils.recommendations.RecommendationsAdapter.response_exists')
    def test_generate_embeddings(self, mock_response_exists):
        mock_response = MagicMock(spec=EmbeddingsResponse)
        mock_response.error = None
        response = self.assert_backend_call(mock_response_exists, None, True, mock_response,
                                            self.adapter.generate_embeddings, self.request)
        self.assertIsInstance(response, EmbeddingsResponse)

    @patch('contentcuration.utils.recommendations.RecommendationsAdapter.response_exists')
    def test_generate_embeddings_failure(self, mock_response_exists):
        mock_response = MagicMock(spec=EmbeddingsResponse)
        mock_response.error = {}
        response = self.assert_backend_call(mock_response_exists, None, True, mock_response,
                                            self.adapter.generate_embeddings, self.request)
        self.assertIsInstance(response, EmbeddingsResponse)
        self.assertIsNotNone(response.error)

    def test_response_exists(self):
        response = self.adapter.response_exists(self.request)
        public_content_node_id = str(self.public_content_node_1.id).replace('-', '')

        self.assertIsNotNone(response)
        self.assertIsInstance(response, EmbeddingsResponse)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['contentnode_id'], public_content_node_id)
        self.assertEqual(response.data[0]['rank'], 1.0)

    def test_response_does_not_exist(self):
        new_request = EmbedTopicsRequest(
            method='POST',
            url='http://test.com',
            path='/test/path',
            params={'override_threshold': True},
            json={'topic': 'new_test_topic'}
        )
        response = self.adapter.response_exists(new_request)
        self.assertIsNone(response)

    def cache_request_test_helper(self, request_json, response_data, expected_count):
        new_request = copy.deepcopy(self.request)
        new_request.json = request_json
        response_copy = copy.deepcopy(self.api_response)
        response_copy.data = response_data

        result = self.adapter.cache_embeddings_request(new_request, response_copy)
        self.assertTrue(result)

        cached_items = RecommendationsCache.objects.filter(
            request_hash=self.adapter._generate_request_hash(new_request)
        )
        self.assertEqual(cached_items.count(), expected_count)

    def test_cache_embeddings_request_success(self):
        self.cache_request_test_helper({'topic': 'new_test_topic_1'}, self.api_response.data, 2)

    def test_cache_embeddings_request_empty_data(self):
        self.cache_request_test_helper({'topic': 'new_test_topic_2'}, [], 0)

    def test_cache_embeddings_request_ignore_duplicates(self):
        duplicate_data = [
            {'contentnode_id': '1234567890abcdef1234567890abcdef', 'rank': 0.9},
            {'contentnode_id': '1234567890abcdef1234567890abcdef', 'rank': 0.9}
        ]
        self.cache_request_test_helper({'topic': 'new_test_topic_3'}, duplicate_data, 1)

    def test_cache_embeddings_request_invalid_data(self):
        invalid_data = [
            {'contentnode_id': '1234567890abcdef1234567890abcdee', 'rank': 0.6}
        ]
        self.cache_request_test_helper({'topic': 'new_test_topic_4'}, invalid_data, 0)

    @patch('contentcuration.utils.recommendations.RecommendationsAdapter.cache_embeddings_request')
    @patch('contentcuration.utils.recommendations.RecommendationsAdapter.generate_embeddings')
    @patch('contentcuration.utils.recommendations.RecommendationsAdapter.response_exists')
    @patch('contentcuration.utils.recommendations.EmbedTopicsRequest')
    def test_get_recommendations_success(self, mock_embed_topics_request, mock_response_exists,
                                         mock_generate_embeddings, mock_cache_embeddings_request):
        mock_response_exists.return_value = None
        mock_response = MagicMock(spec=EmbeddingsResponse)
        mock_response.data = copy.deepcopy(self.api_response.data)
        mock_response.error = None
        mock_generate_embeddings.return_value = mock_response

        response = self.adapter.get_recommendations(self.topic)

        mock_response_exists.assert_called_once()
        mock_generate_embeddings.assert_called_once()
        self.assertIsInstance(response, RecommendationsResponse)
        self.assertListEqual(list(response.results), self.recommendations_response)
        self.assertEqual(len(response.results), 2)

    @patch('contentcuration.utils.recommendations.RecommendationsAdapter._extract_data')
    @patch('contentcuration.utils.recommendations.RecommendationsAdapter.response_exists')
    @patch('contentcuration.utils.recommendations.EmbedTopicsRequest')
    def test_get_recommendations_failure(self, mock_embed_topics_request, mock_response_exists,
                                         mock_extract_data):
        mock_request_instance = MagicMock(spec=EmbedTopicsRequest)
        mock_embed_topics_request.return_value = mock_request_instance

        self.assert_backend_call(mock_response_exists, None, False, None,
                                 self.adapter.get_recommendations, self.topic)

    @patch('contentcuration.utils.recommendations.RecommendationsAdapter._extract_data')
    @patch('contentcuration.utils.recommendations.RecommendationsAdapter.response_exists')
    @patch('contentcuration.utils.recommendations.EmbedContentRequest')
    def test_embed_content_success(self, mock_embed_topics_request, mock_response_exists,
                                   mock_extract_data):
        mock_response = MagicMock(spec=EmbeddingsResponse)
        mock_response.error = None
        response = self.assert_backend_call(mock_response_exists, None, True, mock_response,
                                            self.adapter.embed_content, self.channel_id,
                                            self.resources)
        self.assertIsInstance(response, bool)
        self.assertTrue(response)

    @patch('contentcuration.utils.recommendations.RecommendationsAdapter.response_exists')
    @patch('contentcuration.utils.recommendations.EmbedContentRequest')
    def test_embed_content_failure(self, mock_embed_topics_request, mock_response_exists):
        response = self.assert_backend_call(mock_response_exists, None, False,
                                            None, self.adapter.embed_content,
                                            self.channel_id,
                                            self.resources)

        self.assertIsNone(response)

    def extract_content_test_helper(self, mock_node, file_return_value, expected_result):
        with patch('contentcuration.utils.recommendations.File.objects.filter',
                   return_value=file_return_value):
            result = self.adapter.extract_content(mock_node)
            self.assertEqual(result, expected_result)

    def test_extract_content(self):
        mock_node = MagicMock(spec=ContentNode)
        mock_node.node_id = '1234567890abcdef1234567890abcdef'
        mock_node.title = 'Sample Title'
        mock_node.description = 'Sample Description'
        mock_node.language.lang_code = 'en'
        mock_node.kind.kind = 'video'

        mock_file_instance = MagicMock()
        mock_file_instance.file_on_disk = 'path/to/file.mp4'
        mock_file_instance.preset_id = 'video_high_res'
        mock_file_instance.language.lang_code = 'en'

        expected_result = {
            "id": '1234567890abcdef1234567890abcdef',
            "title": 'Sample Title',
            "description": 'Sample Description',
            "text": "",
            "language": 'en',
            "files": [
                {
                    'url': 'path/to/file.mp4',
                    'preset': 'video_high_res',
                    'language': 'en',
                }
            ],
        }
        self.extract_content_test_helper(mock_node, [mock_file_instance], expected_result)

    def test_extract_content_no_files(self):
        mock_node = MagicMock(spec=ContentNode)
        mock_node.node_id = '1234567890abcdef1234567890abcdef'
        mock_node.title = 'Sample Title'
        mock_node.description = 'Sample Description'
        mock_node.language.lang_code = 'en'
        mock_node.kind.kind = 'video'

        expected_result = {
            "id": '1234567890abcdef1234567890abcdef',
            "title": 'Sample Title',
            "description": 'Sample Description',
            "text": "",
            "language": 'en',
            "files": [],
        }
        self.extract_content_test_helper(mock_node, [], expected_result)
