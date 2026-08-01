import base64
import logging
from dataclasses import dataclass
from dataclasses import field
from typing import Any
from typing import Dict
from typing import List
from typing import Optional
from typing import Tuple

from le_utils.constants import exercises

from contentcuration.utils.assessment.markdown import render_markdown
from contentcuration.utils.assessment.qti.assessment_item import AssessmentItem
from contentcuration.utils.assessment.qti.assessment_item import BaseValue
from contentcuration.utils.assessment.qti.assessment_item import CorrectResponse
from contentcuration.utils.assessment.qti.assessment_item import FieldValue
from contentcuration.utils.assessment.qti.assessment_item import ItemBody
from contentcuration.utils.assessment.qti.assessment_item import OutcomeDeclaration
from contentcuration.utils.assessment.qti.assessment_item import ResponseCondition
from contentcuration.utils.assessment.qti.assessment_item import ResponseDeclaration
from contentcuration.utils.assessment.qti.assessment_item import ResponseElse
from contentcuration.utils.assessment.qti.assessment_item import ResponseIf
from contentcuration.utils.assessment.qti.assessment_item import ResponseProcessing
from contentcuration.utils.assessment.qti.assessment_item import SetOutcomeValue
from contentcuration.utils.assessment.qti.assessment_item import Value
from contentcuration.utils.assessment.qti.assessment_item import Variable
from contentcuration.utils.assessment.qti.base import ElementTreeBase
from contentcuration.utils.assessment.qti.catalog import Card
from contentcuration.utils.assessment.qti.catalog import Catalog
from contentcuration.utils.assessment.qti.catalog import CatalogInfo
from contentcuration.utils.assessment.qti.catalog import HtmlContent
from contentcuration.utils.assessment.qti.constants import BaseType
from contentcuration.utils.assessment.qti.constants import Cardinality
from contentcuration.utils.assessment.qti.constants import Orientation
from contentcuration.utils.assessment.qti.constants import ShowHide
from contentcuration.utils.assessment.qti.html import Div
from contentcuration.utils.assessment.qti.html import FlowContentList
from contentcuration.utils.assessment.qti.html import P
from contentcuration.utils.assessment.qti.interaction_types.custom import (
    CustomInteraction,
)
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
    hints: List[Dict[str, Any]] = field(default_factory=list)


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


def _create_catalog_info(item: LegacyAssessmentItem) -> Optional[CatalogInfo]:
    """Build the dormant hint catalog, or None if the item has no usable hints."""
    try:
        sorted_hints = sorted(item.hints, key=lambda hint: hint.get("order", 0))
    except TypeError:
        # A mixed-type or otherwise incomparable "order" value must not crash
        # the channel publish - fall back to input order, same as base.py's
        # ExerciseArchiveGenerator._sort_by_order.
        logging.warning(
            "Unable to sort hints for assessment item %s, leaving unsorted.",
            item.assessment_id,
        )
        sorted_hints = item.hints
    cards = []
    for hint in sorted_hints:
        text = hint.get("hint")
        if not text or not text.strip():
            # Log + skip rather than crash the channel publish or emit an
            # empty card - matches the per-item log+skip preference.
            logging.warning(
                "Skipping hint with no text for assessment item %s",
                item.assessment_id,
            )
            continue
        cards.append(
            Card(
                html_content=HtmlContent(children=_create_html_content_from_text(text))
            )
        )
    if not cards:
        return None
    return CatalogInfo(catalog=[Catalog(id_="kolibri-hints", card=cards)])


def _response_declaration(
    cardinality: Cardinality, base_type: BaseType, correct_values: List[Value]
) -> ResponseDeclaration:
    return ResponseDeclaration(
        identifier="RESPONSE",
        cardinality=cardinality,
        base_type=base_type,
        correct_response=CorrectResponse(value=correct_values)
        if correct_values
        else None,
    )


