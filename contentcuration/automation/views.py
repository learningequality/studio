from rest_framework.viewsets import ViewSet
from rest_framework.response import Response

from contentcuration.models import CaptionFile, File
from automation.ai_models.automatic_speech_recognition import WhisperTranscriber
from automation.utils.transcription_converter import whisper_converter

class TranscriptionsViewSet(ViewSet):
    def create(self, request):
        caption_file_id = request.data['caption_file_id']
        caption_file = CaptionFile.objects.get(pk=caption_file_id)
        file_id = caption_file.file_id
        language = caption_file.language # TODO

        file_instance = File.objects.get(pk=file_id)
        url = file_instance.file_on_disk.url

        whisper = WhisperTranscriber()
        transcriptions = whisper.transcribe(media_url=url)
        cues = whisper_converter(
            transcriptions=transcriptions,
            caption_file_id=str(caption_file_id)
        )

        return Response({
            "cues": cues
        })
