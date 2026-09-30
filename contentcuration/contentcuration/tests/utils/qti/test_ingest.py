import json
import unittest

from lxml import etree

from contentcuration.tests.utils.qti.test_validation import _item_xml
from contentcuration.tests.utils.qti.test_validation import VALID_CHOICE_ITEM
from contentcuration.utils.assessment.qti.ingest import convert_legacy_question_to_qti
from contentcuration.utils.assessment.qti.ingest import (
    find_perseus_custom_interaction_path,
)
from contentcuration.utils.assessment.qti.ingest import (
    strip_content_storage_placeholder,
)
from contentcuration.utils.assessment.qti.media import get_qti_media_references
from contentcuration.utils.assessment.qti.validation import validate_qti_item


NS = {"qti": "http://www.imsglobal.org/xsd/imsqtiasi_v3p0"}


class StripContentStoragePlaceholderTests(unittest.TestCase):
    def test_strips_placeholder_leaving_bare_filename(self):
        text = "Look: ![](${☣ CONTENTSTORAGE}/abc123.png)"
        self.assertEqual(
            strip_content_storage_placeholder(text), "Look: ![](abc123.png)"
        )


class ConvertLegacyQuestionToQTITests(unittest.TestCase):
    def test_convert_legacy_question_to_qti_strips_placeholder_from_question_and_answers(
        self,
    ):
        question_data = {
            "type": "multiple_selection",
            "assessment_id": "abf45e8fd7f151adb1b3df2d751e945e",
            "question": "Which is red? ![](${☣ CONTENTSTORAGE}/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png)",  # noqa
            "answers": '[{"answer": "Apple ![](${☣ CONTENTSTORAGE}/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png)", "correct": true, "order": 0}, {"answer": "Sky", "correct": false, "order": 1}]',  # noqa
            "randomize": False,
        }
        result = convert_legacy_question_to_qti(question_data)
        validation_result = validate_qti_item(result.xml)
        self.assertTrue(validation_result.is_valid, validation_result.errors)
        self.assertEqual(
            get_qti_media_references(result.xml),
            {
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png",
                "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.png",
            },
        )

    def test_convert_legacy_question_to_qti_strips_placeholder_from_hints_and_registers_image(
        self,
    ):
        question_data = {
            "type": "multiple_selection",
            "assessment_id": "abf45e8fd7f151adb1b3df2d751e945e",
            "question": "Which is red?",
            "answers": '[{"answer": "Apple", "correct": true, "order": 0}, {"answer": "Sky", "correct": false, "order": 1}]',  # noqa
            "hints": '[{"hint": "Try this: ![](${☣ CONTENTSTORAGE}/cccccccccccccccccccccccccccccccc.png)", "order": 0}]',  # noqa
            "randomize": False,
        }
        result = convert_legacy_question_to_qti(question_data)
        validation_result = validate_qti_item(result.xml)
        self.assertTrue(validation_result.is_valid, validation_result.errors)
        self.assertIn('support="ext:kolibri-hint"', result.xml)
        self.assertIn(
            "cccccccccccccccccccccccccccccccc.png",
            get_qti_media_references(result.xml),
        )

    def test_convert_legacy_question_to_qti_without_hints_produces_no_catalog_info(
        self,
    ):
        question_data = {
            "type": "multiple_selection",
            "assessment_id": "abf45e8fd7f151adb1b3df2d751e945e",
            "question": "Which is red?",
            "answers": '[{"answer": "Apple", "correct": true, "order": 0}, {"answer": "Sky", "correct": false, "order": 1}]',  # noqa
            "randomize": False,
        }
        result = convert_legacy_question_to_qti(question_data)
        self.assertNotIn("<qti-catalog-info", result.xml)

    def test_convert_legacy_input_question_answers(self):
        def a(answer, correct=True):
            return {"answer": answer, "correct": correct}

        cases = [
            ([a("")], "float", [], []),
            ([a(False)], "float", [], []),
            ([], "float", [], []),
            ([a(None)], "float", [], []),
            ([a("   ")], "float", [], []),
            ([a("2"), a("")], "float", ["2"], []),
            ([a(False), a("16508")], "float", ["16508"], []),
            ([a("4\\.62")], "float", ["4.62"], []),
            ([a("1/2")], "float", ["0.5"], []),
            ([a("1,234")], "float", ["1234"], []),
            ([a("Sphere")], "string", ["Sphere"], []),
            ([{"answer": "5"}], "float", ["5"], []),
            ([a(0)], "float", ["0"], []),
            ([a("1e400")], "string", ["1e400"], []),
            # Kolibri scores a float response with Number(), which reads these.
            ([a("+3")], "float", ["3"], []),
            ([a("1E3")], "float", ["1000"], []),
            ([a(".5")], "float", ["0.5"], []),
            # Number() reads these as NaN.
            ([a("١٢")], "string", ["١٢"], []),
            ([a("1_000")], "string", ["1_000"], []),
            ([a("2"), a("2.0")], "float", ["2"], []),
            ([a("7"), a("8", correct=False)], "float", ["7"], []),
            ([a("13"), a("12")], "float", ["13"], ["13", "12"]),
            ([a("13"), a("cat")], "string", ["13"], ["13", "cat"]),
            # Map keys match Kolibri's String(parseFloat(input)) lookup.
            ([a("0.00005"), a("1")], "float", ["0.00005"], ["0.00005", "1"]),
            ([a("1e-7"), a("2")], "float", ["1e-7"], ["1e-7", "2"]),
            ([a("1e21"), a("2")], "float", ["1e+21"], ["1e+21", "2"]),
            ([a("-0"), a("2")], "float", ["0"], ["0", "2"]),
        ]
        for answers, base_type, correct, map_keys in cases:
            with self.subTest(answers=answers):
                result = convert_legacy_question_to_qti(
                    {
                        "type": "input_question",
                        "question": "Q?",
                        "answers": json.dumps(answers),
                        "assessment_id": "a" * 32,
                    }
                )
                validation_result = validate_qti_item(result.xml)
                self.assertTrue(validation_result.is_valid, validation_result.errors)
                doc = etree.fromstring(result.xml.encode("utf-8"))
                (declaration,) = doc.findall("qti:qti-response-declaration", NS)
                self.assertEqual(declaration.get("base-type"), base_type)
                self.assertEqual(declaration.get("cardinality"), "single")
                self.assertEqual(
                    [
                        value.text
                        for value in declaration.findall(
                            "qti:qti-correct-response/qti:qti-value", NS
                        )
                    ],
                    correct,
                )
                entries = declaration.findall("qti:qti-mapping/qti:qti-map-entry", NS)
                self.assertEqual([entry.get("map-key") for entry in entries], map_keys)
                self.assertTrue(
                    all(entry.get("mapped-value") == "1.0" for entry in entries)
                )
                # match_correct scores a single answer case-sensitively; entries match it.
                self.assertTrue(
                    all(entry.get("case-sensitive") == "true" for entry in entries)
                )
                template = "map_response.xml" if map_keys else "match_correct.xml"
                processing = doc.find("qti:qti-response-processing", NS)
                self.assertTrue(processing.get("template").endswith(template))


def _custom_interaction_item_xml(data_type, path_attr, path_value):
    return _item_xml(
        "item1",
        "t",
        "",
        '<qti-custom-interaction response-identifier="RESPONSE" data-type="%s" %s="%s"/>'
        % (data_type, path_attr, path_value),
    )


class FindPerseusCustomInteractionPathTests(unittest.TestCase):
    def test_find_perseus_custom_interaction_path_detects_wrapper(self):
        raw_data = _custom_interaction_item_xml(
            "perseus", "data-perseus-path", "cccccccccccccccccccccccccccccccc.json"
        )
        self.assertEqual(
            find_perseus_custom_interaction_path(raw_data),
            "cccccccccccccccccccccccccccccccc.json",
        )

    def test_find_perseus_custom_interaction_path_returns_none_when_absent(self):
        self.assertIsNone(find_perseus_custom_interaction_path(VALID_CHOICE_ITEM))

    def test_find_perseus_custom_interaction_path_ignores_other_vendor_types(self):
        raw_data = _custom_interaction_item_xml(
            "other-vendor", "data-other-path", "cccccccccccccccccccccccccccccccc.json"
        )
        self.assertIsNone(find_perseus_custom_interaction_path(raw_data))
