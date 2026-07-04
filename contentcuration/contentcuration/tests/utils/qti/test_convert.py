# flake8: noqa: E501
import os
import unittest

from le_utils.constants import exercises

from contentcuration.utils.assessment.qti.convert import (
    convert_legacy_assessment_item_to_qti,
)
from contentcuration.utils.assessment.qti.convert import LegacyAssessmentItem
from contentcuration.utils.assessment.qti.validation import validate_qti_item


FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


def _load_fixture(filename):
    with open(os.path.join(FIXTURES_DIR, filename)) as f:
        return f.read()


def _normalize_xml(xml_string):
    return "".join(x.strip() for x in xml_string.split("\n"))


class ChoiceInteractionConversionTests(unittest.TestCase):
    def test_single_selection(self):
        item = LegacyAssessmentItem(
            type=exercises.SINGLE_SELECTION,
            question="What is 2+2?",
            answers=[
                {"answer": "4", "correct": True, "order": 1},
                {"answer": "3", "correct": False, "order": 2},
                {"answer": "5", "correct": False, "order": 3},
            ],
            randomize=True,
            assessment_id="1234567890abcdef1234567890abcdef",
            title="Test Question 1",
            language="en-US",
        )

        result = convert_legacy_assessment_item_to_qti(item)

        self.assertEqual(result.identifier, "KEjRWeJCrze8SNFZ4kKvN7w")
        self.assertEqual(
            _normalize_xml(_load_fixture("single_selection.xml")),
            _normalize_xml(result.xml),
        )
        self.assertTrue(validate_qti_item(result.xml.encode("utf-8")).is_valid)

    def test_multiple_selection(self):
        item = LegacyAssessmentItem(
            type=exercises.MULTIPLE_SELECTION,
            question="Select all prime numbers:",
            answers=[
                {"answer": "2", "correct": True, "order": 1},
                {"answer": "3", "correct": True, "order": 2},
                {"answer": "4", "correct": False, "order": 3},
                {"answer": "5", "correct": True, "order": 4},
            ],
            randomize=True,
            assessment_id="abcdef1234567890abcdef1234567890",
            title="Test Question 1",
            language="en-US",
        )

        result = convert_legacy_assessment_item_to_qti(item)

        self.assertEqual(result.identifier, "Kq83vEjRWeJCrze8SNFZ4kA")
        self.assertEqual(
            _normalize_xml(_load_fixture("multiple_selection.xml")),
            _normalize_xml(result.xml),
        )
        self.assertTrue(validate_qti_item(result.xml.encode("utf-8")).is_valid)

    def test_true_false(self):
        item = LegacyAssessmentItem(
            type="true_false",
            question="Is the sky blue?",
            answers=[
                {"answer": "True", "correct": True, "order": 1},
                {"answer": "False", "correct": False, "order": 2},
            ],
            randomize=False,
            assessment_id="1234567890abcdef1234567890abcdef",
            title="Test Question 1",
            language="en-US",
        )

        result = convert_legacy_assessment_item_to_qti(item)

        self.assertEqual(result.identifier, "KEjRWeJCrze8SNFZ4kKvN7w")
        self.assertEqual(
            _normalize_xml(_load_fixture("true_false.xml")),
            _normalize_xml(result.xml),
        )
        self.assertTrue(validate_qti_item(result.xml.encode("utf-8")).is_valid)

    def test_media_reference_survives(self):
        item = LegacyAssessmentItem(
            type=exercises.SINGLE_SELECTION,
            question="See the diagram: ![diagram](images/abc123.png)",
            answers=[
                {
                    "answer": "Correct ![opt](images/def456.png)",
                    "correct": True,
                    "order": 1,
                },
                {"answer": "Wrong", "correct": False, "order": 2},
            ],
            randomize=False,
            assessment_id="1234567890abcdef1234567890abcdef",
            title="Media Test",
            language="en-US",
        )

        result = convert_legacy_assessment_item_to_qti(item)

        self.assertIn('<img alt="diagram" src="images/abc123.png" />', result.xml)
        self.assertIn('<img alt="opt" src="images/def456.png" />', result.xml)
        self.assertEqual(
            {"images/abc123.png", "images/def456.png"}, set(result.file_dependencies)
        )

    def test_math_content_in_choice_interaction(self):
        item = LegacyAssessmentItem(
            type=exercises.SINGLE_SELECTION,
            question="Solve the equation $$\\frac{x}{2} = 3$$ for x. What is the value of x?",
            answers=[
                {"answer": "6", "correct": True, "order": 1},
                {"answer": "3", "correct": False, "order": 2},
                {"answer": "1.5", "correct": False, "order": 3},
                {"answer": "9", "correct": False, "order": 4},
            ],
            randomize=True,
            assessment_id="dddddddddddddddddddddddddddddddd",
            title="Test Question 1",
            language="en-US",
        )

        result = convert_legacy_assessment_item_to_qti(item)

        self.assertEqual(result.identifier, "K3d3d3d3d3d3d3d3d3d3d3Q")
        self.assertEqual(
            _normalize_xml(_load_fixture("math_content_choice_interaction.xml")),
            _normalize_xml(result.xml),
        )


