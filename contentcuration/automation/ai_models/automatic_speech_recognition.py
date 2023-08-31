from transformers import pipeline
from automation.constants.config import DEV_TRANSCRIPTION_MODEL, DEVICE

class WhisperModel:
    """
    A class for transcribing audio using a Whisper model with HuggingFace pipeline.
    
    Attributes:
        max_token_length (int): The maximum number of tokens to generate.
        model (str) : The ASR model name.
        result (dict): The transcription result.
    """
    def __init__(self, model_name=DEV_TRANSCRIPTION_MODEL) -> None:
        # https://huggingface.co/docs/transformers/v4.29.1/en/generation_strategies#customize-text-generation
        self.max_token_length = 448
        self.model = pipeline(
                model=model_name,
                chunk_length_s=10,
                device=DEVICE,
                return_timestamps=True,
            )
        self.result = None

    def transcribe(self, media_url) -> list:
        # UserWarning: Using `max_length`'s default (448) to control the generation length. This behaviour is deprecated and will be removed from the config in v5 of Transformers -- we recommend using `max_new_tokens` to control the maximum length of the generation.
        token_length = self.max_token_length
        self.result = self.model(media_url, max_new_tokens=token_length)["chunks"]
        return self.result
