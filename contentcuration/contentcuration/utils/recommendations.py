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


class EmbedTopicsRequest(RecommendationsBackendRequest):
    path = '/embed-topics'
    method = 'POST'


class EmbedContentRequest(RecommendationsBackendRequest):
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

    def generate_embedding(self, text) -> EmbeddingsResponse:
        request = EmbeddingsRequest()
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

    def get_recommendations(self, embedding) -> RecommendationsResponse:
        request = RecommendationsRequest(embedding)
        return self.backend.make_request(request)

    def embed_topics(self, topics: Dict[str, Any]) -> EmbeddingsResponse:
        """
        Embeds the topics and returns an EmbeddingsResponse.

        This method connects to the backend, sends the provided topics as a JSON payload,
        and requests the backend to embed the topics. If an exception occurs during
        this process, it returns an EmbeddingsResponse with the exception as the error.

        Parameters:
        topics (Dict[str, Any]): A dictionary of topics to be embedded.

        Returns:
        EmbeddingsResponse: An EmbeddingsResponse object containing the embeddings or an error.
        """
        if not self.backend.connect():
            raise errors.ConnectionError("Connection to the backend failed")

        try:
            embed_topics_request = EmbedTopicsRequest(json=topics)
            return self.backend.make_request(embed_topics_request)
        except Exception as e:
            return EmbeddingsResponse(error=e)

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
            resources = [self.extract_content(node) for node in nodes]
            json = {
                'resources': resources,
                'metadata': {}
            }
            embed_content_request = EmbedContentRequest(json=json)
            return self.backend.make_request(embed_content_request)
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
        return {}


class Recommendations(Backend):

    def connect(self) -> None:
        return super().connect()

    def make_request(self, request) -> Union[EmbeddingsResponse, RecommendationsResponse]:
        return super().make_request(request)

    @classmethod
    def _create_instance(cls) -> 'Recommendations':
        return cls()
