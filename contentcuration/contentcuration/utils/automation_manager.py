from contentcuration.utils.recommendations import Recommendations
from contentcuration.utils.recommendations import RecommendationsAdapter


class AutomationManager:
    def __init__(self):
        self.reccomendations_backend_instance = Recommendations()
        self.recommendations_backend_adapter = RecommendationsAdapter(self.reccomendations_backend_instance)

    def generate_embedding(self, text):
        """
        Generate an embedding vector for the given text.
        Args:
            text (str): The text for which to generate an embedding.
        Returns:
            Vector: The generated embedding vector.
        """
        embedding_vector = self.recommendations_backend_adapter.generate_embedding(text=text)
        return embedding_vector

    def embedding_exists(self, embedding):
        """
        Check if the given embedding vector exists.
        Args:
            embedding (Vector): The embedding vector to check.
        Returns:
            bool: True if the embedding exists, False otherwise.
        """
        return self.recommendations_backend_adapter.embedding_exists(embedding=embedding)

    def load_recommendations(self, embedding):
        """
        Load recommendations based on the given embedding vector.
        Args:
            embedding (Vector): The embedding vector to use for recommendations.
        Returns:
            list: A list of recommended items.
        """
        # Need to extract the recommendation list from the ResponseObject and change the return statement
        self.recommendations_backend_adapter.get_recommendations(embedding=embedding)
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
