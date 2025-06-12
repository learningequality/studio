from typing import Optional

from pydantic import Field
from pydantic import HttpUrl

from contentcuration.utils.assessment.qti.html.base import BlockContentElement
from contentcuration.utils.assessment.qti.html.content_types import FlowGroupList


class HTMLFlowContainer(BlockContentElement):
    """
    Base class for HTML elements that can contain flow content
    (block-level and inline elements).
    Corresponds to HTML "Flow Content" category.
    """

    children: FlowGroupList = Field(default_factory=list)


class Blockquote(HTMLFlowContainer):
    cite: Optional[HttpUrl] = None


class Div(HTMLFlowContainer):
    pass


class Article(HTMLFlowContainer):
    pass


class Section(HTMLFlowContainer):
    pass


class Nav(HTMLFlowContainer):
    pass


class Aside(HTMLFlowContainer):
    pass


class Header(HTMLFlowContainer):
    pass


class Footer(HTMLFlowContainer):
    pass


class Address(HTMLFlowContainer):
    pass


# SSMLGroup not implemented
