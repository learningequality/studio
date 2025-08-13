from enum import Enum
from typing import List
from typing import Optional
from typing import Union

from pydantic import Field

from contentcuration.utils.assessment.qti.html.base import BlockContentElement
from contentcuration.utils.assessment.qti.html.base import HTMLElement
from contentcuration.utils.assessment.qti.html.content_types import FlowContentList


class Caption(HTMLElement):
    children: FlowContentList = Field(default_factory=list)


class Col(HTMLElement):  # Void element
    span: int = 1


class Colgroup(HTMLElement):
    span: Optional[int] = None
    children: List[Col] = Field(default_factory=list)


class Td(HTMLElement):
    colspan: Optional[int] = None
    rowspan: Optional[int] = None
    headers: Optional[str] = None
    children: FlowContentList = Field(default_factory=list)


class ThScope(Enum):
    ROW = "row"
    COL = "col"
    ROWGROUP = "rowgroup"
    COLGROUP = "colgroup"
    AUTO = "auto"


class Th(HTMLElement):
    colspan: Optional[int] = None
    rowspan: Optional[int] = None
    headers: Optional[str] = None
    scope: Optional[ThScope] = None
    abbr: Optional[str] = None
    children: FlowContentList = Field(default_factory=list)


class Tr(HTMLElement):
    children: List[Union[Th, Td]] = Field(default_factory=list)


TrList = List[Tr]


class TBody(HTMLElement):
    children: TrList = Field(default_factory=list)


class THead(HTMLElement):
    children: TrList = Field(default_factory=list)


class TFoot(HTMLElement):
    children: TrList = Field(default_factory=list)


class Table(BlockContentElement):
    children: List[Union[Caption, Colgroup, THead, TBody, TFoot, Tr]] = Field(
        default_factory=list
    )
