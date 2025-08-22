from typing import List
from typing import Optional

from pydantic import Field

from contentcuration.utils.assessment.qti.fields import LocalSrcPath
from contentcuration.utils.assessment.qti.fields import LocalSrcSet
from contentcuration.utils.assessment.qti.html.base import HTMLElement
from contentcuration.utils.assessment.qti.html.base import InlineContentElement
from contentcuration.utils.assessment.qti.html.base import Source
from contentcuration.utils.assessment.qti.html.content_types import FlowContentList


class Img(InlineContentElement):  # Void element
    alt: str
    src: LocalSrcPath
    srcset: Optional[LocalSrcSet] = None
    sizes: Optional[str] = None
    crossorigin: Optional[str] = None  # "anonymous", "use-credentials"
    usemap: Optional[str] = None
    ismap: Optional[bool] = None
    width: Optional[int] = None
    height: Optional[int] = None
    longdesc: Optional[str] = None


class Param(HTMLElement):
    name: str
    value: str


class Object(InlineContentElement):
    @classmethod
    def element_name(cls):
        return "object"

    data: Optional[str] = None
    type: Optional[str] = None  # MIME type of data
    name: Optional[str] = None  # For form submission
    usemap: Optional[str] = None
    width: Optional[
        str
    ] = None  # String to allow percentages e.g., "100%" or pixels "300"
    height: Optional[str] = None
    # Children: 0+ <param> elements, then transparent content (flow or phrasing depending on context)
    # For simplicity, allowing FlowContent here.
    params: List[Param] = Field(default_factory=list)
    children: FlowContentList = Field(default_factory=list)


class Picture(InlineContentElement):  # Contains <source> and <img>
    # Children: 0+ <source> elements, then one <img> element.
    children: List[Source] = Field(default_factory=list)
    img: Img
