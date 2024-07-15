import logging
from typing import Any
from typing import Dict
from typing import List
from typing import Union

from automation.models import RecommendationsCache
from automation.utils.appnexus import errors
from automation.utils.appnexus.base import Adapter
from automation.utils.appnexus.base import Backend
from automation.utils.appnexus.base import BackendFactory
from automation.utils.appnexus.base import BackendRequest
from automation.utils.appnexus.base import BackendResponse
from le_utils.constants import content_kinds
from le_utils.constants import format_presets

from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import File


class RecommendationsBackendRequest(BackendRequest):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)


class RecommendationsRequest(RecommendationsBackendRequest):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)


class EmbeddingsRequest(RecommendationsBackendRequest):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)


class RecommendationsBackendResponse(BackendResponse):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)


class RecommendationsResponse(RecommendationsBackendResponse):
    def __init__(self, results: List[Any], **kwargs):
        super().__init__(**kwargs)
        self.results = results


class EmbedTopicsRequest(EmbeddingsRequest):
    path = '/embed-topics'
    method = 'POST'


class EmbedContentRequest(EmbeddingsRequest):
    path = '/embed-content'
    method = 'POST'


class EmbeddingsResponse(RecommendationsBackendResponse):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)


class RecommendationsBackendFactory(BackendFactory):
    def create_backend(self) -> Backend:
        # Return backend based on some setting.
        return super().create_backend()


