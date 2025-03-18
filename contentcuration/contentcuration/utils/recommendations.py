import hashlib
import json
import logging
import uuid
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
from django.db.models import Exists
from django.db.models import F
from django.db.models import OuterRef
from django.db.models import UUIDField
from django.db.models.functions import Cast
from django_cte import With
from kolibri_public.models import ContentNode as PublicContentNode
from le_utils.constants import content_kinds
from le_utils.constants import format_presets

from contentcuration.models import Channel
from contentcuration.models import ContentNode as ContentNode
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

    def generate_embeddings(self, request: EmbeddingsRequest) -> EmbeddingsResponse:
        """
        Generates embeddings for the given request.

        :param request: The request for which to generate embeddings.
        :return: The response containing the recommendations.
        :rtype: EmbeddingsResponse
        """
        if not self.backend.connect():
            raise errors.ConnectionError("Connection to the backend failed")

        try:
            response = self.backend.make_request(request)
        except Exception as e:
            logging.exception(e)
            response = EmbeddingsResponse(error=e)

        return response

    def response_exists(self, request) -> Union[EmbeddingsResponse, None]:
        """
        Checks if a cached response exists for the given request.

        :param request: The request for which to check if a cached response exists.
        :return: The cached response if it exists, otherwise None.
        :rtype: Union[EmbeddingsResponse, None]
        """
        try:
            request_hash = self._generate_request_hash(request)
            override_threshold = self._extract_override_threshold(request)
            data = list(RecommendationsCache.objects
                        .filter(request_hash=request_hash, override_threshold=override_threshold)
                        .order_by('override_threshold', 'rank')
                        .values('contentnode_id', 'rank'))
            if len(data) > 0:
                return EmbeddingsResponse(data=data)
            else:
                return None
        except Exception as e:
            logging.exception(e)
            return None

    def _generate_request_hash(self, request) -> str:
        """
        Generates a unique hash for a given request. It serializes the request
        attributes that make it unique, then generates a hash of this serialization.

        To prevent cache duplication, the hash is generated
        independent of the override_threshold parameter.

        :param request: The request for which to generate a unique hash.
        :return: A unique hash representing the request
        """

        params_copy = request.params.copy() if request.params else {}
        params_copy.pop('override_threshold', None)

        unique_attributes = json.dumps({
            'params': params_copy,
            'json': request.json,
        }, sort_keys=True).encode('utf-8')

        return hashlib.md5(unique_attributes).hexdigest()

    def cache_embeddings_request(self, request: BackendRequest, response: BackendResponse) -> bool:
        """
        Caches the recommendations request and response. It performs a bulk insert of the
        recommendations into the RecommendationsCache table, ignoring any conflicts.

        :param request: The request to cache.
        :param response: The response to cache.
        :return: A boolean indicating whether the caching was successful.
        :rtype: bool
        """

        try:
            recommended_nodes = self._flatten_response(response)
            valid_nodes = self._validate_nodes(recommended_nodes)
            request_hash = self._generate_request_hash(request)
            override_threshold = self._extract_override_threshold(request)
            new_cache = [
                RecommendationsCache(
                    request_hash=request_hash,
                    contentnode_id=node['node_id'],
                    rank=node['rank'],
                    override_threshold=override_threshold,
                ) for node in valid_nodes
            ]
            RecommendationsCache.objects.bulk_create(new_cache, ignore_conflicts=True)
            return True
        except Exception as e:
            logging.exception(e)
            return False

    def _extract_override_threshold(self, request) -> bool:
        """\
        Extracts the override_threshold parameter from the request safely.

        :param request: The request containing the parameters.
        :return: The value of the override_threshold parameter, or False if not present.
        :rtype: bool
        """
        return request.params.get('override_threshold', False) if request.params else False

    def get_recommendations(self, topics: List[Dict[str, Any]],
                            override_threshold=False) -> RecommendationsResponse:
        """
        Get recommendations for the given topic(s).

        :param topics: A list of topics for which to get recommendations. See
        https://github.com/learningequality/le-utils/blob/main/spec/schema-embed_topics_request.json
        :param override_threshold: A boolean flag to override the recommendation threshold.
        :return: The recommendations for the given topic. :rtype: RecommendationsResponse
        """

        recommendations = []
        request = EmbedTopicsRequest(
            path='/recommend',
            params={'override_threshold': override_threshold},
            json=topics,
        )

        cached_response = self.response_exists(request)
        if cached_response:
            response = cached_response
        else:
            response = self.generate_embeddings(request=request)
            if not response.error:
                self.cache_embeddings_request(request, response)

        recommended_nodes = self._flatten_response(response)
        if len(recommended_nodes) > 0:
            node_ids = self._extract_node_ids(recommended_nodes)
            cast_node_ids = [uuid.UUID(node_id) for node_id in node_ids]

            channel_cte = With(
                Channel.objects.annotate(
                    channel_id=self._cast_to_uuid(F('id'))
                ).filter(
                    Exists(
                        PublicContentNode.objects.filter(
                            id__in=cast_node_ids,
                            channel_id=OuterRef('channel_id')
                        )
                    )
                ).values(
                    'main_tree_id',
                    tree_id=F('main_tree__tree_id'),
                ).distinct()
            )

            recommendations = channel_cte.join(
                ContentNode.objects.filter(node_id__in=node_ids),
                tree_id=channel_cte.col.tree_id
            ).with_cte(channel_cte).annotate(
                main_tree_id=channel_cte.col.main_tree_id
            ).values(
                'id',
                'node_id',
                'main_tree_id',
                'parent_id',
            )

        return RecommendationsResponse(results=recommendations)

    def _flatten_response(self, response: BackendResponse) -> List[Dict[str, Any]]:
        """
        Flattens the recommendations response.

        The response parameter is of the form:

        {
          "response": {
            "topics": [
              {
                "id": "8d478f3605fd4476adface9be9cf6db3",
                "recommendations": [
                  {
                    "id": "7747554350bb5e088ee69e28a4ba769d",
                    "channel_id": "1d8f6d84618153c18c695d85074952a7",
                    "title": "One-Step Equations and Inverse Operations (Flexbook)",
                    "description": "",
                    "similarity": 0.7308432729798824,
                    "rank": 1
                  }
                ]
              }
            ]
          }
        }

        :param response: The recommendations response to be flattened.
        :return: The flattened list of recommendations by topic.
        :rtype: List[Dict[str, Any]]
        """
        flattened_response = []
        if hasattr(response, 'data') and isinstance(response.data, dict):
            response_data = response.data.get('response')
            if isinstance(response_data, dict):
                topics = response_data.get('topics', [])
                for topic in topics:
                    topic_id = topic.get('id')
                    recommendations = topic.get('recommendations', [])
                    for recommendation in recommendations:
                        flattened_response.append({
                            'topic_id': topic_id,
                            'node_id': recommendation.get('id'),
                            'channel_id': recommendation.get('channel_id'),
                            'similarity': recommendation.get('similarity'),
                            'rank': recommendation.get('rank'),
                        })
        return flattened_response

    def _validate_nodes(self, nodes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Validates the recommended nodes by checking if they exist in the database.

        :param nodes: The nodes to validate.
        :return: A list of valid recommended nodes that exist in the database.
        :rtype: List[Dict[str, Any]]
        """
        node_ids = self._extract_node_ids(nodes)
        existing_node_ids = set(
            PublicContentNode.objects.filter(id__in=node_ids).values_list('id', flat=True))
        return [node for node in nodes if node.get('node_id') in existing_node_ids]

    def _extract_node_ids(self, nodes: List[Dict[str, Any]]) -> List[str]:
        """
        Extracts the node IDs from the given nodes.

        :param nodes: The nodes from which to extract the node IDs.
        :return: A list of node IDs.
        :rtype: List[str]
        """
        return [node.get('node_id') for node in nodes]

    def _cast_to_uuid(self, field):
        """
        Casts the given field to a UUIDField.

        :param field: The field (such as F() object or OuterRef) to cast.
        :return: The field cast to a UUIDField.
        """
        return Cast(field, output_field=UUIDField())

    def embed_content(self, channel_id: str,
                      nodes: List[Union[ContentNode, PublicContentNode]]) -> bool:
        """
        Embeds the content for the given nodes. This is an asynchronous process and could take a
        while to complete. This process is handled by our curriculum automation service.
        See https://github.com/learningequality/curriculum-automation. Also, see
        https://github.com/learningequality/le-utils/blob/main/spec/schema-embed_content_request.json
        for the schema.

        :param channel_id: The channel ID to which the nodes belong.
        :param nodes: The nodes for which to embed the content.
        :return: A boolean indicating that content embedding process has started.
        :rtype: bool
        """
        if not self.backend.connect():
            raise errors.ConnectionError("Connection to the backend failed")

        for i in range(0, len(nodes), 20):
            try:
                batch = nodes[i:i + 20]
                content = [self.extract_content(node) for node in batch]
                content_body = {
                    'resources': content,
                    'metadata': {
                        'channel_id': channel_id,
                    }
                }
                request = EmbedContentRequest(json=content_body)
                self.backend.make_request(request)
            except Exception as e:
                logging.exception(e)

        return True

    def extract_content(self, node) -> Dict[str, Any]:
        """
        Extracts the content from the given node.

        :param node: The node from which to extract the content.
        :return: A dictionary containing the extracted content.
        :rtype: Dict[str, Any]
        """
        contentkind_to_presets = {
            content_kinds.AUDIO: [
                format_presets.AUDIO,
                format_presets.AUDIO_DEPENDENCY,
            ],
            content_kinds.VIDEO: [
                format_presets.VIDEO_HIGH_RES,
                format_presets.VIDEO_LOW_RES,
                format_presets.VIDEO_SUBTITLE,
                format_presets.VIDEO_DEPENDENCY,
            ],
            content_kinds.EXERCISE: [
                format_presets.EXERCISE,
                format_presets.QTI_ZIP,
            ],
            content_kinds.DOCUMENT: [
                format_presets.DOCUMENT,
                format_presets.EPUB,
            ],
            content_kinds.HTML5: [
                format_presets.HTML5_ZIP,
                format_presets.AUDIO_DEPENDENCY,
                format_presets.VIDEO_DEPENDENCY,
            ],
            content_kinds.H5P: [format_presets.H5P_ZIP],
            content_kinds.ZIM: [format_presets.ZIM],
        }

        contentkind = node.kind
        presets = contentkind_to_presets.get(contentkind.kind)
        files = self._get_content_files(node, presets) if presets else None

        return {
            "id": node.node_id,
            "title": node.title,
            "description": node.description,
            "text": "",
            "language": node.language.lang_code if node.language else None,
            "files": files,
        }

    def _get_content_files(self, node, presets) -> List[Dict[str, Any]]:
        """
        Get the content files for the given node and presets.

        :param node: The node for which to get the content files.
        :param presets: The presets for which to get the content files.
        :return: A list of dictionaries containing the content files.
        :rtype: List[Dict[str, Any]]
        """
        files = []
        try:
            node_files = File.objects.filter(contentnode=node, preset__in=presets)
            for file in node_files:
                files.append(self._format_file_data(file))
        except Exception as e:
            logging.exception(e)

        return files

    def _format_file_data(self, file) -> Dict[str, Any]:
        """
        Format the file data into a dictionary.

        :param file: The file for which to format its data.
        :return: A dictionary containing the formatted file data.
        :rtype: Dict[str, Any]
        """
        return {
            'url': file.file_on_disk,
            'preset': file.preset_id,
            'language': file.language.lang_code if file.language else None,
        }


class Recommendations(Backend):

    def connect(self) -> bool:
        return super().connect()

    def make_request(self, request) -> Union[EmbeddingsResponse, RecommendationsResponse]:
        return super().make_request(request)

    @classmethod
    def _create_instance(cls) -> 'Recommendations':
        return cls()
