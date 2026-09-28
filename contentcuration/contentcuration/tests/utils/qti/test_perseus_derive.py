import json

import pytest
from le_utils.constants import exercises

from contentcuration.tests.utils.qti.test_validation import _item_xml
from contentcuration.tests.utils.qti.test_validation import HINTED_EDITOR_ITEM
from contentcuration.utils.assessment.qti.perseus_derive import derive_perseus_item
from contentcuration.utils.assessment.qti.perseus_derive import is_perseus_derivable


class _Item:
    """Minimal stand-in for a Django AssessmentItem."""

    def __init__(self, raw_data, randomize=False, assessment_id="a" * 32):
        self.raw_data = raw_data
        self.randomize = randomize
        self.assessment_id = assessment_id


def _choice_item(
    cardinality,
    correct_values,
    choices,
    prompt="Pick one.",
    catalog="",
    response_identifier="RESPONSE",
    declaration_identifier=None,
):
    correct = "".join("<qti-value>{}</qti-value>".format(v) for v in correct_values)
    simple_choices = "".join(
        '<qti-simple-choice identifier="{}" show-hide="show" fixed="false">{}'
        "</qti-simple-choice>".format(identifier, body)
        for identifier, body in choices
    )
    xml = _item_xml(
        "item_choice",
        "Choice Item",
        '<qti-response-declaration identifier="{}" cardinality="{}" '
        'base-type="identifier"><qti-correct-response>{}'
        "</qti-correct-response></qti-response-declaration>".format(
            declaration_identifier or response_identifier, cardinality, correct
        ),
        '<qti-choice-interaction response-identifier="{}" max-choices="1" '
        'min-choices="0" orientation="vertical">'
        "<qti-prompt>{}</qti-prompt>{}"
        "</qti-choice-interaction>".format(response_identifier, prompt, simple_choices),
    )
    if catalog:
        xml = xml.replace(
            "<qti-response-processing", catalog + "<qti-response-processing"
        )
    return xml


def _text_item(cardinality, correct_values, prompt="<p>What is 6 times 7?</p>"):
    correct = "".join("<qti-value>{}</qti-value>".format(v) for v in correct_values)
    return _item_xml(
        "item_text",
        "Text Item",
        '<qti-response-declaration identifier="RESPONSE" cardinality="{}" '
        'base-type="string"><qti-correct-response>{}'
        "</qti-correct-response></qti-response-declaration>".format(
            cardinality, correct
        ),
        '<div>{}<p><qti-text-entry-interaction response-identifier="RESPONSE" '
        'expected-length="50" /></p></div>'.format(prompt),
    )


HINT_CATALOG = (
    '<qti-catalog-info><qti-catalog id="kolibri-hints">'
    '<qti-card support="ext:kolibri-hint"><qti-html-content>'
    "<p>First hint.</p></qti-html-content></qti-card>"
    '<qti-card support="ext:kolibri-hint"><qti-html-content>'
    "<p>Second hint.</p></qti-html-content></qti-card>"
    "</qti-catalog></qti-catalog-info>"
)


def test_single_choice_derivation():
    item = _Item(
        _choice_item(
            "single",
            ["choice_0"],
            [("choice_0", "Option A"), ("choice_1", "Option B")],
            prompt="Select the correct answer.",
        )
    )
    result = derive_perseus_item(item)
    assert result.type == exercises.SINGLE_SELECTION
    assert result.question == "Select the correct answer."
    answers = json.loads(result.answers)
    assert [a["answer"] for a in answers] == ["Option A", "Option B"]
    assert [a["correct"] for a in answers] == [True, False]
    assert [a["order"] for a in answers] == [0, 1]


def test_multiple_choice_derivation():
    item = _Item(
        _choice_item(
            "multiple",
            ["choice_0", "choice_2"],
            [
                ("choice_0", "A"),
                ("choice_1", "B"),
                ("choice_2", "C"),
            ],
        )
    )
    result = derive_perseus_item(item)
    assert result.type == exercises.MULTIPLE_SELECTION
    answers = json.loads(result.answers)
    assert [a["correct"] for a in answers] == [True, False, True]


def test_text_input_derivation():
    item = _Item(_text_item("single", ["42"]))
    result = derive_perseus_item(item)
    assert result.type == exercises.INPUT_QUESTION
    assert "What is 6 times 7?" in result.question
    assert "qti-text-entry-interaction" not in result.question
    answers = json.loads(result.answers)
    assert answers == [{"answer": "42", "correct": True, "order": 0}]


def test_text_input_multiple_correct_values():
    item = _Item(_text_item("multiple", ["1", "2"]))
    result = derive_perseus_item(item)
    assert result.type == exercises.INPUT_QUESTION
    answers = json.loads(result.answers)
    assert [a["answer"] for a in answers] == ["1", "2"]
    assert all(a["correct"] for a in answers)


def test_math_prompt_survives_into_question():
    prompt = (
        "<p>Solve <math><semantics><mrow><mi>x</mi></mrow>"
        '<annotation encoding="application/x-tex">x^2</annotation>'
        "</semantics></math></p>"
    )
    item = _Item(_text_item("single", ["4"], prompt=prompt))
    result = derive_perseus_item(item)
    assert "$$x^2$$" in result.question


def test_hints_survive_a_round_trip_through_the_editor():
    """The hints an author edits in the QTI editor still publish as legacy hints.

    Studio's own conversion writes them into the catalog on read; this asserts the
    document the editor writes back is still one publishing can read them out of, which
    is what makes editing a converted question safe.
    """
    result = derive_perseus_item(_Item(HINTED_EDITOR_ITEM))

    hints = json.loads(result.hints)
    assert [h["hint"] for h in hints] == ["test", "test2 2", "test3 3"]
    assert [h["order"] for h in hints] == [0, 1, 2]


