from typing import Union

from automation.utils.appnexus.base import Adapter
from automation.utils.appnexus.base import Backend
from automation.utils.appnexus.base import BackendFactory
from automation.utils.appnexus.base import BackendRequest
from automation.utils.appnexus.base import BackendResponse


class RecommendationsBackendRequest(BackendRequest):
    pass


class RecommedationsRequest(RecommendationsBackendRequest):
    def __init__(self) -> None:
        super().__init__()


class EmbeddingsRequest(RecommendationsBackendRequest):
    def __init__(self) -> None:
        super().__init__()


class RecommendationsBackendResponse(BackendResponse):
    pass


class RecommendationsResponse(RecommendationsBackendResponse):
    def __init__(self) -> None:
        pass


class EmbeddingsResponse(RecommendationsBackendResponse):
    def __init__(self) -> None:
        pass


class RecommendationsBackendFactory(BackendFactory):
    def create_backend(self) -> Backend:
        # Return backend based on some setting.
        return super().create_backend()


class RecommendationsAdapter(Adapter):

    def generate_embedding(self, text) -> EmbeddingsResponse:
        request = EmbeddingsRequest()
        return self.backend.make_request(request)

    def get_recommendations(self) -> RecommendationsResponse:
        request = RecommedationsRequest()
        return self.backend.make_request(request)


class Recommendations(Backend):

    def connect(self) -> None:
        return super().connect()

    def make_request(self, request) -> Union[EmbeddingsResponse, RecommendationsResponse]:
        return super().make_request(request)

    @classmethod
    def _create_instance(cls) -> 'Recommendations':
        return cls()
