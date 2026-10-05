import json

import pytest
from le_utils.constants import exercises

from contentcuration.tests.utils.qti.test_validation import _item_xml
from contentcuration.tests.utils.qti.test_validation import ENTITY_CHOICE_ITEM
from contentcuration.tests.utils.qti.test_validation import HINTED_EDITOR_ITEM
from contentcuration.utils.assessment.qti.perseus_derive import derive_perseus_item
from contentcuration.utils.assessment.qti.perseus_derive import (
    is_answerless_numeric_entry,
)
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


def _text_item(
    cardinality,
    correct_values,
    prompt="<p>What is 6 times 7?</p>",
    base_type="float",
    map_entries=(),
):
    correct = ""
    if correct_values:
        correct = "<qti-correct-response>{}</qti-correct-response>".format(
            "".join("<qti-value>{}</qti-value>".format(v) for v in correct_values)
        )
    mapping = ""
    if map_entries:
        mapping = '<qti-mapping default-value="0.0">{}</qti-mapping>'.format(
            "".join(
                '<qti-map-entry map-key="{}" mapped-value="{}" />'.format(key, value)
                for key, value in map_entries
            )
        )
    return _item_xml(
        "item_text",
        "Text Item",
        '<qti-response-declaration identifier="RESPONSE" cardinality="{}" '
        'base-type="{}">{}{}</qti-response-declaration>'.format(
            cardinality, base_type, correct, mapping
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


@pytest.mark.parametrize(
    "value,expected",
    [
        ("+5", "5"),
        ("1E3", "1e3"),
        (" +5 ", "5"),
        ("+0", "0"),
    ],
)
def test_text_input_normalises_xsd_double_answers(value, expected):
    result = derive_perseus_item(_Item(_text_item("single", [value])))
    assert json.loads(result.answers) == [
        {"answer": expected, "correct": True, "order": 0}
    ]


def test_text_input_multiple_correct_values():
    item = _Item(_text_item("multiple", ["1", "2"]))
    result = derive_perseus_item(item)
    assert result.type == exercises.INPUT_QUESTION
    answers = json.loads(result.answers)
    assert [a["answer"] for a in answers] == ["1", "2"]
    assert all(a["correct"] for a in answers)


def test_integer_text_input_derivation():
    raw_data = _text_item("single", ["42"], base_type="integer")
    assert is_perseus_derivable(raw_data) is True
    answers = json.loads(derive_perseus_item(_Item(raw_data)).answers)
    assert [a["answer"] for a in answers] == ["42"]


@pytest.mark.parametrize(
    "map_entries,expected",
    [
        pytest.param([("41", "0.5")], ["42"], id="partial_credit_key"),
        pytest.param([("0", "0.0")], ["42"], id="zero_mapped_key"),
        pytest.param([("13", "1.0")], ["42", "13"], id="full_credit_key"),
    ],
)
def test_text_input_mapping_keeps_correct_response(map_entries, expected):
    raw_data = _text_item("single", ["42"], map_entries=map_entries)
    assert is_answerless_numeric_entry(raw_data) is False
    answers = json.loads(derive_perseus_item(_Item(raw_data)).answers)
    assert [a["answer"] for a in answers] == expected
    assert all(a["correct"] for a in answers)


def test_answerless_float_entry_is_skipped_but_node_stays_derivable(caplog):
    raw_data = _text_item("single", [])
    assert derive_perseus_item(_Item(raw_data)) is None
    assert "no correct answer" in caplog.text
    assert is_perseus_derivable(raw_data) is True


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

MATCH_CORRECT_PROCESSING = (
    '<qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/'
    'rptemplates/match_correct.xml" />'
)

TOLERANCE_ITEM = _text_item("single", []).replace(
    MATCH_CORRECT_PROCESSING,
    "<qti-response-processing><qti-response-condition><qti-response-if>"
    '<qti-equal tolerance-mode="absolute" tolerance="0.5">'
    '<qti-variable identifier="RESPONSE" />'
    '<qti-base-value base-type="float">42</qti-base-value></qti-equal>'
    '<qti-set-outcome-value identifier="SCORE">'
    '<qti-base-value base-type="float">1</qti-base-value>'
    "</qti-set-outcome-value></qti-response-if></qti-response-condition>"
    "</qti-response-processing>",
)


def test_answered_text_entry_with_inline_processing_derives():
    raw_data = _text_item("single", ["42"]).replace(
        MATCH_CORRECT_PROCESSING,
        "<qti-response-processing><qti-response-condition><qti-response-if>"
        '<qti-match><qti-variable identifier="RESPONSE" />'
        '<qti-correct identifier="RESPONSE" /></qti-match>'
        '<qti-set-outcome-value identifier="SCORE">'
        '<qti-base-value base-type="float">1</qti-base-value>'
        "</qti-set-outcome-value></qti-response-if></qti-response-condition>"
        "</qti-response-processing>",
    )
    assert is_perseus_derivable(raw_data) is True
    answers = json.loads(derive_perseus_item(_Item(raw_data)).answers)
    assert [a["answer"] for a in answers] == ["42"]


@pytest.mark.parametrize(
    "processing",
    [
        pytest.param(
            '<qti-response-processing template="https://purl.imsglobal.org/spec/qti/'
            'v3p0/rptemplates/match_correct" />',
            id="no_xml_suffix",
        ),
        pytest.param(
            '<qti-response-processing template="http://www.imsglobal.org/question/'
            'qti_v3p0/rptemplates/match_correct" />',
            id="imsglobal_host",
        ),
        pytest.param(
            '<qti-response-processing template-location="https://purl.imsglobal.org/'
            'spec/qti/v3p0/rptemplates/match_correct.xml" />',
            id="template_location",
        ),
    ],
)
def test_text_entry_template_spellings_derive(processing):
    raw_data = _text_item("single", ["42"]).replace(
        MATCH_CORRECT_PROCESSING, processing
    )
    assert is_perseus_derivable(raw_data) is True
    answers = json.loads(derive_perseus_item(_Item(raw_data)).answers)
    assert [a["answer"] for a in answers] == ["42"]
    answerless = _text_item("single", []).replace(MATCH_CORRECT_PROCESSING, processing)
    assert is_answerless_numeric_entry(answerless) is True


@pytest.mark.parametrize(
    "raw_data",
    [
        pytest.param(ORDER_ITEM, id="order_interaction"),
        pytest.param(TWO_INTERACTION_ITEM, id="two_interactions"),
        pytest.param(EXTENDED_TEXT_ITEM, id="extended_text"),
        pytest.param(MALFORMED_XML, id="malformed_xml"),
        pytest.param(ENTITY_CHOICE_ITEM, id="doctype_entity"),
        pytest.param(
            _text_item("single", ["cat"], base_type="string"), id="string_text_entry"
        ),
        pytest.param(TOLERANCE_ITEM, id="custom_processed_text_entry"),
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


_BASE_CHOICE_ITEM = _choice_item(
    "single",
    ["choice_0"],
    [("choice_0", "Option A"), ("choice_1", "Option B")],
    catalog=HINT_CATALOG,
)


@pytest.mark.parametrize(
    "anchor, after",
    [
        pytest.param("<qti-item-body>", True, id="item_body_start"),
        pytest.param("<qti-simple-choice", False, id="before_first_choice"),
        pytest.param("<qti-prompt>", True, id="in_prompt"),
        pytest.param("<qti-correct-response>", False, id="in_response_declaration"),
        pytest.param("</qti-correct-response>", False, id="in_correct_response"),
        pytest.param('<qti-card support="ext:kolibri-hint">', True, id="in_hint_card"),
    ],
)
@pytest.mark.parametrize("node", ["<!-- note -->", "<?target data?>"])
def test_comments_do_not_change_derivation(anchor, after, node):
    replacement = anchor + node if after else node + anchor
    commented = _BASE_CHOICE_ITEM.replace(anchor, replacement, 1)
    assert commented != _BASE_CHOICE_ITEM
    assert is_perseus_derivable(commented) is True
    assert derive_perseus_item(_Item(commented)) == derive_perseus_item(
        _Item(_BASE_CHOICE_ITEM)
    )


def test_comment_inside_qti_value_keeps_text_after_it():
    raw_data = _text_item("single", ["1<!-- c -->2"])
    answers = json.loads(derive_perseus_item(_Item(raw_data)).answers)
    assert answers == [{"answer": "12", "correct": True, "order": 0}]


@pytest.mark.parametrize(
    "prompt",
    [
        "<ul><li>one<!-- c --></li><li>two</li></ul>",
        "<p>Run <code>a<!-- c -->b</code></p>",
    ],
)
def test_comment_inside_prompt_markup_does_not_change_question(prompt):
    plain = prompt.replace("<!-- c -->", "")
    commented = derive_perseus_item(_Item(_text_item("single", ["1"], prompt)))
    assert (
        commented.question
        == derive_perseus_item(_Item(_text_item("single", ["1"], plain))).question
    )


@pytest.mark.parametrize(
    "raw_data,expected",
    [
        pytest.param(_text_item("single", []), True, id="float_no_answer"),
        pytest.param(
            _text_item("single", [], map_entries=[("0", "0.0")]),
            True,
            id="float_only_zero_mapped",
        ),
        pytest.param(_text_item("single", ["0"]), False, id="float_zero_answer"),
        pytest.param(_text_item("single", ["False"]), True, id="float_non_number"),
        pytest.param(
            _text_item("single", [], map_entries=[("13", "1.0"), ("12", "1.0")]),
            False,
            id="float_mapped_answers",
        ),
        pytest.param(
            _text_item("single", [], base_type="string"), False, id="string_no_answer"
        ),
        pytest.param(
            _choice_item("single", [], [("choice_0", "A")]), False, id="choice"
        ),
        pytest.param(TOLERANCE_ITEM, False, id="custom_processed"),
        pytest.param(MALFORMED_XML, False, id="malformed_xml"),
    ],
)
def test_is_answerless_numeric_entry(raw_data, expected):
    assert is_answerless_numeric_entry(raw_data) is expected
