import torch

DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"

DEV_TRANSCRIPTION_MODEL = "openai/whisper-tiny"
TRANSCRIPTION_MODEL = "openai/whisper-tiny"
