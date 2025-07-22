from typing import List
from typing import Union

from contentcuration.utils.assessment.qti.base import TextType
from contentcuration.utils.assessment.qti.html.base import FlowContentElement
from contentcuration.utils.assessment.qti.html.base import InlineContentElement
from contentcuration.utils.assessment.qti.interaction_types.base import BlockInteraction
from contentcuration.utils.assessment.qti.interaction_types.base import (
    InlineInteraction,
)
from contentcuration.utils.assessment.qti.mathml import Math


FlowContent = Union[FlowContentElement, TextType]
FlowContentList = List[FlowContent]
InlineContent = Union[InlineContentElement, TextType]
InlineContentList = List[InlineContent]
InlineGroup = Union[
    InlineContentElement,
    InlineInteraction,
    # Not implemented
    # Hottext,
    # PrintedVariable,
    # Gap,
    # FeedbackInline,
    # TemplateInline,
    # These three should derive from InlineInteraction
    # InlineChoiceInteraction,
    # EndAttemptInteraction,
    # CustomInteraction,
    Math,
    # Include,
]

InlineGroupList = List[Union[InlineGroup, TextType]]

FlowGroup = Union[
    FlowContentElement,
    BlockInteraction,
    InlineInteraction,
    Math,
]

FlowGroupList = List[Union[FlowGroup, TextType]]
