import uuid


def whisper_converter(transcriptions: list, caption_file_id: str) -> list:
    """
    Convert transcriptions from the Whisper model's output format to a contentcutation.models.CaptionCue format.

    Args:
        transcriptions (list): A list of transcriptions produced by the Whisper model, where each
                              transcription is a dictionary with 'timestamp' and 'text' keys.
        caption_file_id (str): Foreign key referencing the primary key of the CaptionFile model.

    Returns:
        list: A list of cues, where each cue is a dictionary containing the following keys:
              - 'text': The transcribed text.
              - 'start_time': The start time of the transcription.
              - 'end_time': The end time of the transcription.
    """
    cues = []

    for transcription in transcriptions:
        start_time, end_time = transcription["timestamp"]
        text = transcription["text"]
        cue = {
            "id": uuid.uuid4().hex,
            "text": text,
            "start_time": start_time,
            "end_time": end_time,
            "caption_file_id": caption_file_id,
        }
        cues.append(cue)
    return cues
