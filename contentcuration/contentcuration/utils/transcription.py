from automation.utils.appnexus.base import Adapter
from automation.utils.appnexus.base import Backend
from automation.utils.appnexus.base import BackendFactory
from automation.utils.appnexus.base import BackendRequest
from automation.utils.appnexus.base import BackendResponse


class WhisperRequest(BackendRequest):
    def __init__(self) -> None:
        super().__init__()


class WhisperResponse(BackendResponse):
    def __init__(self) -> None:
        super().__init__()


class Whisper(Backend):
    def connect(self) -> None:
        raise NotImplementedError(
            "The 'connect' method is not implemented for the 'Whisper' backend."
        )

    def make_request(self, request: WhisperRequest) -> WhisperResponse:
        # Implement production backend here.
        pass

    @classmethod
    def _create_instance(cls) -> "Whisper":
        return cls()


class LocalWhisper(Backend):
    def make_request(self, request: WhisperRequest) -> WhisperResponse:
        # Implement your local backend here.
        pass


class WhisperBackendFactory(BackendFactory):
    def create_backend(self) -> Backend:
        # Return backend based on some setting.
        return super().create_backend()


class WhisperAdapter(Adapter):
    def transcribe(self, caption_file_id: str) -> WhisperResponse:
        request = WhisperRequest()
        return self.backend.make_request(request)
