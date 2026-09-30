import pytest
from lxml import etree

from contentcuration.tests.utils.qti.test_perseus_derive import _choice_item
from contentcuration.tests.utils.qti.test_perseus_derive import _text_item
from contentcuration.tests.utils.qti.test_validation import _item_xml
from contentcuration.utils.assessment.qti.normalize import (
    normalize_text_entry_cardinality,
)
from contentcuration.utils.assessment.qti.validation import parse_qti_xml
from contentcuration.utils.assessment.qti.validation import validate_qti_item

MAP_RESPONSE = "https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/map_response.xml"
MATCH_CORRECT = "https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"


def _parse(raw_data):
    return parse_qti_xml(raw_data.encode("utf-8")).getroot()


def _find(root, localname):
    return [
        el
        for el in root.iter()
        if isinstance(el.tag, str) and etree.QName(el).localname == localname
    ]


def _text_item_with_mapping(cardinality, entries):
    map_entries = "".join(
        '<qti-map-entry map-key="{}" mapped-value="1" case-sensitive="{}" />'.format(
            key, case
        )
        for key, case in entries
    )
    correct = "".join("<qti-value>{}</qti-value>".format(key) for key, _ in entries)
    return _item_xml(
        "item_text",
        "Text Item",
        '<qti-response-declaration identifier="RESPONSE" cardinality="{}" '
        'base-type="string"><qti-correct-response>{}</qti-correct-response>'
        '<qti-mapping default-value="0">{}</qti-mapping>'
        "</qti-response-declaration>".format(cardinality, correct, map_entries),
        '<p><qti-text-entry-interaction response-identifier="RESPONSE" /></p>',
    )


@pytest.mark.parametrize("base_type", ["string", "float"])
def test_multi_answer_text_entry_becomes_single_with_mapping(base_type):
    raw_data = _text_item("multiple", ["1", "2.5", "1e3"]).replace(
        'base-type="string"', 'base-type="{}"'.format(base_type)
    )
    result = normalize_text_entry_cardinality(raw_data)

    root = _parse(result)
    (declaration,) = _find(root, "qti-response-declaration")
    assert declaration.get("cardinality") == "single"
    assert [v.text for v in _find(declaration, "qti-correct-response")[0]] == ["1"]
    (mapping,) = _find(declaration, "qti-mapping")
    assert mapping.get("default-value") == "0.0"
    entries = _find(mapping, "qti-map-entry")
    assert [e.get("map-key") for e in entries] == ["1", "2.5", "1e3"]
    assert {e.get("mapped-value") for e in entries} == {"1.0"}
    (processing,) = _find(root, "qti-response-processing")
    assert processing.get("template") == MAP_RESPONSE


def test_empty_answer_gets_no_map_entry():
    result = normalize_text_entry_cardinality(_text_item("multiple", ["a", ""]))

    entries = _find(_parse(result), "qti-map-entry")
    assert [e.get("map-key") for e in entries] == ["a"]


@pytest.mark.parametrize("answers", [["", ""], ["", " "]])
@pytest.mark.parametrize("base_type", ["string", "float"])
def test_all_blank_answers_are_left_untouched(answers, base_type):
    raw_data = _text_item("multiple", answers).replace(
        'base-type="string"', 'base-type="{}"'.format(base_type)
    )

    assert normalize_text_entry_cardinality(raw_data) == raw_data


def test_blank_first_answer_keeps_first_non_blank_value():
    result = normalize_text_entry_cardinality(_text_item("multiple", ["", "b"]))

    (declaration,) = _find(_parse(result), "qti-response-declaration")
    assert [v.text for v in _find(declaration, "qti-value")] == ["b"]


def test_output_is_schema_valid_with_mapping_after_correct_response():
    result = normalize_text_entry_cardinality(_text_item("multiple", ["a", "b"]))

    assert validate_qti_item(result).is_valid
    (declaration,) = _find(_parse(result), "qti-response-declaration")
    assert [etree.QName(c).localname for c in declaration] == [
        "qti-correct-response",
        "qti-mapping",
    ]


def test_existing_mapping_is_kept_with_case_sensitivity():
    raw_data = _text_item_with_mapping(
        "multiple", [("Paris", "false"), ("Rome", "true")]
    )

    result = normalize_text_entry_cardinality(raw_data)

    root = _parse(result)
    (declaration,) = _find(root, "qti-response-declaration")
    assert declaration.get("cardinality") == "single"
    (mapping,) = _find(declaration, "qti-mapping")
    assert mapping.get("default-value") == "0"
    entries = _find(mapping, "qti-map-entry")
    assert [(e.get("map-key"), e.get("case-sensitive")) for e in entries] == [
        ("Paris", "false"),
        ("Rome", "true"),
    ]
    assert [v.text for v in _find(declaration, "qti-value")] == ["Paris"]


