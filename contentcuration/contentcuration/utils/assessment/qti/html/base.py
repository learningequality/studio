from typing import List
from typing import Optional

from pydantic import model_validator

from contentcuration.utils.assessment.qti.base import ElementTreeBase
from contentcuration.utils.assessment.qti.fields import LocalSrcPath
from contentcuration.utils.assessment.qti.fields import LocalSrcSet


class HTMLElement(ElementTreeBase):
    """
    Represents an HTML element within QTI.
    """

    @classmethod
    def from_html_string(cls, html_string: str) -> List["HTMLElement"]:
        """Parse HTML string and return list of HTMLElement instances"""
        return cls.from_string(html_string)


class FlowContentElement(HTMLElement):
    pass


class InlineContentElement(FlowContentElement):
    pass


class BlockContentElement(FlowContentElement):
    pass


class Source(HTMLElement):
    # These attributes are common to all <source> elements in HTML5
    media: Optional[str] = None
    type: Optional[str] = None

    # Required if a child of <audio> or <video>
    # not allowed if a child of <picture>
    src: Optional[LocalSrcPath] = None

    # Required if a child of <picture>
    # not allowed if a child of <audio> or <video>
    srcset: Optional[LocalSrcSet] = None

    sizes: Optional[str] = None
    height: Optional[int] = None
    width: Optional[int] = None

    @model_validator(mode="after")
    def _check_src_and_srcset(self):
        # both None or both set
        if (self.src is None) == (self.srcset is None):
            raise ValueError("Exactly one of 'src' or 'srcset' must be specified")
        return self
