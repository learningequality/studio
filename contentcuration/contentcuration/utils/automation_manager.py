from typing import Any
from typing import Dict

from contentcuration.utils.recommendations import RecommendationsAdapter
from contentcuration.utils.recommendations import RecommendationsBackendFactory


class AutomationManager:
    def __init__(self):
        self.recommendations_backend_factory = RecommendationsBackendFactory()
        self.recommendations_backend_instance = self.recommendations_backend_factory.create_backend()
        self.recommendations_backend_adapter = RecommendationsAdapter(self.recommendations_backend_instance)

    def generate_embedding(self, topic: Dict[str, Any]):
        """
        Generate an embedding vector for the given topic.
        Args:
            topic (dict): The topic for which to generate an embedding vector.
        Returns:
            Vector: The generated embedding vector.
        """
        return self.recommendations_backend_adapter.generate_embedding(topic)

    def embedding_exists(self, embedding):
        """
        Check if the given embedding vector exists.
        Args:
            embedding (Vector): The embedding vector to check.
        Returns:
            bool: True if the embedding exists, False otherwise.
        """
        return self.recommendations_backend_adapter.embedding_exists(embedding=embedding)

    def load_recommendations(self, topic: Dict[str, Any], override_threshold=False):
        """
        Load recommendations for the given topic.

        Parameters:
            :param topic: A dictionary containing the topic for which to get recommendations.
            :param override_threshold: A boolean flag to override the recommendation threshold.

        Returns:
            list: A list of recommended resources.
        """
        self.recommendations_backend_adapter.get_recommendations(topic=topic, override_threshold=override_threshold)
        return []

    def cache_embeddings(self, embeddings):
        """
        Cache a list of embedding vectors.
        Args:
            embeddings (list): A list of embedding vectors to cache.
        Returns:
            bool: True if caching was successful, False otherwise.
        """
        return self.recommendations_backend_adapter.cache_embeddings(embeddings)
