"""
This module contains constants representing the extensions of FileFormat.
"""
from django.utils.translation import ugettext_lazy as _

# constants for Video format
MP4 = "mp4"
# constants for Subtitle format
VTT = "vtt"
SRT = "srt"

# constants for Audio format
MP3 = "mp3"
WAV = "wav"

# constants for Document format
PDF = "pdf"

# constants for Thumbnail format
JPG = "jpg"
JPEG = "jpeg"
PNG = "png"

# constants for Exercise format
PERSEUS = "perseus"

choices = (
    (MP4, _("mp4")),

    (VTT, _("vtt")),
    (SRT, _("srt")),

    (MP3, _("mp3")),
    (WAV, _("wav")),

    (PDF, _("pdf")),

    (JPG, _("jpg")),
    (JPEG, _("jpeg")),
    (PNG, _("png")),

    (PERSEUS, _("perseus")),
)