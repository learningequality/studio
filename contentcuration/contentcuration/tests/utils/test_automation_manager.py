import unittest
from unittest.mock import MagicMock

from contentcuration.utils.automation_manager import AutomationManager


class AutomationManagerTestCase(unittest.TestCase):
    def setUp(self):
        self.automation_manager = AutomationManager()

    def test_creation(self):
        # Check if an instance of AutomationManager is created successfully
        self.assertIsInstance(self.automation_manager, AutomationManager)

    def test_generate_embedding(self):
        text = "Some text that needs to be embedded"
        # Mock the generate_embedding method of RecommendationsAdapter
        # as the implementation is yet to be done
        self.automation_manager.recommendations_backend_adapter.generate_embedding = MagicMock(return_value=[0.1, 0.2, 0.3])
        embedding_vector = self.automation_manager.generate_embedding(text)
        self.assertIsNotNone(embedding_vector)

    def test_embedding_exists(self):
        embedding_vector = [0.1, 0.2, 0.3]
        # Currently no solid implementation exists for this
        # So the embadding_exists function returns true anyways
        exists = self.automation_manager.embedding_exists(embedding_vector)
        self.assertTrue(exists)

    def test_load_recommendations(self):
        embedding_vector = [0.1, 0.2, 0.3]
        self.automation_manager.recommendations_backend_adapter.get_recommendations = MagicMock(return_value=["item1", "item2"])
        recommendations = self.automation_manager.load_recommendations(embedding_vector)
        self.assertIsInstance(recommendations, list)

    def test_cache_embeddings(self):
        embeddings_list = [[0.1, 0.2, 0.3]]
        # Currently the function returns true anyways
        success = self.automation_manager.cache_embeddings(embeddings_list)
        self.assertTrue(success)
