from enum import Enum
from typing import List
from typing import Optional
from typing import Union

from pydantic import Field

from contentcuration.utils.assessment.qti.fields import BCP47Language
from contentcuration.utils.assessment.qti.fields import LocalSrcPath
from contentcuration.utils.assessment.qti.html.base import BlockContentElement
from contentcuration.utils.assessment.qti.html.base import HTMLElement
from contentcuration.utils.assessment.qti.html.base import Source
from contentcuration.utils.assessment.qti.html.content_types import FlowContent


class TrackKind(Enum):
    SUBTITLES = "subtitles"
    CAPTIONS = "captions"
    DESCRIPTIONS = "descriptions"
    CHAPTERS = "chapters"
    METADATA = "metadata"


class Track(HTMLElement):
    src: LocalSrcPath
    kind: TrackKind = TrackKind.SUBTITLES
    srclang: Optional[BCP47Language] = None
    label: Optional[str] = None
    default: Optional[bool] = None


class Preload(Enum):
    NONE = "none"
    METADATA = "metadata"
    AUTO = "auto"


class Audio(BlockContentElement):
    src: Optional[LocalSrcPath] = None
    controls: Optional[bool] = None
    autoplay: Optional[bool] = None
    loop: Optional[bool] = None
    muted: Optional[bool] = None
    preload: Preload = Preload.METADATA
    # Children: If src attribute is NOT set, 0+ <source>, then 0+ <track>, then transparent content (fallback).
    # If src IS set, 0+ <track>, then transparent content (fallback).
    # For simplicity, using a broader model here. Can be refined.
    children: List[Union[Source, Track, FlowContent]] = Field(default_factory=list)


class Video(BlockContentElement):  # Similar children model to Audio
    src: Optional[LocalSrcPath] = None
    controls: Optional[bool] = None
    autoplay: Optional[bool] = None
    loop: Optional[bool] = None
    muted: Optional[bool] = None
    poster: Optional[str] = None  # URL of an image to show before video loads
    preload: Preload = Preload.METADATA
    width: Optional[str] = None  # String for pixels or percentages
    height: Optional[str] = None
    children: List[Union[Source, Track, FlowContent]] = Field(default_factory=list)
