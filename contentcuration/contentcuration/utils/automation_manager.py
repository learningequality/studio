from typing import Any
from typing import Dict
from typing import List

from contentcuration.models import ContentNode
from contentcuration.utils.recommendations import RecommendationsAdapter
from contentcuration.utils.recommendations import RecommendationsBackendFactory


class AutomationManager:
    def __init__(self):
        self.factory = RecommendationsBackendFactory()
        self.instance = self.factory.create_backend()
        self.adapter = RecommendationsAdapter(self.instance)

    def generate_embeddings(self, nodes: List[ContentNode]):
        """
        Generates embeddings for the given list of nodes. This process is async.

        :param nodes: The list of nodes for which to generate embeddings.

        :return: A boolean indicating that the process has started.
        """
        return self.adapter.embed_content(nodes)

    def load_recommendations(self, topic: Dict[str, Any], override_threshold=False):
        """
        Loads recommendations for the given topic.

        :param topic: A dictionary containing the topic for which to get recommendations.
        :param override_threshold: A boolean flag to override the recommendation threshold.

        :return: A list of recommendations for the given topic.
        """
        self.adapter.get_recommendations(topic=topic, override_threshold=override_threshold)
        return []
