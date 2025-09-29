from typing import List
from typing import Optional
from typing import Union

from pydantic import Field
from pydantic import field_validator

from contentcuration.utils.assessment.qti.base import TextType
from contentcuration.utils.assessment.qti.html.base import FlowContentElement
from contentcuration.utils.assessment.qti.html.base import HTMLElement
from contentcuration.utils.assessment.qti.html.content_types import FlowContent
from contentcuration.utils.assessment.qti.html.content_types import FlowContentList
from contentcuration.utils.assessment.qti.html.text import BlockHTMLText
from contentcuration.utils.assessment.qti.html.text import InlineHTMLText


class Label(InlineHTMLText):
    for_: Optional[str] = None


class Summary(HTMLElement):
    # Note that this is currently unnecessarily loose - <summary> elements should only
    # contain phrasing content and headers.
    children: List[Union[BlockHTMLText, InlineHTMLText, TextType]] = Field(
        default_factory=list
    )


class Details(FlowContentElement):
    open: Optional[bool] = None
    children: List[Union[FlowContent, Summary]] = Field(default_factory=list)

    @field_validator("children", mode="after")
    def validate_summary_position(cls, children):
        if not children:
            raise ValueError(
                "Details element must contain at least one Summary element"
            )

        if not isinstance(children[0], Summary):
            raise ValueError("Details element must have a Summary as the first child")

        summary_count = sum(1 for child in children if isinstance(child, Summary))
        if summary_count > 1:
            raise ValueError("Details element may contain at most one Summary element")

        return children


class Figcaption(HTMLElement):
    children: FlowContentList = Field(default_factory=list)


class Figure(FlowContentElement):
    children: List[Union[Figcaption, FlowContent]] = Field(default_factory=list)

    @field_validator("children", mode="after")
    def validate_figcaption_position(cls, children):
        # Collect all Figcaption instances
        figcaps = [c for c in children if isinstance(c, Figcaption)]
        if len(figcaps) > 1:
            raise ValueError("Figure may contain at most one Figcaption")
        if figcaps:
            # Find its position
            idx = next(i for i, c in enumerate(children) if isinstance(c, Figcaption))
            if idx not in (0, len(children) - 1):
                raise ValueError("Figcaption must be the first or last child of Figure")
        return children