def _create_choice_interaction_and_response(
    item: LegacyAssessmentItem,
) -> Tuple[Optional[ChoiceInteraction], Optional[ResponseDeclaration]]:
    """
    Create a QTI choice interaction for multiple choice questions, or
    ``(None, None)`` if the question has no answers to choose between.
    """
    if not item.answers:
        # An answerless choice question is ordinary in-progress authoring state -
        # it is what the editor writes for every newly added question - but the
        # XSD requires a qti-choice-interaction to carry at least one
        # qti-simple-choice, and there is nothing to bind a response to.
        return None, None

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

    response_declaration = _response_declaration(
        Cardinality.MULTIPLE if multiple_select else Cardinality.SINGLE,
        BaseType.IDENTIFIER,
        correct_values,
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

    response_declaration = _response_declaration(
        Cardinality.MULTIPLE if len(correct_values) > 1 else Cardinality.SINGLE,
        BaseType.FLOAT if float_answer else BaseType.STRING,
        correct_values,
    )
    return interaction, response_declaration


def build_perseus_custom_interaction_item(
    assessment_id: str, perseus_path: str, title: str, language: str
) -> QTIConversionResult:
    """
    Wrap a raw Perseus question in a schema-valid ``qti-assessment-item`` whose
    body is a single ``qti-custom-interaction`` (``data-type="perseus"``).

    The host's Perseus renderer owns rendering and grading, but the result is
    handled as a complete QTI question. The renderer reports its outcome through
    the ``RESPONSE`` variable as a record with fields ``correct`` (boolean),
    ``simpleAnswer`` (string) and ``answerState`` (an arbitrary object). The
    record declaration specifies no schema, so each field carries its own
    base-type at runtime and ``answerState`` need not be stringified.
    Response processing reads the ``correct`` field and sets
    the ``SCORE`` outcome to 1 (correct) or 0 (incorrect) - the standard
    correct/incorrect grading, expressed inline because no standard response
    processing template can inspect a record field.

    The Perseus JSON and its assets are declared as package files by the
    generator, not tracked from this XML, so ``file_dependencies`` is empty.
    """
    identifier = hex_to_qti_id(assessment_id)

    item = AssessmentItem(
        identifier=identifier,
        title=title,
        language=language,
        adaptive=False,
        time_dependent=False,
        response_declaration=[
            ResponseDeclaration(
                identifier="RESPONSE",
                cardinality=Cardinality.RECORD,
            )
        ],
        outcome_declaration=[
            OutcomeDeclaration(
                identifier="SCORE",
                cardinality=Cardinality.SINGLE,
                base_type=BaseType.FLOAT,
            )
        ],
        item_body=ItemBody(
            children=[
                CustomInteraction(
                    response_identifier="RESPONSE",
                    data_type="perseus",
                    data_perseus_path=perseus_path,
                )
            ]
        ),
        response_processing=ResponseProcessing(
            children=[
                ResponseCondition(
                    response_if=ResponseIf(
                        field_value=FieldValue(
                            field_identifier="correct",
                            variable=Variable(identifier="RESPONSE"),
                        ),
                        set_outcome_value=SetOutcomeValue(
                            identifier="SCORE",
                            base_value=BaseValue(base_type=BaseType.FLOAT, value="1"),
                        ),
                    ),
                    response_else=ResponseElse(
                        set_outcome_value=SetOutcomeValue(
                            identifier="SCORE",
                            base_value=BaseValue(base_type=BaseType.FLOAT, value="0"),
                        ),
                    ),
                )
            ]
        ),
    )

    xml = f'<?xml version="1.0" encoding="UTF-8"?>\n{item.to_xml_string()}'

    return QTIConversionResult(identifier=identifier, xml=xml, file_dependencies=[])


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

    if interaction is None:
        # Emit the question text alone, ungraded. Div because rendered markdown
        # can start with a top level <math>, which qti-item-body does not accept
        # directly; P() because the container cannot be empty and a newly added
        # question has no text yet.
        item_body = ItemBody(
            children=[
                Div(children=_create_html_content_from_text(item.question) or [P()])
            ]
        )
        response_declarations = []
        response_processing = None
    else:
        item_body = ItemBody(children=[interaction])
        response_declarations = [response_declaration]
        response_processing = ResponseProcessing(
            template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"
        )

    outcome_declaration = OutcomeDeclaration(
        identifier="SCORE", cardinality=Cardinality.SINGLE, base_type=BaseType.FLOAT
    )

    qti_item_id = hex_to_qti_id(item.assessment_id)

    qti_item = AssessmentItem(
        identifier=qti_item_id,
        title=item.title,
        language=item.language,
        adaptive=False,
        time_dependent=False,
        response_declaration=response_declarations,
        outcome_declaration=[outcome_declaration],
        item_body=item_body,
        catalog_info=_create_catalog_info(item),
        response_processing=response_processing,
    )

    xml_content = qti_item.to_xml_string()
    full_xml = f'<?xml version="1.0" encoding="UTF-8"?>\n{xml_content}'

    return QTIConversionResult(
        identifier=qti_item_id,
        xml=full_xml,
        file_dependencies=qti_item.get_file_dependencies(),
    )
