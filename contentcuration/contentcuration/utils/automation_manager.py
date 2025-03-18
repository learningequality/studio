from typing import Any
from typing import Dict
from typing import List
from typing import Union

from kolibri_public.models import ContentNode as PublicContentNode

from contentcuration.models import ContentNode as ContentNode
from contentcuration.utils.recommendations import RecommendationsAdapter
from contentcuration.utils.recommendations import RecommendationsBackendFactory


class AutomationManager:
    def __init__(self):
        self.factory = RecommendationsBackendFactory()
        self.instance = self.factory.create_backend()
        self.adapter = RecommendationsAdapter(self.instance)

    def generate_embeddings(self, channel_id: str, nodes: List[Union[ContentNode, PublicContentNode]]):
        """
        Generates embeddings for the given list of nodes. This process is async.

        :param channel_id: The channel id to which the nodes belong.
        :param nodes: The list of nodes for which to generate embeddings.

        :return: A boolean indicating that the process has started.
        """
        return self.adapter.embed_content(channel_id, nodes)

    def load_recommendations(self, topics: List[Dict[str, Any]], override_threshold=False):
        """
        Loads recommendations for the given topic.

        :param topics: A list of topics for which to get recommendations.
        :param override_threshold: A boolean flag to override the recommendation threshold.

        :return: A list of recommendations for the given topic.
        """
        self.adapter.get_recommendations(topics=topics, override_threshold=override_threshold)
        return []
