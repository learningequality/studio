from automation.utils.appnexus.base import Adapter
from automation.utils.appnexus.base import Backend
from automation.utils.appnexus.base import BackendFactory
from automation.utils.appnexus.base import EmbeddingsRequest
from automation.utils.appnexus.base import EmbeddingsResponse
from automation.utils.appnexus.base import RecommedationsRequest
from automation.utils.appnexus.base import RecommendationsResponse


class RecommendationsBackendFatory(BackendFactory):
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
