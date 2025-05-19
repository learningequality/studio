from automation.utils.appnexus import errors
from django.urls import reverse
from le_utils.constants import content_kinds
from mock import patch

from contentcuration.models import RecommendationsEvent
from contentcuration.models import RecommendationsInteractionEvent
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
            },
        ]

    def setUp(self):
        super(CRUDTestCase, self).setUp()

    @patch(
        "contentcuration.utils.automation_manager.AutomationManager.load_recommendations"
    )
    def test_recommend_success(self, mock_load_recommendations):
        self.client.force_authenticate(user=self.admin_user)
        mock_load_recommendations.return_value = self.recommendations_list

        response = self.client.post(
            reverse("recommendations"), data=self.topics, format="json"
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json(), self.recommendations_list)

    def test_recommend_invalid_data_empty_data(self):
        self.client.force_authenticate(user=self.admin_user)

        error_message = "Invalid request data. Please check the required fields."
        invalid_data = {}
        response = self.client.post(
            reverse("recommendations"), data=invalid_data, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn(error_message, response.json()["error"])

    def test_recommend_invalid_data_wrong_topic_data(self):
        self.client.force_authenticate(user=self.admin_user)

        error_message = "Invalid request data. Please check the required fields."
        invalid_data = {"topics": [{"ramdon_field": "random_value"}]}
        response = self.client.post(
            reverse("recommendations"), data=invalid_data, format="json"
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(error_message, response.json()["error"])

    @patch(
        "contentcuration.utils.automation_manager.AutomationManager.load_recommendations"
    )
    def test_recommendation_invalid_data_formats(self, mock_load_recommendations):
        self.client.force_authenticate(user=self.admin_user)

        error_message = "Invalid input provided."
        mock_load_recommendations.side_effect = errors.InvalidRequest(error_message)

        response = self.client.post(
            reverse("recommendations"), data=self.topics, format="json"
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {"error": error_message})
        mock_load_recommendations.assert_called_once()

    @patch(
        "contentcuration.utils.automation_manager.AutomationManager.load_recommendations"
    )
    def test_recommendation_service_unavailable(self, mock_load_recommendations):
        self.client.force_authenticate(user=self.admin_user)

        error_message = "Recommendation service unavailable"
        mock_load_recommendations.side_effect = errors.ConnectionError(error_message)

        response = self.client.post(
            reverse("recommendations"), data=self.topics, format="json"
        )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"error": error_message})
        mock_load_recommendations.assert_called_once()

    @patch(
        "contentcuration.utils.automation_manager.AutomationManager.load_recommendations"
    )
    def test_recommendation_generic_error(self, mock_load_recommendations):
        self.client.force_authenticate(user=self.admin_user)

        error_message = "Unable to load recommendations"
        mock_load_recommendations.side_effect = errors.HttpError(error_message)
        response = self.client.post(
            reverse("recommendations"), data=self.topics, format="json"
        )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.content.decode(), error_message)
        mock_load_recommendations.assert_called_once()