def test_empty_existing_mapping_is_left_untouched():
    raw_data = _text_item("multiple", ["a", "b"]).replace(
        "</qti-correct-response>",
        '</qti-correct-response><qti-mapping default-value="0"/>',
    )

    assert normalize_text_entry_cardinality(raw_data) is raw_data


def test_suffixless_match_correct_template_is_replaced():
    raw_data = _text_item("multiple", ["a", "b"]).replace(
        MATCH_CORRECT + ".xml", MATCH_CORRECT
    )

    (processing,) = _find(
        _parse(normalize_text_entry_cardinality(raw_data)), "qti-response-processing"
    )

    assert processing.get("template") == MAP_RESPONSE


def test_multiple_selection_choice_item_is_untouched():
    raw_data = _choice_item(
        "multiple", ["choice_0", "choice_1"], [("choice_0", "A"), ("choice_1", "B")]
    )

    assert normalize_text_entry_cardinality(raw_data) == raw_data


def test_single_answer_text_entry_is_untouched():
    raw_data = _text_item("single", ["42"])

    assert normalize_text_entry_cardinality(raw_data) == raw_data


def test_item_already_in_new_shape_is_untouched():
    raw_data = normalize_text_entry_cardinality(_text_item("multiple", ["a", "b"]))

    assert normalize_text_entry_cardinality(raw_data) == raw_data


def test_malformed_xml_is_returned_unchanged():
    raw_data = "<qti-assessment-item><unclosed>"

    assert normalize_text_entry_cardinality(raw_data) == raw_data


def test_value_with_child_element_is_left_untouched():
    raw_data = _text_item("multiple", ["a", "b"]).replace(
        "<qti-value>a</qti-value>", "<qti-value><b>x</b></qti-value>", 1
    )

    assert normalize_text_entry_cardinality(raw_data) == raw_data


def test_custom_response_processing_template_is_left_alone():
    raw_data = _text_item("multiple", ["a", "b"]).replace(
        'template="{}.xml"'.format(MATCH_CORRECT), 'template="urn:custom:template"'
    )

    assert normalize_text_entry_cardinality(raw_data) == raw_data


def test_comments_and_processing_instructions_do_not_abort_normalisation():
    raw_data = _text_item("multiple", ["a", "b"]).replace(
        "<qti-response-declaration ", "<!-- c --><?pi x?><qti-response-declaration ", 1
    )
    raw_data = raw_data.replace(
        "<qti-correct-response>", "<qti-correct-response><!-- c -->", 1
    )

    result = normalize_text_entry_cardinality(raw_data)

    (declaration,) = _find(_parse(result), "qti-response-declaration")
    assert declaration.get("cardinality") == "single"
    assert validate_qti_item(result).is_valid


def test_declaration_without_correct_response_is_untouched():
    raw_data = _item_xml(
        "item_text",
        "Text Item",
        '<qti-response-declaration identifier="RESPONSE" cardinality="multiple" '
        'base-type="string"/>',
        '<p><qti-text-entry-interaction response-identifier="RESPONSE" /></p>',
    )

    assert normalize_text_entry_cardinality(raw_data) == raw_data


def test_item_with_multiple_declarations_is_untouched():
    raw_data = _text_item("multiple", ["a", "b"]).replace(
        "</qti-response-declaration>",
        '</qti-response-declaration><qti-response-declaration identifier="R2" '
        'cardinality="single" base-type="identifier"/>',
        1,
    )

    assert normalize_text_entry_cardinality(raw_data) == raw_data


def test_item_with_doctype_is_untouched():
    raw_data = _text_item("multiple", ["a", "b"]).replace(
        "<qti-assessment-item",
        '<!DOCTYPE qti-assessment-item [<!ENTITY x "y">]><qti-assessment-item',
        1,
    )

    assert normalize_text_entry_cardinality(raw_data) == raw_data


def test_partial_mapping_is_completed_with_missing_answers():
    raw_data = _text_item_with_mapping("multiple", [("a", "true"), ("b", "true")])
    raw_data = raw_data.replace(
        '<qti-map-entry map-key="b" mapped-value="1" case-sensitive="true" />', ""
    )

    (declaration,) = _find(
        _parse(normalize_text_entry_cardinality(raw_data)), "qti-response-declaration"
    )

    entries = _find(declaration, "qti-map-entry")
    assert {e.get("map-key") for e in entries} == {"a", "b"}


def test_multiple_item_already_using_map_response_is_converted():
    raw_data = _text_item("multiple", ["a", "b"]).replace(
        MATCH_CORRECT + ".xml", MAP_RESPONSE
    )

    (declaration,) = _find(
        _parse(normalize_text_entry_cardinality(raw_data)), "qti-response-declaration"
    )

    assert declaration.get("cardinality") == "single"
