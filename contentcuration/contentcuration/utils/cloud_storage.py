from automation.utils.appnexus.base import Backend
from automation.utils.appnexus.base import BackendFactory
from automation.utils.appnexus.base import BackendRequest
from automation.utils.appnexus.base import BackendResponse


class CloudStorageBackendRequest(BackendRequest):
    pass


class CloudStorageRequest(CloudStorageBackendRequest):
    def __init__(self) -> None:
        super().__init__()


class CloudStorageBackendResponse(BackendResponse):
    pass


class CloudStorageResponse(CloudStorageBackendResponse):
    def __init__(self) -> None:
        pass


class CloudStorageBackendFactory(BackendFactory):
    def create_backend(self) -> Backend:
        return super().create_backend()


class CloudStorage(Backend):
    def connect(self) -> None:
        return super().connect()

    def make_request(self, request) -> CloudStorageResponse:
        return super().make_request(request)

    @classmethod
    def _create_instance(cls) -> "CloudStorage":
        return cls()
