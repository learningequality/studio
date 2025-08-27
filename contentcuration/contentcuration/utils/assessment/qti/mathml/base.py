from typing import List
from typing import Optional
from typing import Union

from contentcuration.utils.assessment.qti.base import ElementTreeBase
from contentcuration.utils.assessment.qti.base import TextType
from contentcuration.utils.assessment.qti.mathml.fields import ColorValue
from contentcuration.utils.assessment.qti.mathml.fields import LengthPercentage
from contentcuration.utils.assessment.qti.mathml.fields import ScriptLevel


class MathMLElement(ElementTreeBase):
    """
    Base class for all MathML elements.
    Similar to HTMLElement but for MathML namespace.
    """

    mathcolor: Optional[ColorValue] = None
    mathbackground: Optional[ColorValue] = None
    mathsize: Optional[LengthPercentage] = None
    displaystyle: Optional[bool] = None
    scriptlevel: Optional[ScriptLevel] = None

    autofocus: Optional[bool] = None


class MathMLPresentationElement(MathMLElement):
    """
    Base class for all presentation elements that can appear in math content.
    Excludes annotation elements which are semantic-only.
    """

    pass


class MathMLTokenElement(MathMLPresentationElement):
    """
    Base class for token elements (mi, mn, mo, mtext, ms, mspace).
    These represent the atomic units of mathematical notation.
    """

    pass


class MathMLLayoutElement(MathMLPresentationElement):
    """
    Base class for general layout elements (mrow, mfrac, msqrt, mroot, etc.).
    These control the 2D layout of mathematical expressions.
    """

    pass


class MathMLScriptElement(MathMLLayoutElement):
    """
    Base class for script elements (msub, msup, msubsup, munder, mover, etc.).
    These attach scripts (sub/super/under/over) to base expressions.
    """

    pass


class MathMLGroupingElement(MathMLPresentationElement):
    """
    Base class for grouping/container elements that don't affect layout much
    but provide structure (maction, semantics, mphantom, mstyle).
    """

    pass


PresentationContent = Union[MathMLPresentationElement, TextType]
PresentationContentList = List[PresentationContent]