class RecommendationsEventViewSetTestCase(StudioAPITestCase):
    @property
    def recommendations_event_object(self):
        return {
            "context": {"model_version": 1, "breadcrumbs": "#Title#->Random"},
            "contentnode_id": self.contentNode.id,
            "content_id": self.contentNode.content_id,
            "target_channel_id": self.channel.id,
            "user": self.user.id,
            "time_hidden": "2024-03-20T10:00:00Z",
            "content": [
                {
                    "content_id": str(self.contentNode.content_id),
                    "node_id": str(self.contentNode.id),
                    "channel_id": str(self.channel.id),
                    "score": 4,
                }
            ],
        }

    def setUp(self):
        super(RecommendationsEventViewSetTestCase, self).setUp()
        self.contentNode = testdata.node(
            {
                "kind_id": content_kinds.VIDEO,
                "title": "Recommended Video content",
            },
        )
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.client.force_authenticate(user=self.user)

    def test_create_recommendations_event(self):
        recommendations_event = self.recommendations_event_object
        response = self.client.post(
            reverse("recommendations-list"),
            recommendations_event,
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)

    def test_list_fails(self):
        response = self.client.get(reverse("recommendations-list"), format="json")
        self.assertEqual(response.status_code, 405, response.content)

    def test_retrieve_fails(self):
        recommendations_event = RecommendationsEvent.objects.create(
            context={"model_version": 1, "breadcrumbs": "#Title#->Random"},
            contentnode_id=self.contentNode.id,
            content_id=self.contentNode.content_id,
            target_channel_id=self.channel.id,
            time_hidden="2024-03-20T10:00:00Z",
            content=[
                {
                    "content_id": str(self.contentNode.content_id),
                    "node_id": str(self.contentNode.id),
                    "channel_id": str(self.channel.id),
                    "score": 4,
                }
            ],
            user=self.user,
        )
        response = self.client.get(
            reverse("recommendations-detail", kwargs={"pk": recommendations_event.id}),
            format="json",
        )
        self.assertEqual(response.status_code, 405, response.content)

    def test_update_recommendations_event(self):
        recommendations_event = RecommendationsEvent.objects.create(
            context={"model_version": 1, "breadcrumbs": "#Title#->Random"},
            contentnode_id=self.contentNode.id,
            content_id=self.contentNode.content_id,
            target_channel_id=self.channel.id,
            time_hidden="2024-03-20T10:00:00Z",
            content=[
                {
                    "content_id": str(self.contentNode.content_id),
                    "node_id": str(self.contentNode.id),
                    "channel_id": str(self.channel.id),
                    "score": 4,
                }
            ],
            user=self.user,
        )
        updated_data = self.recommendations_event_object
        updated_data["context"] = {
            "model_version": 2,
            "breadcrumbs": "#Title#->Updated",
        }
        response = self.client.put(
            reverse("recommendations-detail", kwargs={"pk": recommendations_event.id}),
            updated_data,
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_partial_update_recommendations_event(self):
        recommendations_event = RecommendationsEvent.objects.create(
            context={"model_version": 1, "breadcrumbs": "#Title#->Random"},
            contentnode_id=self.contentNode.id,
            content_id=self.contentNode.content_id,
            target_channel_id=self.channel.id,
            time_hidden="2024-03-20T10:00:00Z",
            content=[
                {
                    "content_id": str(self.contentNode.content_id),
                    "node_id": str(self.contentNode.id),
                    "channel_id": str(self.channel.id),
                    "score": 4,
                }
            ],
            user=self.user,
        )
        response = self.client.patch(
            reverse("recommendations-detail", kwargs={"pk": recommendations_event.id}),
            {"context": {"model_version": 2}},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_destroy_recommendations_event(self):
        recommendations_event = RecommendationsEvent.objects.create(
            context={"model_version": 1, "breadcrumbs": "#Title#->Random"},
            contentnode_id=self.contentNode.id,
            content_id=self.contentNode.content_id,
            target_channel_id=self.channel.id,
            time_hidden="2024-03-20T10:00:00Z",
            content=[
                {
                    "content_id": str(self.contentNode.content_id),
                    "node_id": str(self.contentNode.id),
                    "channel_id": str(self.channel.id),
                    "score": 4,
                }
            ],
            user=self.user,
        )
        response = self.client.delete(
            reverse("recommendations-detail", kwargs={"pk": recommendations_event.id}),
            format="json",
        )
        self.assertEqual(response.status_code, 405, response.content)


class RecommendationsInteractionEventViewSetTestCase(StudioAPITestCase):
    @property
    def recommendations_interaction_object(self):
        return {
            "context": {"test_key": "test_value"},
            "contentnode_id": self.interaction_node.id,
            "content_id": self.interaction_node.content_id,
            "feedback_type": "IGNORED",
            "feedback_reason": "----",
            "recommendation_event_id": str(self.recommendation_event.id),
        }

    def setUp(self):
        super(RecommendationsInteractionEventViewSetTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.client.force_authenticate(user=self.user)
        self.interaction_node = testdata.node(
            {
                "kind_id": content_kinds.VIDEO,
                "title": "Recommended Video content",
            },
        )
        self.node_where_import_is_initiated = testdata.node(
            {
                "kind_id": content_kinds.TOPIC,
                "title": "Node where content is imported",
            },
        )
        self.recommendation_event = RecommendationsEvent.objects.create(
            user=self.user,
            target_channel_id=self.channel.id,
            content_id=self.node_where_import_is_initiated.content_id,
            contentnode_id=self.node_where_import_is_initiated.id,
            context={"model_version": 1, "breadcrumbs": "#Title#->Random"},
            time_hidden="2024-03-20T10:00:00Z",
            content=[
                {
                    "content_id": str(self.interaction_node.content_id),
                    "node_id": str(self.interaction_node.id),
                    "channel_id": str(self.channel.id),
                    "score": 4,
                }
            ],
        )

    def test_create_recommendations_interaction(self):
        recommendations_interaction = self.recommendations_interaction_object
        response = self.client.post(
            reverse("recommendations-interaction-list"),
            recommendations_interaction,
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)

    def test_list_fails(self):
        response = self.client.get(
            reverse("recommendations-interaction-list"), format="json"
        )
        self.assertEqual(response.status_code, 405, response.content)

    def test_retrieve_fails(self):
        recommendations_interaction = RecommendationsInteractionEvent.objects.create(
            context={"test_key": "test_value"},
            contentnode_id=self.interaction_node.id,
            content_id=self.interaction_node.content_id,
            feedback_type="IGNORED",
            feedback_reason="----",
            recommendation_event_id=self.recommendation_event.id,
        )
        response = self.client.get(
            reverse(
                "recommendations-interaction-detail",
                kwargs={"pk": recommendations_interaction.id},
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 405, response.content)

    def test_update_recommendations_interaction(self):
        recommendations_interaction = RecommendationsInteractionEvent.objects.create(
            context={"test_key": "test_value"},
            contentnode_id=self.interaction_node.id,
            content_id=self.interaction_node.content_id,
            feedback_type="IGNORED",
            feedback_reason="----",
            recommendation_event_id=self.recommendation_event.id,
        )
        updated_data = self.recommendations_interaction_object
        updated_data["feedback_type"] = "PREVIEWED"
        response = self.client.put(
            reverse(
                "recommendations-interaction-detail",
                kwargs={"pk": recommendations_interaction.id},
            ),
            updated_data,
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_partial_update_recommendations_interaction(self):
        recommendations_interaction = RecommendationsInteractionEvent.objects.create(
            context={"test_key": "test_value"},
            contentnode_id=self.interaction_node.id,
            content_id=self.interaction_node.content_id,
            feedback_type="IGNORED",
            feedback_reason="----",
            recommendation_event_id=self.recommendation_event.id,
        )
        response = self.client.patch(
            reverse(
                "recommendations-interaction-detail",
                kwargs={"pk": recommendations_interaction.id},
            ),
            {"feedback_type": "IMPORTED"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_destroy_recommendations_interaction(self):
        recommendations_interaction = RecommendationsInteractionEvent.objects.create(
            context={"test_key": "test_value"},
            contentnode_id=self.interaction_node.id,
            content_id=self.interaction_node.content_id,
            feedback_type="IGNORED",
            feedback_reason="----",
            recommendation_event_id=self.recommendation_event.id,
        )
        response = self.client.delete(
            reverse(
                "recommendations-interaction-detail",
                kwargs={"pk": recommendations_interaction.id},
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 405, response.content)
