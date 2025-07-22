from enum import Enum
from typing import List
from typing import Optional
from typing import Union

from pydantic import AnyUrl
from pydantic import Field

from contentcuration.utils.assessment.qti.base import TextType
from contentcuration.utils.assessment.qti.fields import LocalHrefPath
from contentcuration.utils.assessment.qti.html.base import BlockContentElement
from contentcuration.utils.assessment.qti.html.base import InlineContentElement
from contentcuration.utils.assessment.qti.html.content_types import InlineGroupList


class InlineHTMLText(InlineContentElement):
    children: InlineGroupList = Field(default_factory=list)


class BlockHTMLText(BlockContentElement):
    children: InlineGroupList = Field(default_factory=list)


class A(InlineHTMLText):
    href: LocalHrefPath
    type_: Optional[str] = None


class P(BlockHTMLText):
    pass


class Span(InlineHTMLText):
    pass


class H1(BlockHTMLText):
    pass


class H2(BlockHTMLText):
    pass


class H3(BlockHTMLText):
    pass


class H4(BlockHTMLText):
    pass


class H5(BlockHTMLText):
    pass


class H6(BlockHTMLText):
    pass


class Pre(BlockHTMLText):
    pass


class Em(InlineHTMLText):
    pass


class Code(InlineHTMLText):
    pass


class Kbd(InlineHTMLText):
    pass


class I(InlineHTMLText):  # noqa: E742
    pass


class Dfn(InlineHTMLText):
    pass


class Abbr(InlineHTMLText):
    pass


class Strong(InlineHTMLText):
    pass


class Sup(InlineHTMLText):
    pass


class Sub(InlineHTMLText):
    pass


class Var(InlineHTMLText):
    pass


class Small(InlineHTMLText):
    pass


class Samp(InlineHTMLText):
    pass


class B(InlineHTMLText):
    pass


class Cite(InlineHTMLText):
    pass


class Q(InlineHTMLText):
    cite: Optional[AnyUrl] = None


class BdoDir(Enum):
    LTR = "ltr"
    RTL = "rtl"


class Bdo(InlineHTMLText):
    dir: BdoDir


class Bdi(InlineHTMLText):
    pass


class Rt(InlineHTMLText):
    pass


class Rp(InlineContentElement):
    text: TextType


class Ruby(InlineContentElement):
    @classmethod
    def element_name(cls):
        return "ruby"

    children: List[Union[Rt, Rp, TextType]] = Field(default_factory=list)
