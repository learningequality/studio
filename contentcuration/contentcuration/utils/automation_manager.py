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

    def generate_embeddings(
        self, channel_id: str, nodes: List[Union[ContentNode, PublicContentNode]]
    ):
        """
        Generates embeddings for the given list of nodes. This process is async.

        :param channel_id: The channel id to which the nodes belong.
        :param nodes: The list of nodes for which to generate embeddings.

        :return: A boolean indicating that the process has started.
        """
        return self.adapter.embed_content(channel_id, nodes)

    def load_recommendations(
        self, request_data: Dict[str, Any], override_threshold=False
    ):
        """
        Loads recommendations for the given topic(s).

        :param request_data: Topic information necessary for recommendations retrieval. See
        https://github.com/learningequality/le-utils/blob/main/spec/schema-embed_topics_request.json
        :param override_threshold: A boolean flag to override the recommendation threshold.

        :return: A dictionary containing a list of recommendations for the given topic(s).
        """
        recommendations = []
        response = self.adapter.get_recommendations(request_data, override_threshold)
        if hasattr(response, "results") and isinstance(response.results, list):
            recommendations = response.results
        return recommendations
