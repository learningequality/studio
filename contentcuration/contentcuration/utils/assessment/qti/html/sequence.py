from enum import Enum
from typing import List
from typing import Optional
from typing import Union

from pydantic import Field

from contentcuration.utils.assessment.qti.html.base import BlockContentElement
from contentcuration.utils.assessment.qti.html.base import HTMLElement
from contentcuration.utils.assessment.qti.html.content_types import FlowContent
from contentcuration.utils.assessment.qti.html.content_types import FlowContentList


class Li(HTMLElement):
    value: Optional[int] = None
    children: FlowContentList = Field(default_factory=list)


class OlType(Enum):
    NUMBERS = "1"
    LOWERCASE_LETTERS = "a"
    UPPERCASE_LETTERS = "A"
    LOWERCASE_ROMAN = "i"
    UPPERCASE_ROMAN = "I"


class Ol(BlockContentElement):
    reversed: Optional[bool] = None
    start: Optional[int] = None
    type: OlType = OlType.NUMBERS
    children: List[Li] = Field(default_factory=list)


class Ul(BlockContentElement):
    children: List[Li] = Field(default_factory=list)


class Dt(HTMLElement):
    # There are restrictions on allowed descendants
    children: FlowContentList = Field(default_factory=list)


class Dd(HTMLElement):
    children: FlowContentList = Field(default_factory=list)


class Dl(BlockContentElement):
    children: List[Union[FlowContent, Dt, Dd]] = Field(default_factory=list)
