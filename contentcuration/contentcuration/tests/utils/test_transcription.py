from django.test import TestCase

from contentcuration.utils.transcription import LocalWhisper
from contentcuration.utils.transcription import WhisperBackendFactory


class TranscriptionTestCase(TestCase):
    def test_backend_initialization(self):
        backend = LocalWhisper()
        self.assertIsNotNone(backend)
        self.assertIsInstance(backend.get_instance(), LocalWhisper)

    def test_backend_factory(self):
        backend = WhisperBackendFactory().create_backend()
        assert isinstance(backend, LocalWhisper)
