from typing import Annotated
from typing import List
from typing import Optional

from annotated_types import Len
from pydantic import Field
from pydantic import field_validator
from pydantic import model_validator
from pydantic import NonNegativeInt

from contentcuration.utils.assessment.qti.base import BaseSequence
from contentcuration.utils.assessment.qti.base import QTIBase
from contentcuration.utils.assessment.qti.constants import Orientation
from contentcuration.utils.assessment.qti.constants import ShowHide
from contentcuration.utils.assessment.qti.fields import QTIIdentifier
from contentcuration.utils.assessment.qti.html import FlowContentList
from contentcuration.utils.assessment.qti.interaction_types.base import BlockInteraction
from contentcuration.utils.assessment.qti.prompt import Prompt


class SimpleChoice(QTIBase, BaseSequence):
    """
    Represents a choice in a QTI choice interaction.
    Each simple choice has an identifier and can contain HTML content
    or a mixture of HTML and QTI elements.
    """

    identifier: QTIIdentifier
    template_identifier: Optional[str] = None
    show_hide: ShowHide = ShowHide.SHOW
    fixed: bool = False
    children: FlowContentList = Field(default_factory=list)


class ChoiceInteraction(BlockInteraction):
    """For multiple choice questions"""

    shuffle: Optional[bool] = None
    max_choices: Optional[NonNegativeInt] = 1
    min_choices: Optional[NonNegativeInt] = 0
    orientation: Orientation = Orientation.VERTICAL
    prompt: Optional[Prompt] = None
    answers: Annotated[List[SimpleChoice], Len(min_length=1)]

    @field_validator("answers")
    def _unique_answer_identifiers(
        cls, answers: List[SimpleChoice]
    ) -> List[SimpleChoice]:
        identifiers = [choice.identifier for choice in answers]
        if len(set(identifiers)) != len(identifiers):
            raise ValueError(
                "Duplicate identifiers detected in ChoiceInteraction.answers; "
                "each SimpleChoice.identifier must be unique."
            )
        return answers

    @model_validator(mode="after")
    def _check_choice_bounds(self):
        if self.min_choices > self.max_choices:
            raise ValueError("`min_choices` cannot exceed `max_choices`")
        if self.max_choices > len(self.answers):
            raise ValueError("`max_choices` cannot exceed number of answers")
        return self
