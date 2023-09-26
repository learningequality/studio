from torch.cuda import is_available as is_gpu_available

DEVICE = "cuda:0" if is_gpu_available() else "cpu"


# [TRANSCRIPTION GENERATION]
WHISPER_MODELS = dict(
    TINY="openai/whisper-tiny",
    BASE="openai/whisper-base",
    SMALL="openai/whisper-small",
    MEDIUM="openai/whisper-medium",
    LARGE="openai/whisper-large",
    LARGEV2="openai/whisper-large-v2",
)


DEV_TRANSCRIPTION_MODEL = WHISPER_MODELS['TINY']
TRANSCRIPTION_MODEL = WHISPER_MODELS['TINY']

# https://huggingface.co/docs/transformers/v4.29.1/en/generation_strategies#customize-text-generation
MAX_TOKEN_LENGTH = 448
CHUNK_LENGTH = 10
