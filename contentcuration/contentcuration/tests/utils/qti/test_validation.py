import os
import tempfile
import unittest

from lxml import etree

from contentcuration.utils.assessment.qti.validation import _compiled_schema
from contentcuration.utils.assessment.qti.validation import validate_qti_item


class CompiledSchemaTests(unittest.TestCase):
    def test_returns_xml_schema_instance(self):
        self.assertIsInstance(_compiled_schema(), etree.XMLSchema)

    def test_is_cached_across_calls(self):
        self.assertIs(_compiled_schema(), _compiled_schema())


def _item_xml(identifier, title, response_declaration, item_body):
    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" '
        'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
        'xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 '
        'https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" '
        'identifier="%s" title="%s" adaptive="false" time-dependent="false" '
        'language="en-US" tool-name="kolibri" tool-version="0.1">'
        "%s"
        '<qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float" />'
        "<qti-item-body>%s</qti-item-body>"
        '<qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />'
        "</qti-assessment-item>"
    ) % (identifier, title, response_declaration, item_body)


VALID_CHOICE_ITEM = _item_xml(
    "item_1",
    "Sample Item",
    '<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">'
    "<qti-correct-response><qti-value>choice_0</qti-value></qti-correct-response>"
    "</qti-response-declaration>",
    '<qti-choice-interaction response-identifier="RESPONSE" max-choices="1" min-choices="0" '
    'orientation="vertical">'
    "<qti-prompt>Select the correct answer.</qti-prompt>"
    '<qti-simple-choice identifier="choice_0" show-hide="show" fixed="false">Option A</qti-simple-choice>'
    '<qti-simple-choice identifier="choice_1" show-hide="show" fixed="false">Option B</qti-simple-choice>'
    "</qti-choice-interaction>",
)


class ValidateQTIItemTests(unittest.TestCase):
    def test_accepts_valid_item(self):
        result = validate_qti_item(VALID_CHOICE_ITEM)
        self.assertTrue(result.is_valid)
        self.assertEqual(result.errors, [])

    def test_accepts_valid_item_as_bytes(self):
        result = validate_qti_item(VALID_CHOICE_ITEM.encode("utf-8"))
        self.assertTrue(result.is_valid)

    def test_rejects_invalid_enum_value(self):
        xml = VALID_CHOICE_ITEM.replace(
            'orientation="vertical"', 'orientation="sideways"'
        )
        result = validate_qti_item(xml)
        self.assertFalse(result.is_valid)
        self.assertTrue(
            any(
                "orientation" in e.message and "sideways" in e.message
                for e in result.errors
            )
        )

    def test_rejects_missing_required_attribute(self):
        xml = VALID_CHOICE_ITEM.replace(' time-dependent="false"', "")
        result = validate_qti_item(xml)
        self.assertFalse(result.is_valid)
        self.assertTrue(any("time-dependent" in e.message for e in result.errors))

    def test_rejects_malformed_xml_without_raising(self):
        result = validate_qti_item("<qti-assessment-item><unclosed>")
        self.assertFalse(result.is_valid)
        self.assertEqual(len(result.errors), 1)

    def test_does_not_resolve_external_entities(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("super-secret-value")
            secret_path = f.name
        self.addCleanup(os.remove, secret_path)
        xml = (
            '<?xml version="1.0"?>'
            '<!DOCTYPE qti-assessment-item [<!ENTITY xxe SYSTEM "file://%s">]>'
            '<qti-assessment-item title="&xxe;"></qti-assessment-item>' % secret_path
        )
        result = validate_qti_item(xml)
        serialized = " ".join(e.message for e in result.errors)
        self.assertNotIn("super-secret-value", serialized)


MATCH_INTERACTION_ITEM = _item_xml(
    "item_match",
    "Match Item",
    '<qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="directedPair">'
    "<qti-correct-response><qti-value>A X</qti-value><qti-value>B Y</qti-value></qti-correct-response>"
    "</qti-response-declaration>",
    '<qti-match-interaction response-identifier="RESPONSE" shuffle="false" max-associations="1">'
    "<qti-prompt>Match the fruit to its color.</qti-prompt>"
    "<qti-simple-match-set>"
    '<qti-simple-associable-choice identifier="A" match-max="1">Apple</qti-simple-associable-choice>'
    '<qti-simple-associable-choice identifier="B" match-max="1">Banana</qti-simple-associable-choice>'
    "</qti-simple-match-set>"
    "<qti-simple-match-set>"
    '<qti-simple-associable-choice identifier="X" match-max="1">Red</qti-simple-associable-choice>'
    '<qti-simple-associable-choice identifier="Y" match-max="1">Yellow</qti-simple-associable-choice>'
    "</qti-simple-match-set>"
    "</qti-match-interaction>",
)

ORDER_INTERACTION_ITEM = _item_xml(
    "item_order",
    "Order Item",
    '<qti-response-declaration identifier="RESPONSE" cardinality="ordered" base-type="identifier">'
    "<qti-correct-response>"
    "<qti-value>step1</qti-value><qti-value>step2</qti-value><qti-value>step3</qti-value>"
    "</qti-correct-response>"
    "</qti-response-declaration>",
    '<qti-order-interaction response-identifier="RESPONSE" shuffle="false" orientation="vertical">'
    "<qti-prompt>Order the steps.</qti-prompt>"
    '<qti-simple-choice identifier="step1" show-hide="show" fixed="false">First</qti-simple-choice>'
    '<qti-simple-choice identifier="step2" show-hide="show" fixed="false">Second</qti-simple-choice>'
    '<qti-simple-choice identifier="step3" show-hide="show" fixed="false">Third</qti-simple-choice>'
    "</qti-order-interaction>",
)


class UncoveredInteractionTypeTests(unittest.TestCase):
    """Interaction types the pydantic models / QTIExerciseGenerator never produce."""

    def test_accepts_match_interaction_item(self):
        result = validate_qti_item(MATCH_INTERACTION_ITEM)
        self.assertTrue(result.is_valid)
        self.assertEqual(result.errors, [])

    def test_accepts_order_interaction_item(self):
        result = validate_qti_item(ORDER_INTERACTION_ITEM)
        self.assertTrue(result.is_valid)
        self.assertEqual(result.errors, [])

    def test_rejects_item_with_unknown_root_element(self):
        result = validate_qti_item('<not-qti identifier="x" />')
        self.assertFalse(result.is_valid)
        self.assertTrue(result.errors)


class SchemaReuseTests(unittest.TestCase):
    def test_schema_compiled_once_across_multiple_validate_calls(self):
        _compiled_schema.cache_clear()
        self.addCleanup(_compiled_schema.cache_clear)
        validate_qti_item(VALID_CHOICE_ITEM)
        validate_qti_item(MATCH_INTERACTION_ITEM)
        validate_qti_item(ORDER_INTERACTION_ITEM)
        self.assertEqual(_compiled_schema.cache_info().misses, 1)
        self.assertEqual(_compiled_schema.cache_info().hits, 2)
