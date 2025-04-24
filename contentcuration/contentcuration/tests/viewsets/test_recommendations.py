from automation.utils.appnexus import errors
from django.urls import reverse
from mock import patch

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

    def setUp(self):
        super(CRUDTestCase, self).setUp()

    @patch("contentcuration.utils.automation_manager.AutomationManager.load_recommendations")
    def test_recommend_success(self, mock_load_recommendations):
        self.client.force_authenticate(user=self.admin_user)
        mock_load_recommendations.return_value = self.recommendations_list

        response = self.client.post(reverse("recommendations"), data=self.topics,
                                    format="json")

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json(), self.recommendations_list)

    def test_recommend_invalid_data_empty_data(self):
        self.client.force_authenticate(user=self.admin_user)

        error_message = "Invalid request data. Please check the required fields."
        invalid_data = {}
        response = self.client.post(reverse("recommendations"), data=invalid_data,
                                    format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn(error_message, response.json()['error'])

    def test_recommend_invalid_data_wrong_topic_data(self):
        self.client.force_authenticate(user=self.admin_user)

        error_message = "Invalid request data. Please check the required fields."
        invalid_data = {'topics': [{'ramdon_field': "random_value"}]}
        response = self.client.post(reverse("recommendations"), data=invalid_data,
                                    format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(error_message, response.json()['error'])

    @patch("contentcuration.utils.automation_manager.AutomationManager.load_recommendations")
    def test_recommendation_invalid_data_formats(self, mock_load_recommendations):
        self.client.force_authenticate(user=self.admin_user)

        error_message = "Invalid input provided."
        mock_load_recommendations.side_effect = errors.InvalidRequest(error_message)

        response = self.client.post(reverse("recommendations"), data=self.topics,
                                    format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"error": error_message})
        mock_load_recommendations.assert_called_once()

    @patch("contentcuration.utils.automation_manager.AutomationManager.load_recommendations")
    def test_recommendation_service_unavailable(self, mock_load_recommendations):
        self.client.force_authenticate(user=self.admin_user)

        error_message = "Recommendation service unavailable"
        mock_load_recommendations.side_effect = errors.ConnectionError(error_message)

        response = self.client.post(reverse("recommendations"), data=self.topics,
                                    format="json")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"error": error_message})
        mock_load_recommendations.assert_called_once()

    @patch("contentcuration.utils.automation_manager.AutomationManager.load_recommendations")
    def test_recommendation_generic_error(self, mock_load_recommendations):
        self.client.force_authenticate(user=self.admin_user)

        error_message = "Unable to load recommendations"
        mock_load_recommendations.side_effect = errors.HttpError(error_message)
        response = self.client.post(reverse("recommendations"), data=self.topics,
                                    format="json")

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.content.decode(), error_message)
        mock_load_recommendations.assert_called_once()
