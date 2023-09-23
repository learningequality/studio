from automation.settings import CHUNK_LENGTH, DEV_TRANSCRIPTION_MODEL, DEVICE, MAX_TOKEN_LENGTH
from transformers import pipeline


class WhisperTranscriber:
    """
    A class for transcribing audio using a Whisper model with HuggingFace pipeline.
    
    Attributes:
        max_token_length (int): The maximum number of tokens to generate.
        model (str) : The ASR model name.
        result (dict): The transcription result.
    """
    def __init__(self, model_name=DEV_TRANSCRIPTION_MODEL) -> None:
        self.max_token_length = MAX_TOKEN_LENGTH
        self.model = pipeline(
                model=model_name,
                chunk_length_s=CHUNK_LENGTH,
                device=DEVICE,
                return_timestamps=True,
            )
        self.result = None

    def transcribe(self, media_url) -> list:
        token_length = self.max_token_length
        self.result = self.model(media_url, max_new_tokens=token_length)["chunks"]
        return self.result