class RecommendationsAdapter(Adapter):

    def generate_embeddings(self, request: EmbeddingsRequest,
                            cache: bool = True) -> EmbeddingsResponse:
        """
        Generates recommendations for the given request.

        :param request: The request for which to generate embeddings.
        :param cache: Whether to cache the embeddings request.
        :return: The response containing the recommendations.
        :rtype: EmbeddingsResponse
        """
        if not self.backend.connect():
            raise errors.ConnectionError("Connection to the backend failed")

        cached_response = self.response_exists(request)
        if cached_response:
            return cached_response

        try:
            response = self.backend.make_request(request)
        except Exception as e:
            logging.exception(e)
            response = EmbeddingsResponse(error=e)

        if not response.error and cache:
            self.cache_embeddings_request(request, response)

        return response

    def response_exists(self, request) -> Union[EmbeddingsResponse, None]:
        """
        Checks if a cached response exists for the given request.

        :param request: The request for which to check if a cached response exists.
        :return: The cached response if it exists, otherwise None.
        :rtype: Union[EmbeddingsResponse, None]
        """
        try:
            cache = list(RecommendationsCache.objects.filter(request=request).order_by('rank'))
            data = [entry.response for entry in cache]
            if len(data) > 0:
                return EmbeddingsResponse(data=data)
            else:
                return None
        except Exception as e:
            logging.exception(e)
            return None

    def cache_embeddings_request(self, request: BackendRequest, response: BackendResponse) -> bool:
        """
        Caches the recommendations request and response.

        :param request: The request to cache.
        :param response: The response to cache.
        :return: A boolean indicating whether the caching was successful.
        :rtype: bool
        """
        try:
            nodes = self._extract_data(response)
            cache = [
                RecommendationsCache(
                    request=request,
                    response=node,
                    rank=node['rank'],
                ) for node in nodes
            ]
            RecommendationsCache.objects.bulk_create(cache)
            return True
        except Exception as e:
            logging.exception(e)
            return False

    def get_recommendations(self, topic: Dict[str, Any],
                            override_threshold=False) -> RecommendationsResponse:
        """
        Get recommendations for the given topic.

        :param topic: A dictionary containing the topic for which to get recommendations. See
        https://github.com/learningequality/le-utils/blob/main/spec/schema-embed_topics_request.json
        :param override_threshold: A boolean flag to override the recommendation threshold.
        :return: The recommendations for the given topic. :rtype: RecommendationsResponse
        """
        recommendations = []
        request = EmbedTopicsRequest(
            params={'override_threshold': override_threshold},
            json=topic,
        )
        response = self.generate_embeddings(request=request)
        nodes = self._extract_data(response)
        if len(nodes) > 0:
            node_ids = [node['contentnode_id'] for node in nodes]
            recommendations = list(ContentNode.objects.filter(id__in=node_ids))

        return RecommendationsResponse(results=recommendations)

    def _extract_data(self, response: BackendResponse) -> List[Dict[str, Any]]:
        return response.data if response.data is not None else []

    def embed_content(self, nodes: List[ContentNode]) -> bool:
        """
        Embeds the content for the given nodes. This is an asynchronous process and could take a
        while to complete. This process is handled by our curriculum automation service.
        See https://github.com/learningequality/curriculum-automation

        :param nodes: The nodes for which to embed the content.
        :return: A boolean indicating that content embedding process has started.
        :rtype: bool
        """
        for i in range(0, len(nodes), 20):
            batch = nodes[i:i + 20]
            content = [self.extract_content(node) for node in batch]
            request = EmbedContentRequest(json=content)
            self.generate_embeddings(request=request, cache=False)

        return True

    def extract_content(self, node: ContentNode) -> Dict[str, Any]:
        """
        Extracts the content from the given node.

        :param node: The node from which to extract the content.
        :return: A dictionary containing the extracted content.
        :rtype: Dict[str, Any]
        """
        contentkind_to_presets = {
            content_kinds.AUDIO: [format_presets.AUDIO, format_presets.AUDIO_DEPENDENCY],
            content_kinds.VIDEO: [
                format_presets.VIDEO_DEPENDENCY,
                format_presets.VIDEO_HIGH_RES,
                format_presets.VIDEO_LOW_RES,
                format_presets.VIDEO_SUBTITLE,
            ],
            content_kinds.EXERCISE: [format_presets.DOCUMENT, format_presets.EPUB],
            content_kinds.DOCUMENT: [format_presets.DOCUMENT, format_presets.EPUB],
            content_kinds.HTML5: [format_presets.HTML5_ZIP],
            content_kinds.H5P: [format_presets.H5P_ZIP],
            content_kinds.ZIM: [format_presets.ZIM],
        }

        contentkind = node.kind
        presets = contentkind_to_presets.get(contentkind.kind)
        files = self._get_content_files(node, presets) if presets else None

        try:
            channel = Channel.object.filter(main_tree=node).first()
            channel_id = channel.id if channel else None
        except Exception as e:
            logging.exception(e)
            channel_id = None

        return {
            "resources": {
                "id": node.node_id,
                "title": node.title,
                "description": node.description,
                "text": "",
                "language": node.language.lang_code if node.language else None,
                "files": files
            },
            "metadata": {
                "channel_id": channel_id,
            },
        }

    def _get_content_files(self, node, presets) -> List[Dict[str, Any]]:
        """
        Get the content files for the given node and presets. See
        https://github.com/learningequality/le-utils/blob/main/spec/schema-embed_topics_request.json
        for the file schema.

        :param node: The node for which to get the content files.
        :param presets: The presets for which to get the content files.
        :return: A list of dictionaries containing the content files.
        :rtype: List[Dict[str, Any]]
        """
        try:
            node_files = File.objects.filter(contentnode=node, preset__in=presets)
        except Exception as e:
            logging.exception(e)
            node_files = []

        files = []
        for file in node_files:
            file_dict = {
                'url': file.source_url,
                'preset': file.preset_id,
                'language': file.language.lang_code if file.language else None
            }
            files.append(file_dict)
        return files


class Recommendations(Backend):

    def connect(self) -> bool:
        return super().connect()

    def make_request(self, request) -> Union[EmbeddingsResponse, RecommendationsResponse]:
        return super().make_request(request)

    @classmethod
    def _create_instance(cls) -> 'Recommendations':
        return cls()
