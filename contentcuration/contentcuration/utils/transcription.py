import uuid
from typing import Optional

import requests
from automation.settings import CHUNK_LENGTH
from automation.settings import DEVICE
from automation.settings import DEV_TRANSCRIPTION_MODEL
from automation.settings import MAX_TOKEN_LENGTH
from automation.utils.appnexus.base import Adapter
from automation.utils.appnexus.base import Backend
from automation.utils.appnexus.base import BackendFactory
from automation.utils.appnexus.base import BackendRequest
from automation.utils.appnexus.base import BackendResponse
from contentcuration.models import CaptionFile
from contentcuration.models import File

from django.conf import settings
from transformers import pipeline


class WhisperRequest(BackendRequest):
    """ Create a WhisperRequest object to make request to 'WhisperBackend'
    :param: url (str): The URL of the resource to retrieve.
    :param: binary (optional): Provide the binary data directly, default is 'None'.
    """
    def __init__(self, url: str, language: str, binary: Optional[bytes] = None) -> None:
        self.url, self.language = url, language
        self.binary = binary if binary else self._get_binary()

    def _get_binary(self) -> bytes:
        # if not url.startswith('http'): raise TypeError(f'url:{url} must be start with http.')
        res = requests.get(self.url)
        return res.content if res.status_code == 200 else None

    def get_binary_data(self) -> bytes: return self.binary
    def get_file_url(self) -> str: return self.url
    def get_langauge(self) -> str: return self.language


class WhisperResponse(BackendResponse):
    def __init__(self, response) -> None:
        self.result = response

    def get_cues(self, caption_file_id: str) -> list:
        cues = []
        for transcription in self.result['chunks']:
            start_time, end_time = transcription["timestamp"]
            text = transcription["text"]
            cue = {
                "id": uuid.uuid4().hex,
                "text": text,
                "starttime": start_time,
                "endtime": end_time,
                "caption_file_id": caption_file_id,
            }
            cues.append(cue)
        return cues


class Whisper(Backend):
    def make_request(self, request: WhisperRequest) -> WhisperResponse:
        # Implement production backend here.
        pass

    def connect(self) -> None:
        raise NotImplementedError("The 'connect' method is not implemented for the 'Whisper' backend.")

class LocalWhisper(Backend):
    def __init__(self) -> None:
        self.pipe = None

    def make_request(self, request: WhisperRequest) -> WhisperResponse:
        self.connect()
        media_url = request.get_file_url()
        result = self.pipe(media_url, max_new_tokens=MAX_TOKEN_LENGTH)
        return WhisperResponse(response=result)

    def connect(self) -> None:
        if self.pipe is None:
            self.pipe = pipeline(
                model=DEV_TRANSCRIPTION_MODEL,
                chunk_length_s=CHUNK_LENGTH,
                device=DEVICE,
                return_timestamps=True,
            )


class WhisperBackendFactory(BackendFactory):
    def create_backend(self) -> Backend:
        return LocalWhisper() # if settings.DEBUG else Whisper()

class WhisperAdapter(Adapter):
    def transcribe(self, caption_file_id: str) -> WhisperResponse:
        f = CaptionFile.objects.get(pk=caption_file_id)
        file_id, language = f.file_id, f.language # TODO: set language of transcription
        media_file = File.objects.get(pk=file_id).file_on_disk.url

        request = WhisperRequest(url=media_file, language=language)
        return self.backend.make_request(request)
