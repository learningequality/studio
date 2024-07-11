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
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


class RecommendationsRequest(RecommendationsBackendRequest):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


class EmbeddingsRequest(RecommendationsBackendRequest):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


class RecommendationsBackendResponse(BackendResponse):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


class RecommendationsResponse(RecommendationsBackendResponse):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


class EmbedTopicsRequest(EmbeddingsRequest):
    path = '/embed-topics'
    method = 'POST'


class EmbedContentRequest(EmbeddingsRequest):
    path = '/embed-content'
    method = 'POST'


class EmbeddingsResponse(RecommendationsBackendResponse):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


class RecommendationsBackendFactory(BackendFactory):
    def create_backend(self) -> Backend:
        # Return backend based on some setting.
        return super().create_backend()


class RecommendationsAdapter(Adapter):

    def generate_embeddings(self, request: EmbeddingsRequest,
                            cache: bool = True) -> EmbeddingsResponse:

        if not self.backend.connect():
            raise errors.ConnectionError("Connection to the backend failed")

        if cache:
            cached_response = self.response_exists(request)
            if cached_response:
                return cached_response

        try:
            response = self.backend.make_request(request)
        except Exception as e:
            response = EmbeddingsResponse(error=e)

        if not response.error and cache:
            self.cache_embeddings_request(request, response)

        return response

    def response_exists(self, request) -> EmbeddingsResponse:
        cache = RecommendationsCache.objects.filter(request=request).first()
        if cache:
            cached_response = cache.response
        else:
            cached_response = None
        return EmbeddingsResponse(cached_response)

    def cache_embeddings_request(self, request: BackendRequest, response: BackendResponse) -> bool:
        try:
            RecommendationsCache.objects.create(request=request, response=response, priority=2)
            return True
        except Exception as e:
            logging.exception(e)
            return False

    def get_recommendations(self, topic: Dict[str, Any],
                            override_threshold=False) -> RecommendationsResponse:
        # Generate the embedding for the topic
        recommendations = []
        request = EmbedTopicsRequest(
            params={'override_threshold': override_threshold},
            json=topic,
        )
        response = self.generate_embeddings(request=request)
        nodes = response.data
        if nodes is not None and len(nodes) > 0:
            node_ids = [node['contentnode_id'] for node in nodes]
            recommendations = ContentNode.objects.filter(id__in=node_ids)

        return RecommendationsResponse(recommendations)

    def embed_content(self, nodes: List[ContentNode]) -> EmbeddingsResponse:
        for i in range(0, len(nodes), 20):
            batch = nodes[i:i + 20]
            content = [self.extract_content(node) for node in batch]
            request = EmbedContentRequest(json=content)
            self.generate_embeddings(request=request, cache=False)

        return EmbeddingsResponse()

    def extract_content(self, node: ContentNode) -> Dict[str, Any]:
        """
        Extracts content metadata from a given ContentNode object.

        This method extracts the content metadata from the provided ContentNode object.
        The extracted metadata is returned as a dictionary.

        Parameters:
        node (ContentNode): The ContentNode object from which to extract the content metadata.

        Returns:
        Dict[str, Any]: A dictionary containing the extracted content metadata.
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
        files = self.get_content_files(node, presets) if presets else None

        channel = Channel.object.filter(main_tree=node).first()
        channel_id = channel.id if channel else None

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

    def get_content_files(self, node, presets) -> List[Dict[str, Any]]:
        node_files = File.objects.filter(contentnode=node, preset__in=presets)
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

    def connect(self) -> None:
        return super().connect()

    def make_request(self, request) -> Union[EmbeddingsResponse, RecommendationsResponse]:
        return super().make_request(request)

    @classmethod
    def _create_instance(cls) -> 'Recommendations':
        return cls()
