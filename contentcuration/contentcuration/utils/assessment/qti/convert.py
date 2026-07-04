import base64
from dataclasses import dataclass
from typing import Any
from typing import Dict
from typing import List
from typing import Tuple

from le_utils.constants import exercises

from contentcuration.utils.assessment.markdown import render_markdown
from contentcuration.utils.assessment.qti.assessment_item import AssessmentItem
from contentcuration.utils.assessment.qti.assessment_item import CorrectResponse
from contentcuration.utils.assessment.qti.assessment_item import ItemBody
from contentcuration.utils.assessment.qti.assessment_item import OutcomeDeclaration
from contentcuration.utils.assessment.qti.assessment_item import ResponseDeclaration
from contentcuration.utils.assessment.qti.assessment_item import ResponseProcessing
from contentcuration.utils.assessment.qti.assessment_item import Value
from contentcuration.utils.assessment.qti.base import ElementTreeBase
from contentcuration.utils.assessment.qti.constants import BaseType
from contentcuration.utils.assessment.qti.constants import Cardinality
from contentcuration.utils.assessment.qti.constants import Orientation
from contentcuration.utils.assessment.qti.constants import ShowHide
from contentcuration.utils.assessment.qti.html import Div
from contentcuration.utils.assessment.qti.html import FlowContentList
from contentcuration.utils.assessment.qti.html import P
from contentcuration.utils.assessment.qti.interaction_types.simple import (
    ChoiceInteraction,
)
from contentcuration.utils.assessment.qti.interaction_types.simple import SimpleChoice
from contentcuration.utils.assessment.qti.interaction_types.text_based import (
    TextEntryInteraction,
)
from contentcuration.utils.assessment.qti.prompt import Prompt


choice_interactions = {
    exercises.MULTIPLE_SELECTION,
    exercises.SINGLE_SELECTION,
    "true_false",
}
text_entry_interactions = {exercises.INPUT_QUESTION, exercises.FREE_RESPONSE}


def hex_to_qti_id(hex_string):
    """
    Encode a 32 digit hex to a 22 character base64 encoded id and a K prefix.
    """
    bytes_data = bytes.fromhex(hex_string)
    return f"K{base64.urlsafe_b64encode(bytes_data).decode('ascii').rstrip('=')}"


@dataclass(frozen=True)
class LegacyAssessmentItem:
    type: str
    question: str
    answers: List[Dict[str, Any]]
    randomize: bool
    assessment_id: str
    title: str
    language: str


@dataclass(frozen=True)
class QTIConversionResult:
    identifier: str
    xml: str
    file_dependencies: List[str]


def _create_html_content_from_text(text: str) -> FlowContentList:
    """Convert text content to QTI HTML flow content."""
    if not text.strip():
        return []
    markup = render_markdown(text)
    return ElementTreeBase.from_string(markup)


def _create_choice_interaction_and_response(
    item: LegacyAssessmentItem,
) -> Tuple[ChoiceInteraction, ResponseDeclaration]:
    """Create a QTI choice interaction for multiple choice questions."""
    multiple_select = item.type == exercises.MULTIPLE_SELECTION

    prompt = Prompt(children=_create_html_content_from_text(item.question))

    choices = []
    correct_values = []
    for i, answer in enumerate(item.answers):
        choice_id = f"choice_{i}"
        choice_content = _create_html_content_from_text(answer.get("answer", ""))

        choice = SimpleChoice(
            identifier=choice_id,
            children=choice_content,
            show_hide=ShowHide.SHOW,
            fixed=False,
        )
        choices.append(choice)

        if answer.get("correct", False):
            correct_values.append(Value(value=choice_id))

    response_declaration = ResponseDeclaration(
        identifier="RESPONSE",
        cardinality=Cardinality.MULTIPLE if multiple_select else Cardinality.SINGLE,
        base_type=BaseType.IDENTIFIER,
        correct_response=CorrectResponse(value=correct_values)
        if correct_values
        else None,
    )

    interaction = ChoiceInteraction(
        response_identifier="RESPONSE",
        prompt=prompt,
        answers=choices,
        shuffle=item.randomize,
        max_choices=len(choices) if multiple_select else 1,
        min_choices=0,
        orientation=Orientation.VERTICAL,
    )
    return interaction, response_declaration


def _create_text_entry_interaction_and_response(
    item: LegacyAssessmentItem,
) -> Tuple[Div, ResponseDeclaration]:
    prompt = _create_html_content_from_text(item.question)
    interaction_element = TextEntryInteraction(
        response_identifier="RESPONSE",
        expected_length=50,  # Default expected length
        placeholder_text="Enter your answer here",
    )
    # Text entry interaction is an inline element, so wrap it in a paragraph tag.
    interaction_element = P(children=[interaction_element])
    # prompt is already a list of elements, so just append the interaction to it.
    prompt.append(interaction_element)
    interaction = Div(children=prompt)

    correct_values = []
    values_float = []
    for answer in item.answers:
        if answer["correct"]:
            correct_values.append(Value(value=str(answer["answer"])))
        try:
            float(answer["answer"])
            values_float.append(True)
        except ValueError:
            values_float.append(False)
    float_answer = bool(values_float) and all(values_float)

    response_declaration = ResponseDeclaration(
        identifier="RESPONSE",
        cardinality=Cardinality.MULTIPLE
        if len(correct_values) > 1
        else Cardinality.SINGLE,
        base_type=BaseType.FLOAT if float_answer else BaseType.STRING,
        correct_response=CorrectResponse(value=correct_values)
        if correct_values
        else None,
    )
    return interaction, response_declaration


def convert_legacy_assessment_item_to_qti(
    item: LegacyAssessmentItem,
) -> QTIConversionResult:
    if item.type in choice_interactions:
        interaction, response_declaration = _create_choice_interaction_and_response(
            item
        )
    elif item.type in text_entry_interactions:
        interaction, response_declaration = _create_text_entry_interaction_and_response(
            item
        )
    else:
        raise ValueError(f"Unsupported question type: {item.type}")

    item_body = ItemBody(children=[interaction])

    outcome_declaration = OutcomeDeclaration(
        identifier="SCORE", cardinality=Cardinality.SINGLE, base_type=BaseType.FLOAT
    )

    response_processing = ResponseProcessing(
        template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"
    )

    qti_item_id = hex_to_qti_id(item.assessment_id)

    qti_item = AssessmentItem(
        identifier=qti_item_id,
        title=item.title,
        language=item.language,
        adaptive=False,
        time_dependent=False,
        response_declaration=[response_declaration],
        outcome_declaration=[outcome_declaration],
        item_body=item_body,
        response_processing=response_processing,
    )

    xml_content = qti_item.to_xml_string()
    full_xml = f'<?xml version="1.0" encoding="UTF-8"?>\n{xml_content}'

    return QTIConversionResult(
        identifier=qti_item_id,
        xml=full_xml,
        file_dependencies=qti_item.get_file_dependencies(),
    )
