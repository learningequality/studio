from typing import Any
from typing import Dict
from typing import List
from typing import Union

from automation.utils.appnexus import errors
from automation.utils.appnexus.base import Adapter
from automation.utils.appnexus.base import Backend
from automation.utils.appnexus.base import BackendFactory
from automation.utils.appnexus.base import BackendRequest
from automation.utils.appnexus.base import BackendResponse
from le_utils.constants import content_kinds

from contentcuration.models import ContentNode


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

    def generate_embedding(self, request: EmbeddingsRequest) -> EmbeddingsResponse:
        """
        Generate an embedding vector for the given content.

        Parameters:
            :param request: The EmbeddingsRequest object containing the request details.
            :param content: The topic for which to generate an embedding vector.
        Returns:
            EmbeddingsResponse: An object containing the embeddings or an error.
        """
        return self.backend.make_request(request)

    def embedding_exists(self, embedding) -> bool:
        # Need to implement the logic to check if the embeddigns exist
        # Return True if the embedding exists, or False otherwise
        return True

    def cache_embeddings(self, embeddings_list) -> bool:
        for embedding in embeddings_list:
            try:
                # Attempt to cache the embedding
                # Write the caching logic
                # A conrner case to look at here is if one of the embedding fails to get cached
                # we need to handel it so that only the once that were not succesfull
                # are attempted to cache again
                pass
            except Exception as e:
                print(e)
                return False
        return True

    def get_recommendations(self, topic: Dict[str, Any], override_threshold=False) -> RecommendationsResponse:
        """
        Get recommendations for the given topic.

        This method connects to the backend, sends a request to get recommendations for a given
        topic, and returns a RecommendationsResponse object containing the recommendations
        or an error.

        Parameters:
            :param topic: The topic for which to get recommendations.
            :param override_threshold: A boolean flag to override the recommendation threshold.

        Returns:
            RecommendationsResponse: An object containing a list of recommendations or an error.
        """
        if not self.backend.connect():
            raise errors.ConnectionError("Connection to the backend failed")
        try:
            # Generate the embedding for the topic
            request = EmbedTopicsRequest(json=topic)
            embedding = self.generate_embedding(request)
            if embedding.error is not None:
                return RecommendationsResponse(error=embedding.error)
            # Cache the embedding if it does not exist
            if not self.embedding_exists(embedding):
                self.cache_embeddings([embedding])

            # Send a request to get recommendations for the topic
            request = RecommendationsRequest(
                method='GET',
                path='/recommendations',
                params={'override_threshold': override_threshold},
                json=topic,
            )
            return self.backend.make_request(request)
        except Exception as e:
            return RecommendationsResponse(error=e)

    def embed_content(self, nodes: List[ContentNode]) -> EmbeddingsResponse:
        """
        Embeds the content nodes and returns an EmbeddingsResponse.

        This method connects to the backend, extracts content metadata from the provided nodes,
        and sends a request to the backend to embed the content. If an exception occurs during
        this process, it returns an EmbeddingsResponse with the exception as the error.

        Parameters:
        nodes (List[ContentNode]): A list of ContentNode objects to be embedded.

        Returns:
        EmbeddingsResponse: An EmbeddingsResponse object containing the embeddings or an error.
        """
        if not self.backend.connect():
            raise errors.ConnectionError("Connection to the backend failed")

        try:
            failed_requests = []
            for node in nodes:
                resource = self.extract_content(node)
                json = {
                    'resources': [resource],
                    'metadata': {}
                }
                request = EmbedContentRequest(json=json)
                embedding = self.generate_embedding(request)
                if embedding.error is not None:
                    failed_requests.append(request)
                if embedding.error is None and not self.embedding_exists(embedding):
                    self.cache_embeddings([embedding])
            return EmbeddingsResponse(failed_requests=failed_requests)
        except Exception as e:
            return EmbeddingsResponse(error=e)

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
        contentkind = node.kind
        if contentkind.kind == content_kinds.AUDIO:
            # handle audio content
            pass
        elif contentkind.kind == content_kinds.VIDEO:
            # handle video content
            pass
        elif contentkind.kind == content_kinds.EXERCISE:
            # handle exercise content
            pass
        elif contentkind.kind == content_kinds.DOCUMENT:
            # handle document content
            pass
        elif contentkind.kind == content_kinds.HTML5:
            # handle html5 content
            pass
        elif contentkind.kind == content_kinds.H5P:
            # handle h5p content
            pass
        elif contentkind.kind == content_kinds.ZIM:
            # handle zim content
            pass
        else:
            # handle topic content or any other kind
            pass

        return {}


class Recommendations(Backend):

    def connect(self) -> None:
        return super().connect()

    def make_request(self, request) -> Union[EmbeddingsResponse, RecommendationsResponse]:
        return super().make_request(request)

    @classmethod
    def _create_instance(cls) -> 'Recommendations':
        return cls()
