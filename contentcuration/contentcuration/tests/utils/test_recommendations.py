import copy
import uuid

from automation.models import RecommendationsCache
from automation.utils.appnexus import errors
from automation.utils.appnexus.base import BackendResponse
from automation.utils.appnexus.base import CompositeBackend
from django.test import TestCase
from kolibri_public.models import ContentNode as PublicContentNode
from mock import MagicMock
from mock import patch

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioTestCase
from contentcuration.utils.recommendations import EmbeddingsResponse
from contentcuration.utils.recommendations import EmbedTopicsRequest
from contentcuration.utils.recommendations import Recommendations
from contentcuration.utils.recommendations import RecommendationsAdapter
from contentcuration.utils.recommendations import RecommendationsBackendFactory
from contentcuration.utils.recommendations import RecommendationsResponse


class RecommendationsTestCase(TestCase):
    def test_backend_initialization(self):
        recommendations = Recommendations()
        self.assertIsNotNone(recommendations)
        self.assertIsInstance(recommendations, Recommendations)


class RecommendationsAdapterTestCase(StudioTestCase):
    @classmethod
    def setUpClass(cls):
        super(RecommendationsAdapterTestCase, cls).setUpClass()

        cls.channel_1 = Channel.objects.create(
            id="1234567890abcdef1234567890abcdef",
            name="Channel 1",
            actor_id=cls.admin_user.id,
        )
        cls.channel_2 = Channel.objects.create(
            id="abcdef1234567890abcdef1234567890",
            name="Channel 2",
            actor_id=cls.admin_user.id,
        )

    @classmethod
    def setUpTestData(cls):
        cls.adapter = RecommendationsAdapter(MagicMock())
        cls.request_data = {
            "topics": [
                {
                    "id": "topic_id",
                    "title": "topic_title",
                    "description": "topic_description",
                    "language": "en",
                    "ancestors": [
                        {
                            "id": "ancestor_id",
                            "title": "ancestor_title",
                            "description": "ancestor_description",
                        }
                    ],
                }
            ],
            "metadata": {"channel_id": "00000000000000000000000000000010"},
        }
        cls.channel_id = "test_channel_id"
        cls.resources = [MagicMock(spec=ContentNode)]

        cls.request = EmbedTopicsRequest(
            method="POST",
            url="http://test.com",
            path="/test/path",
            params={"override_threshold": False},
            json=cls.request_data,
        )
        cls.api_response = BackendResponse(
            data={
                "topics": [
                    {
                        "id": "abcdef1234567890abcdef1234567890",
                        "recommendations": [
                            {
                                "id": "abcdef1234567890abcdef1234567890",
                                "channel_id": "abcdef1234567890abcdef1234567890",
                                "rank": 8,
                            }
                        ],
                    },
                    {
                        "id": "1234567890abcdef1234567890abcdef",
                        "recommendations": [
                            {
                                "id": "1234567890abcdef1234567890abcdef",
                                "channel_id": "1234567890abcdef1234567890abcdef",
                                "rank": 9,
                            }
                        ],
                    },
                ]
            }
        )

        PublicContentNode.objects.create(
            id="1234567890abcdef1234567890abcdef",
            title="Public Content Node 1",
            content_id=uuid.uuid4().hex,
            channel_id="ddec09d74e834241a580c480ee37879c",
        )
        PublicContentNode.objects.create(
            id="abcdef1234567890abcdef1234567890",
            title="Public Content Node 2",
            content_id=uuid.uuid4().hex,
            channel_id="84fcaec1e0514b62899d7f436384c401",
        )

    def assert_backend_call(
        self,
        mock_response_exists,
        response_exists_value,
        connect_value,
        make_request_value,
        method,
        *args,
    ):
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

    @patch(
        "contentcuration.utils.recommendations.RecommendationsAdapter.response_exists"
    )
    def test_generate_embeddings_connect_failure(self, mock_response_exists):
        mock_response = MagicMock(spec=EmbeddingsResponse)
        self.assert_backend_call(
            mock_response_exists,
            None,
            False,
            mock_response,
            self.adapter.generate_embeddings,
            self.request,
        )

    @patch(
        "contentcuration.utils.recommendations.RecommendationsAdapter.response_exists"
    )
    def test_generate_embeddings(self, mock_response_exists):
        mock_response = MagicMock(spec=EmbeddingsResponse)
        mock_response.error = None
        response = self.assert_backend_call(
            mock_response_exists,
            None,
            True,
            mock_response,
            self.adapter.generate_embeddings,
            self.request,
        )
        self.assertIsInstance(response, EmbeddingsResponse)

    @patch(
        "contentcuration.utils.recommendations.RecommendationsAdapter.response_exists"
    )
    def test_generate_embeddings_failure(self, mock_response_exists):
        mock_response = MagicMock(spec=EmbeddingsResponse)
        mock_response.error = {}
        response = self.assert_backend_call(
            mock_response_exists,
            None,
            True,
            mock_response,
            self.adapter.generate_embeddings,
            self.request,
        )
        self.assertIsInstance(response, EmbeddingsResponse)
        self.assertIsNotNone(response.error)

    def test_response_exists(self):
        cached = self.adapter.cache_embeddings_request(self.request, self.api_response)
        self.assertTrue(cached)

        response = self.adapter.response_exists(self.request)
        self.assertIsNotNone(response)
        self.assertIsInstance(response, EmbeddingsResponse)
        self.assertDictEqual(response.data, self.api_response.data)

    def test_response_does_not_exist(self):
        new_request = EmbedTopicsRequest(
            method="POST",
            url="http://test.com",
            path="/test/path",
            params={"override_threshold": True},
            json=[
                {
                    "id": "topic_id",
                    "title": "topic_title",
                    "description": "topic_description",
                }
            ],
        )
        response = self.adapter.response_exists(new_request)
        self.assertIsNone(response)

    def cache_request_test_helper(self, request_json, response_data, expected_count):
        new_request = copy.deepcopy(self.request)
        new_request.json = request_json

        result = self.adapter.cache_embeddings_request(new_request, response_data)
        self.assertTrue(result)

        cached_items = RecommendationsCache.objects.filter(
            request_hash=self.adapter._generate_request_hash(new_request)
        )
        self.assertEqual(cached_items.count(), expected_count)

    def test_cache_embeddings_request_success(self):
        request_json = {
            "topics": [
                {
                    "id": "topic_id",
                    "title": "topic_title",
                    "description": "topic_description",
                }
            ],
            "metadata": {},
        }
        self.cache_request_test_helper(request_json, self.api_response, 2)

    def test_cache_embeddings_request_empty_data(self):
        request_json = {
            "topics": [
                {
                    "id": "topic_id",
                    "title": "topic_title",
                    "description": "topic_description",
                }
            ],
            "metadata": {},
        }
        self.cache_request_test_helper(request_json, {}, 0)

    def test_cache_embeddings_request_ignore_duplicates(self):
        request_json = {
            "topics": [
                {
                    "id": "topic_id",
                    "title": "topic_title",
                    "description": "topic_description",
                }
            ],
            "metadata": {},
        }
        duplicate_data = BackendResponse(
            data={
                "topics": [
                    {
                        "id": "1234567890abcdef1234567890abcdef",
                        "recommendations": [
                            {
                                "id": "1234567890abcdef1234567890abcdef",
                                "channel_id": "1234567890abcdef1234567890abcdef",
                                "rank": 1,
                            }
                        ],
                    },
                    {
                        "id": "1234567890abcdef1234567890abcdef",
                        "recommendations": [
                            {
                                "id": "1234567890abcdef1234567890abcdef",
                                "channel_id": "1234567890abcdef1234567890abcdef",
                                "rank": 2,
                            }
                        ],
                    },
                ]
            }
        )
        self.cache_request_test_helper(request_json, duplicate_data, 1)

    def test_cache_embeddings_request_invalid_data(self):
        invalid_data = BackendResponse(
            data={
                "response": [
                    {"node_id": "1234567890abcdef1234567890abcdee", "rank": 0.6}
                ]
            }
        )
        self.cache_request_test_helper([{"topic": "new_test_topic_4"}], invalid_data, 0)

    @patch(
        "contentcuration.utils.recommendations.RecommendationsAdapter.cache_embeddings_request"
    )
    @patch(
        "contentcuration.utils.recommendations.RecommendationsAdapter.generate_embeddings"
    )
    @patch(
        "contentcuration.utils.recommendations.RecommendationsAdapter.response_exists"
    )
    @patch("contentcuration.utils.recommendations.EmbedTopicsRequest")
    def test_get_recommendations_success(
        self,
        mock_embed_topics_request,
        mock_response_exists,
        mock_generate_embeddings,
        mock_cache_embeddings_request,
    ):
        channel = testdata.channel("Public Channel")
        channel.public = True
        channel.save()

        public_node_1 = PublicContentNode.objects.create(
            id="00000000000000000000000000000003",
            title="Video 1",
            content_id=uuid.uuid4().hex,
            channel_id=channel.id,
        )
        public_node_2 = PublicContentNode.objects.create(
            id="00000000000000000000000000000005",
            title="Exercise 1",
            content_id=uuid.uuid4().hex,
            channel_id=channel.id,
        )

        response_data = {
            "topics": [
                {
                    "id": "00000000000000000000000000000003",
                    "recommendations": [
                        {
                            "id": "00000000000000000000000000000003",
                            "channel_id": "00000000000000000000000000000003",
                            "rank": 10,
                        }
                    ],
                },
                {
                    "id": "00000000000000000000000000000005",
                    "recommendations": [
                        {
                            "id": "00000000000000000000000000000005",
                            "channel_id": "00000000000000000000000000000005",
                            "rank": 11,
                        }
                    ],
                },
            ]
        }

        mock_response_exists.return_value = None
        mock_response = MagicMock(spec=EmbeddingsResponse)
        mock_response.data = response_data
        mock_response.error = None
        mock_response.get = lambda key, default=None: getattr(
            mock_response, key, default
        )
        mock_generate_embeddings.return_value = mock_response

        response = self.adapter.get_recommendations(self.request_data)
        results = list(response.results)
        expected_node_ids = [public_node_1.id, public_node_2.id]
        actual_node_ids = [result["node_id"] for result in results]

        mock_response_exists.assert_called_once()
        mock_generate_embeddings.assert_called_once()
        self.assertIsInstance(response, RecommendationsResponse)
        self.assertListEqual(expected_node_ids, actual_node_ids)
        self.assertEqual(len(results), 2)

    @patch(
        "contentcuration.utils.recommendations.RecommendationsAdapter._flatten_response"
    )
    @patch(
        "contentcuration.utils.recommendations.RecommendationsAdapter.response_exists"
    )
    @patch("contentcuration.utils.recommendations.EmbedTopicsRequest")
    def test_get_recommendations_failure(
        self, mock_embed_topics_request, mock_response_exists, mock_flatten_response
    ):
        mock_request_instance = MagicMock(spec=EmbedTopicsRequest)
        mock_embed_topics_request.return_value = mock_request_instance

        self.assert_backend_call(
            mock_response_exists,
            None,
            False,
            None,
            self.adapter.get_recommendations,
            self.request_data,
        )

    @patch(
        "contentcuration.utils.recommendations.RecommendationsAdapter._flatten_response"
    )
    @patch(
        "contentcuration.utils.recommendations.RecommendationsAdapter.response_exists"
    )
    @patch("contentcuration.utils.recommendations.EmbedContentRequest")
    def test_embed_content_success(
        self, mock_embed_topics_request, mock_response_exists, mock_flatten_response
    ):
        mock_response = MagicMock(spec=EmbeddingsResponse)
        mock_response.error = None
        response = self.assert_backend_call(
            mock_response_exists,
            None,
            True,
            mock_response,
            self.adapter.embed_content,
            self.channel_id,
            self.resources,
        )
        self.assertIsInstance(response, bool)
        self.assertTrue(response)

    @patch(
        "contentcuration.utils.recommendations.RecommendationsAdapter.response_exists"
    )
    @patch("contentcuration.utils.recommendations.EmbedContentRequest")
    def test_embed_content_failure(
        self, mock_embed_topics_request, mock_response_exists
    ):
        response = self.assert_backend_call(
            mock_response_exists,
            None,
            False,
            None,
            self.adapter.embed_content,
            self.channel_id,
            self.resources,
        )

        self.assertIsNone(response)

    def extract_content_test_helper(
        self, mock_node, file_return_value, expected_result
    ):
        with patch(
            "contentcuration.utils.recommendations.File.objects.filter",
            return_value=file_return_value,
        ):
            result = self.adapter.extract_content(mock_node)
            self.assertEqual(result, expected_result)

    def test_extract_content(self):
        mock_node = MagicMock(spec=ContentNode)
        mock_node.node_id = "1234567890abcdef1234567890abcdef"
        mock_node.title = "Sample Title"
        mock_node.description = "Sample Description"
        mock_node.language.lang_code = "en"
        mock_node.kind.kind = "video"

        mock_file_instance = MagicMock()
        mock_file_instance.file_on_disk = "path/to/file.mp4"
        mock_file_instance.preset_id = "video_high_res"
        mock_file_instance.language.lang_code = "en"

        expected_result = {
            "id": "1234567890abcdef1234567890abcdef",
            "title": "Sample Title",
            "description": "Sample Description",
            "text": "",
            "language": "en",
            "files": [
                {
                    "url": "path/to/file.mp4",
                    "preset": "video_high_res",
                    "language": "en",
                }
            ],
        }
        self.extract_content_test_helper(
            mock_node, [mock_file_instance], expected_result
        )

    def test_extract_content_no_files(self):
        mock_node = MagicMock(spec=ContentNode)
        mock_node.node_id = "1234567890abcdef1234567890abcdef"
        mock_node.title = "Sample Title"
        mock_node.description = "Sample Description"
        mock_node.language.lang_code = "en"
        mock_node.kind.kind = "video"

        expected_result = {
            "id": "1234567890abcdef1234567890abcdef",
            "title": "Sample Title",
            "description": "Sample Description",
            "text": "",
            "language": "en",
            "files": [],
        }
        self.extract_content_test_helper(mock_node, [], expected_result)


