from typing import Annotated
from typing import List
from typing import Optional
from typing import Union

from annotated_types import Len
from pydantic import Field
from pydantic import field_validator

from .base import MathMLElement
from .base import MathMLGroupingElement
from .base import MathMLLayoutElement
from .base import MathMLPresentationElement
from .base import MathMLScriptElement
from .base import MathMLTokenElement
from .base import PresentationContent
from .base import PresentationContentList
from .fields import LengthPercentage
from .fields import MathMLDisplay
from .fields import MathMLForm
from contentcuration.utils.assessment.qti.base import TextType


PresentationContentListLength2 = Annotated[PresentationContentList, Len(2, 2)]
PresentationContentListLength3 = Annotated[PresentationContentList, Len(3, 3)]


class Math(MathMLElement):
    display: Optional[MathMLDisplay] = None
    alttext: Optional[str] = None
    children: PresentationContentList = Field(default_factory=list)


NonEmptyText = Annotated[List[TextType], Len(1)]


class Mi(MathMLTokenElement):
    # We deliberately do not include the `mathvariant` attribute here,
    # as the only valid value in MathMLCore is "normal", which is the default.
    children: NonEmptyText = Field(default_factory=list)


class Mn(MathMLTokenElement):
    children: NonEmptyText = Field(default_factory=list)


class Mo(MathMLTokenElement):
    accent: Optional[bool] = None
    fence: Optional[bool] = None
    form: Optional[MathMLForm] = None
    largeop: Optional[bool] = None
    lspace: Optional[LengthPercentage] = None
    maxsize: Optional[LengthPercentage] = None
    minsize: Optional[LengthPercentage] = None
    movablelimits: Optional[bool] = None
    rspace: Optional[LengthPercentage] = None
    separator: Optional[bool] = None
    stretchy: Optional[bool] = None
    symmetric: Optional[bool] = None
    children: NonEmptyText = Field(default_factory=list)


class Mtext(MathMLTokenElement):
    children: NonEmptyText = Field(default_factory=list)


class Ms(MathMLTokenElement):
    children: NonEmptyText = Field(default_factory=list)


class Mspace(MathMLTokenElement):
    width: Optional[LengthPercentage] = None
    height: Optional[LengthPercentage] = None
    depth: Optional[LengthPercentage] = None
    # This doesn't seem to be in the MathML Core spec
    # but is used by MathJax and latex2mathml, so we allow it.
    linebreak: Optional[str] = None


class Mrow(MathMLLayoutElement):
    children: PresentationContentList = Field(default_factory=list)


class Mfrac(MathMLLayoutElement):
    linethickness: Optional[LengthPercentage] = None
    children: PresentationContentListLength2 = Field(default_factory=list)


class Msqrt(MathMLLayoutElement):
    children: PresentationContentList = Field(default_factory=list)


class Mroot(MathMLLayoutElement):
    children: PresentationContentListLength2 = Field(default_factory=list)


class Mstyle(MathMLGroupingElement):
    children: PresentationContentList = Field(default_factory=list)


class Merror(MathMLGroupingElement):
    children: PresentationContentList = Field(default_factory=list)


class Mpadded(MathMLLayoutElement):
    width: Optional[LengthPercentage] = None
    height: Optional[LengthPercentage] = None
    depth: Optional[LengthPercentage] = None
    lspace: Optional[LengthPercentage] = None
    voffset: Optional[LengthPercentage] = None
    children: PresentationContentList = Field(default_factory=list)


class Mphantom(MathMLGroupingElement):
    children: PresentationContentList = Field(default_factory=list)


class Msub(MathMLScriptElement):
    children: PresentationContentListLength2 = Field(default_factory=list)


class Msup(MathMLScriptElement):
    children: PresentationContentListLength2 = Field(default_factory=list)


class Msubsup(MathMLScriptElement):
    children: PresentationContentListLength3 = Field(default_factory=list)


class Munder(MathMLScriptElement):
    accentunder: Optional[bool] = None
    children: PresentationContentListLength2 = Field(default_factory=list)


class Mover(MathMLScriptElement):
    accent: Optional[bool] = None
    children: PresentationContentListLength2 = Field(default_factory=list)


class Munderover(MathMLScriptElement):
    accent: Optional[bool] = None
    accentunder: Optional[bool] = None
    children: PresentationContentListLength3 = Field(default_factory=list)


class Mprescripts(MathMLElement):
    pass


class Mmultiscripts(MathMLScriptElement):
    children: List[Union[PresentationContent, Mprescripts]] = Field(
        default_factory=list
    )

    @field_validator("children")
    @classmethod
    def _validate_children(cls, v):
        if len(v) == 0:
            raise ValueError(
                "<mmultiscripts> must have at least one child (base element)"
            )

        # MathML Core: at most one <mprescripts>, and if present it must be last
        prescripts = [i for i, c in enumerate(v) if isinstance(c, Mprescripts)]
        if len(prescripts) > 1:
            raise ValueError("<mmultiscripts> may contain only one <mprescripts>")

        # Scripts must come in pairs (subscript, superscript)
        if prescripts:
            prescripts_index = prescripts[0]
            # Validate post-scripts (between base and mprescripts)
            post_scripts_count = prescripts_index - 1
            if post_scripts_count % 2 != 0:
                raise ValueError(
                    "Post-scripts must come in pairs (subscript, superscript)"
                )

            # Validate pre-scripts (after mprescripts)
            pre_scripts_count = len(v) - prescripts_index - 1
            if pre_scripts_count % 2 != 0:
                raise ValueError(
                    "Pre-scripts must come in pairs (subscript, superscript)"
                )
        else:
            # No mprescripts, all scripts after base must be in pairs
            scripts_count = len(v) - 1
            if scripts_count % 2 != 0:
                raise ValueError("Scripts must come in pairs (subscript, superscript)")

        return v


class Mtd(MathMLElement):
    columnspan: Optional[int] = None
    rowspan: Optional[int] = None
    children: PresentationContentList = Field(default_factory=list)


class Mtr(MathMLElement):
    children: List[Mtd] = Field(default_factory=list)


class Mtable(MathMLElement):
    children: List[Mtr] = Field(default_factory=list)


class Annotation(MathMLElement):
    encoding: Optional[str] = None
    children: NonEmptyText = Field(default_factory=list)


class AnnotationXml(MathMLElement):
    encoding: Optional[str] = None
    children: PresentationContentList = Field(default_factory=list)

    @classmethod
    def element_name(cls):
        return "annotation-xml"


class Semantics(MathMLGroupingElement):
    children: Annotated[
        List[Union[Annotation, AnnotationXml, PresentationContent]], Len(2)
    ] = Field(default_factory=list)

    @field_validator("children")
    @classmethod
    def validate_children_structure(cls, v):
        if len(v) == 0:
            raise ValueError("Semantics must have at least one child")

        # First child must be presentation content MathMLPresentationElement
        first_child = v[0]
        if not isinstance(first_child, MathMLPresentationElement):
            raise ValueError(
                "First child of Semantics must be MathML presentation content"
            )

        # Remaining children must be annotations
        for i, child in enumerate(v[1:], 1):
            if not isinstance(child, (Annotation, AnnotationXml)):
                raise ValueError(
                    f"Child at position {i} must be Annotation or AnnotationXml, got {type(child).__name__}"
                )

        return v