class TextEntryInteractionConversionTests(unittest.TestCase):
    def test_input_question(self):
        item = LegacyAssessmentItem(
            type=exercises.INPUT_QUESTION,
            question="What positive integers are less than 3?",
            answers=[
                {"answer": 1, "correct": True, "order": 1},
                {"answer": 2, "correct": True, "order": 2},
            ],
            randomize=True,
            assessment_id="fedcba0987654321fedcba0987654321",
            title="Test Question 1",
            language="en-US",
        )

        result = convert_legacy_assessment_item_to_qti(item)

        self.assertEqual(result.identifier, "K_ty6CYdlQyH-3LoJh2VDIQ")
        self.assertEqual(
            _normalize_xml(_load_fixture("input_question.xml")),
            _normalize_xml(result.xml),
        )
        self.assertTrue(validate_qti_item(result.xml.encode("utf-8")).is_valid)

    def test_free_response_question(self):
        item = LegacyAssessmentItem(
            type=exercises.FREE_RESPONSE,
            question="What positive integers are less than 3?",
            answers=[
                {"answer": 1, "correct": True, "order": 1},
                {"answer": 2, "correct": True, "order": 2},
            ],
            randomize=True,
            assessment_id="fedcba0987654321fedcba0987654321",
            title="Test Question 1",
            language="en-US",
        )

        result = convert_legacy_assessment_item_to_qti(item)

        self.assertIn("<qti-text-entry-interaction", result.xml)
        self.assertTrue(validate_qti_item(result.xml.encode("utf-8")).is_valid)

    def test_free_response_no_answers(self):
        item = LegacyAssessmentItem(
            type=exercises.FREE_RESPONSE,
            question="What is the capital of France?",
            answers=[],
            randomize=True,
            assessment_id="fedcba0987654321fedcba0987654321",
            title="Test Question 1",
            language="en-US",
        )

        result = convert_legacy_assessment_item_to_qti(item)

        self.assertEqual(result.identifier, "K_ty6CYdlQyH-3LoJh2VDIQ")
        self.assertEqual(
            _normalize_xml(_load_fixture("free_response_no_answers.xml")),
            _normalize_xml(result.xml),
        )
        self.assertTrue(validate_qti_item(result.xml.encode("utf-8")).is_valid)

    def test_free_response_with_maths(self):
        item = LegacyAssessmentItem(
            type=exercises.FREE_RESPONSE,
            question="$$\\sum_n^sxa^n$$\n\n What does this even mean?",
            answers=[{"answer": "Nothing", "correct": True, "order": 1}],
            randomize=True,
            assessment_id="fedcba0987654321fedcba0987654321",
            title="Test Question 1",
            language="en-US",
        )

        result = convert_legacy_assessment_item_to_qti(item)

        self.assertEqual(result.identifier, "K_ty6CYdlQyH-3LoJh2VDIQ")
        self.assertEqual(
            _normalize_xml(_load_fixture("free_response_with_maths.xml")),
            _normalize_xml(result.xml),
        )


class UnsupportedTypeConversionTests(unittest.TestCase):
    def test_unsupported_type_raises(self):
        item = LegacyAssessmentItem(
            type="NOT_A_REAL_TYPE",
            question="x",
            answers=[],
            randomize=False,
            assessment_id="1234567890abcdef1234567890abcdef",
            title="t",
            language="en-US",
        )

        with self.assertRaises(ValueError) as ctx:
            convert_legacy_assessment_item_to_qti(item)

        self.assertIn("Unsupported question type", str(ctx.exception))
