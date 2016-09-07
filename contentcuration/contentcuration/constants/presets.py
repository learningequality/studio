"""
This module contains constants representing the ids of FormatPreset.
"""
from django.utils.translation import ugettext_lazy as _

# constants for FormatPreset
VIDEO_HIGH_RES = "high_res_video"
VIDEO_LOW_RES = "low_res_video"
VIDEO_VECTOR = "vector_video"
VIDEO_THUMBNAIL = "video_thumbnail"
VIDEO_SUBTITLE = "video_subtitle"

AUDIO = "aud"
AUDIO_THUMBNAIL = "audio_thumbnail"

DOCUMENT = "doc"
DOCUMENT_THUMBNAIL = "document_thumbnail"

EXERCISE = "exercise"
EXERCISE_THUMBNAIL = "exercise_thumbnail"

choices = (
    (VIDEO_HIGH_RES, _("High resolution video")),
    (VIDEO_LOW_RES, _("Low resolution video")),
    (VIDEO_VECTOR, _("Vector video")),
    (VIDEO_THUMBNAIL, _("Thumbnail")),
    (VIDEO_SUBTITLE, _("Subtitle")),

    (AUDIO, _("Audio")),
    (AUDIO_THUMBNAIL, _("Thumbnail")),

    (DOCUMENT, _("Document")),
    (DOCUMENT_THUMBNAIL, _("Thumbnail")),

    (EXERCISE, _("Exercise")),
    (EXERCISE_THUMBNAIL, _("Thumbnail")),
)