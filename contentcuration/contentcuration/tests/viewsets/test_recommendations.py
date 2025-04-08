from django.urls import reverse
from mock import patch
from mock.mock import MagicMock

from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase


class CRUDTestCase(StudioAPITestCase):

    @property
    def topics(self):
        return {
            "topics": [
                {
                    "id": "00000000000000000000000000000001",
                    "title": "Target topic",
                    "description": "Target description",
                    "language": "en",
                    "ancestors": [
                        {
                            "id": "00000000000000000000000000000001",
                            "title": "Parent topic",
                            "description": "Parent description",
                            "language": "en",
                            "level": 1,
                        }
                    ],
                }
            ],
            "metadata": {
                "channel_id": "000",
                "channel_title": "Channel title",
                "some_additional_field": "some_random_value",
            },
        }

    @property
    def recommendations_list(self):
        return [
            {
                "id": "00000000000000000000000000000001",
                "node_id": "00000000000000000000000000000002",
                "main_tree_id": "1",
                "parent_id": "00000000000000000000000000000003",
            },
            {
                "id": "00000000000000000000000000000004",
                "node_id": "00000000000000000000000000000005",
                "main_tree_id": "2",
                "parent_id": "00000000000000000000000000000006",
            }
        ]

    def setup_mock_feature_enabled(self, patch_target='contentcuration.viewsets.user.IsAIFeatureEnabledForUser'):
        feature_patcher = patch(patch_target)
        mock_feature_class = feature_patcher.start()

        mock_instance = MagicMock()
        mock_instance.has_permission.return_value = True
        mock_instance.has_object_permission.return_value = True
        mock_feature_class.return_value = mock_instance

        self.addCleanup(feature_patcher.stop)

        return mock_feature_class

    def setUp(self):
        super(CRUDTestCase, self).setUp()
        self.user = testdata.user()
        self.mock_feature_class = self.setup_mock_feature_enabled()

    @patch("contentcuration.utils.automation_manager.AutomationManager.load_recommendations")
    def test_recommend_success(self, mock_load_recommendations):
        self.client.force_authenticate(user=self.user)
        self.setup_mock_feature_enabled()
        mock_load_recommendations.return_value = self.recommendations_list

        response = self.client.post(reverse("recommendations"), data=self.topics,
                                    format="json")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json(), self.recommendations_list)

    def test_recommend_invalid_data_empty_data(self):
        self.client.force_authenticate(user=self.user)
        self.setup_mock_feature_enabled()

        invalid_data = {}
        response = self.client.post(reverse("recommendations"), data=invalid_data,
                                    format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("topics", response.json()['error'])

    def test_recommend_invalid_data_wrong_topic_data(self):
        self.client.force_authenticate(user=self.user)
        self.setup_mock_feature_enabled()

        invalid_data = {'topics': [{'ramdon_field': "random_value"}]}
        response = self.client.post(reverse("recommendations"), data=invalid_data,
                                    format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("ramdon_field", response.json()['error'])

    @patch("contentcuration.utils.automation_manager.AutomationManager.load_recommendations")
    def test_recommendation_invalid_data_formats(self, mock_load_recommendations):
        self.client.force_authenticate(user=self.user)
        self.setup_mock_feature_enabled()

        error_message = "Invalid topic format"
        mock_load_recommendations.side_effect = ValueError(error_message)

        response = self.client.post(reverse("recommendations"), data=self.topics,
                                    format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"error": error_message})
        mock_load_recommendations.assert_called_once()

    @patch("contentcuration.utils.automation_manager.AutomationManager.load_recommendations")
    def test_recommendation_service_unavailable(self, mock_load_recommendations):
        self.client.force_authenticate(user=self.user)
        self.setup_mock_feature_enabled()

        error_message = "Connection error"
        mock_load_recommendations.side_effect = ConnectionError(error_message)

        response = self.client.post(reverse("recommendations"), data=self.topics,
                                    format="json")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(),
                         {"error": f"Recommendation service unavailable: {error_message}"})
        mock_load_recommendations.assert_called_once()

    @patch("contentcuration.utils.automation_manager.AutomationManager.load_recommendations")
    def test_recommendation_generic_error(self, mock_load_recommendations):
        self.client.force_authenticate(user=self.user)
        self.setup_mock_feature_enabled()

        error_message = "Unexpected internal error"
        mock_load_recommendations.side_effect = RuntimeError(error_message)
        response = self.client.post(reverse("recommendations"), data=self.topics,
                                    format="json")

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.content.decode(),
                         f"Unable to load recommendations: {error_message}")
        mock_load_recommendations.assert_called_once()