class RecommendationsBackendFactoryTestCases(TestCase):
    def setUp(self):
        self.factory = RecommendationsBackendFactory()

    def test_prepare_url_with_no_scheme(self):
        url = "example.com:8080"
        result = self.factory._prepare_url(url)
        self.assertEqual(result, f"http://{url}")

    def test_prepare_url_with_no_port(self):
        url = "http://example.com"
        result = self.factory._prepare_url(url)
        self.assertEqual(result, f"{url}:8000")

    def test_prepare_url_with_http(self):
        url = "http://example.com:8080"
        result = self.factory._prepare_url(url)
        self.assertEqual(result, url)

    def test_prepare_url_with_https(self):
        url = "https://example.com:443"
        result = self.factory._prepare_url(url)
        self.assertEqual(result, url)

    def test_prepare_url_with_empty_url(self):
        url = ""
        result = self.factory._prepare_url(url)
        self.assertEqual(result, url)

    def test_prepare_url_with_none(self):
        url = None
        result = self.factory._prepare_url(url)
        self.assertEqual(result, url)

    @patch("contentcuration.utils.recommendations.settings")
    def test_create_backend_with_url_no_scheme(self, mock_settings):
        mock_settings.SITE_ID = "production"
        mock_settings.PRODUCTION_SITE_ID = "production"
        mock_settings.CURRICULUM_AUTOMATION_API_URL = "api.example.com"
        backend = self.factory.create_backend()

        self.assertIsInstance(backend, Recommendations)
        self.assertEqual(backend.base_url, "http://api.example.com:8000")
        self.assertEqual(backend.connect_endpoint, "/connect")

    @patch("contentcuration.utils.recommendations.settings")
    def test_create_backend_with_url_with_scheme(self, mock_settings):
        mock_settings.SITE_ID = "production"
        mock_settings.PRODUCTION_SITE_ID = "production"
        mock_settings.CURRICULUM_AUTOMATION_API_URL = "https://api.example.com"
        backend = self.factory.create_backend()

        self.assertIsInstance(backend, Recommendations)
        self.assertEqual(backend.base_url, "https://api.example.com:8000")
        self.assertEqual(backend.connect_endpoint, "/connect")

    @patch("contentcuration.utils.recommendations.settings")
    def test_create_backend_with_empty_url(self, mock_settings):
        mock_settings.SITE_ID = "production"
        mock_settings.PRODUCTION_SITE_ID = "production"
        mock_settings.CURRICULUM_AUTOMATION_API_URL = ""
        backend = self.factory.create_backend()

        self.assertIsInstance(backend, Recommendations)
        self.assertEqual(backend.base_url, "")
        self.assertEqual(backend.connect_endpoint, "/connect")

    @patch("contentcuration.utils.recommendations.settings")
    def test_create_backend_with_no_url(self, mock_settings):
        mock_settings.SITE_ID = "production"
        mock_settings.PRODUCTION_SITE_ID = "production"
        mock_settings.CURRICULUM_AUTOMATION_API_URL = None
        backend = self.factory.create_backend()

        self.assertIsInstance(backend, Recommendations)
        self.assertEqual(backend.base_url, None)
        self.assertEqual(backend.connect_endpoint, "/connect")

    @patch("contentcuration.utils.recommendations.settings")
    def test_create_backend_to_unstable_url(self, mock_settings):
        mock_settings.CURRICULUM_AUTOMATION_API_URL = "http://api.example.com:8080"
        mock_settings.SITE_ID = "unstable"
        mock_settings.PRODUCTION_SITE_ID = "production"

        backend = self.factory.create_backend()
        self.assertIsInstance(backend, CompositeBackend)
        self.assertEqual(backend.prefixes, ["unstable", "stable"])