def test_hint_derivation():
    item = _Item(
        _choice_item(
            "single",
            ["choice_0"],
            [("choice_0", "A"), ("choice_1", "B")],
            catalog=HINT_CATALOG,
        )
    )
    result = derive_perseus_item(item)
    hints = json.loads(result.hints)
    assert [h["hint"] for h in hints] == ["First hint.", "Second hint."]
    assert [h["order"] for h in hints] == [0, 1]


def test_derived_fields_carry_item_metadata():
    item = _Item(
        _choice_item("single", ["choice_0"], [("choice_0", "A"), ("choice_1", "B")]),
        randomize=True,
        assessment_id="b" * 32,
    )
    result = derive_perseus_item(item)
    assert result.randomize is True
    # The proxy's id is the QTI item's root identifier (not the Django
    # assessment_id), so the derived Perseus item JSON filename matches the id
    # the QTI manifest records in the node's assessment metadata.
    assert result.assessment_id == "item_choice"
    assert result.raw_data == "{}"
    assert json.loads(result.hints) == []


def test_custom_response_identifier_derives_correct_answers():
    """The response declaration is keyed off the interaction's own
    response-identifier, not a hardcoded ``RESPONSE``."""
    item = _Item(
        _choice_item(
            "single",
            ["choice_0"],
            [("choice_0", "A"), ("choice_1", "B")],
            response_identifier="RESPONSE_1",
        )
    )
    result = derive_perseus_item(item)
    assert result.type == exercises.SINGLE_SELECTION
    answers = json.loads(result.answers)
    assert [a["correct"] for a in answers] == [True, False]


def test_response_identifier_mismatch_degrades_to_qti_only():
    """An interaction whose response-identifier resolves to no declaration is
    not derivable, so the node degrades to QTI-only rather than silently
    deriving zero correct answers."""
    raw_data = _choice_item(
        "single",
        ["choice_0"],
        [("choice_0", "A"), ("choice_1", "B")],
        response_identifier="RESPONSE_A",
        declaration_identifier="RESPONSE_B",
    )
    assert derive_perseus_item(_Item(raw_data)) is None
    assert is_perseus_derivable(raw_data) is False


ORDER_INTERACTION_BODY = (
    '<qti-order-interaction response-identifier="RESPONSE" shuffle="false" '
    'orientation="vertical">'
    "<qti-prompt>Order the steps.</qti-prompt>"
    '<qti-simple-choice identifier="step1" show-hide="show" fixed="false">First'
    "</qti-simple-choice>"
    '<qti-simple-choice identifier="step2" show-hide="show" fixed="false">Second'
    "</qti-simple-choice>"
    "</qti-order-interaction>"
)

ORDER_ITEM = _item_xml(
    "item_order",
    "Order Item",
    '<qti-response-declaration identifier="RESPONSE" cardinality="ordered" '
    'base-type="identifier"><qti-correct-response>'
    "<qti-value>step1</qti-value><qti-value>step2</qti-value>"
    "</qti-correct-response></qti-response-declaration>",
    ORDER_INTERACTION_BODY,
)

TWO_INTERACTION_ITEM = _item_xml(
    "item_two",
    "Two Interaction Item",
    '<qti-response-declaration identifier="RESPONSE" cardinality="single" '
    'base-type="identifier"><qti-correct-response><qti-value>choice_0</qti-value>'
    "</qti-correct-response></qti-response-declaration>",
    "<div>"
    '<qti-choice-interaction response-identifier="RESPONSE" max-choices="1" '
    'min-choices="0" orientation="vertical">'
    '<qti-simple-choice identifier="choice_0" show-hide="show" fixed="false">A'
    "</qti-simple-choice></qti-choice-interaction>"
    '<p><qti-text-entry-interaction response-identifier="RESPONSE" '
    'expected-length="50" /></p>'
    "</div>",
)

EXTENDED_TEXT_ITEM = _item_xml(
    "item_extended",
    "Extended Text Item",
    '<qti-response-declaration identifier="RESPONSE" cardinality="single" '
    'base-type="string"><qti-correct-response><qti-value>whatever</qti-value>'
    "</qti-correct-response></qti-response-declaration>",
    '<qti-extended-text-interaction response-identifier="RESPONSE" '
    'expected-length="200"><qti-prompt>Write an essay.</qti-prompt>'
    "</qti-extended-text-interaction>",
)

MALFORMED_XML = "<qti-assessment-item><unclosed>"


@pytest.mark.parametrize(
    "raw_data",
    [
        pytest.param(ORDER_ITEM, id="order_interaction"),
        pytest.param(TWO_INTERACTION_ITEM, id="two_interactions"),
        pytest.param(EXTENDED_TEXT_ITEM, id="extended_text"),
        pytest.param(MALFORMED_XML, id="malformed_xml"),
    ],
)
def test_not_derivable(raw_data):
    assert derive_perseus_item(_Item(raw_data)) is None
    assert is_perseus_derivable(raw_data) is False


def test_is_perseus_derivable_true_for_choice_and_text():
    choice = _choice_item(
        "single", ["choice_0"], [("choice_0", "A"), ("choice_1", "B")]
    )
    assert is_perseus_derivable(choice) is True
    assert is_perseus_derivable(_text_item("single", ["42"])) is True
