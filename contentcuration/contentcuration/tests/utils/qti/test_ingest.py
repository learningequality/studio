import unittest

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
