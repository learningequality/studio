import os
import unittest

from le_utils.constants import exercises

from contentcuration.utils.assessment.qti.convert import (
    build_perseus_custom_interaction_item,
)
from contentcuration.utils.assessment.qti.convert import (
    convert_legacy_assessment_item_to_qti,
)
from contentcuration.utils.assessment.qti.convert import hex_to_qti_id
from contentcuration.utils.assessment.qti.convert import LegacyAssessmentItem
from contentcuration.utils.assessment.qti.interaction_types.custom import (
    CustomInteraction,
)
from contentcuration.utils.assessment.qti.validation import validate_qti_item


FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")


def _load_fixture(filename):
    with open(os.path.join(FIXTURES_DIR, filename)) as f:
        return f.read()


def _normalize_xml(xml_string):
    return "".join(x.strip() for x in xml_string.split("\n"))


def _make_item(
    type,
    question,
    answers,
    assessment_id,
    randomize=False,
    title="Test Question 1",
    language="en-US",
    hints=None,
):
    return LegacyAssessmentItem(
        type=type,
        question=question,
        answers=answers,
        randomize=randomize,
        assessment_id=assessment_id,
        title=title,
        language=language,
        hints=hints or [],
    )


class ChoiceInteractionConversionTests(unittest.TestCase):
    def test_single_selection(self):
        item = _make_item(
            type=exercises.SINGLE_SELECTION,
            question="What is 2+2?",
            answers=[
                {"answer": "4", "correct": True, "order": 1},
                {"answer": "3", "correct": False, "order": 2},
                {"answer": "5", "correct": False, "order": 3},
            ],
            randomize=True,
            assessment_id="1234567890abcdef1234567890abcdef",
        )

        result = convert_legacy_assessment_item_to_qti(item)

        self.assertEqual(result.identifier, "KEjRWeJCrze8SNFZ4kKvN7w")
        self.assertEqual(
            _normalize_xml(_load_fixture("single_selection.xml")),
            _normalize_xml(result.xml),
        )
        self.assertTrue(validate_qti_item(result.xml.encode("utf-8")).is_valid)

    def test_multiple_selection(self):
        item = _make_item(
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
        )

        result = convert_legacy_assessment_item_to_qti(item)

        self.assertEqual(result.identifier, "Kq83vEjRWeJCrze8SNFZ4kA")
        self.assertEqual(
            _normalize_xml(_load_fixture("multiple_selection.xml")),
            _normalize_xml(result.xml),
        )
        self.assertTrue(validate_qti_item(result.xml.encode("utf-8")).is_valid)

    def test_true_false(self):
        item = _make_item(
            type="true_false",
            question="Is the sky blue?",
            answers=[
                {"answer": "True", "correct": True, "order": 1},
                {"answer": "False", "correct": False, "order": 2},
            ],
            assessment_id="1234567890abcdef1234567890abcdef",
        )

        result = convert_legacy_assessment_item_to_qti(item)

        self.assertEqual(result.identifier, "KEjRWeJCrze8SNFZ4kKvN7w")
        self.assertEqual(
            _normalize_xml(_load_fixture("true_false.xml")),
            _normalize_xml(result.xml),
        )
        self.assertTrue(validate_qti_item(result.xml.encode("utf-8")).is_valid)

    def test_single_selection_no_answers(self):
        item = _make_item(
            type=exercises.SINGLE_SELECTION,
            question="What is 2+2?",
            answers=[],
            randomize=True,
            assessment_id="abcdef1234567890abcdef1234567890",
        )

        result = convert_legacy_assessment_item_to_qti(item)

        self.assertEqual(result.identifier, "Kq83vEjRWeJCrze8SNFZ4kA")
        self.assertEqual(
            _normalize_xml(_load_fixture("single_selection_no_answers.xml")),
            _normalize_xml(result.xml),
        )
        self.assertTrue(validate_qti_item(result.xml.encode("utf-8")).is_valid)

    def test_choice_types_with_no_answers_omit_the_interaction(self):
        # The guard is on the choice types as a group, not just SINGLE_SELECTION,
        # which test_single_selection_no_answers already pins against the fixture.
        for question_type in (exercises.MULTIPLE_SELECTION, "true_false"):
            with self.subTest(question_type=question_type):
                item = _make_item(
                    type=question_type,
                    question="What is 2+2?",
                    answers=[],
                    assessment_id="abcdef1234567890abcdef1234567890",
                )

                result = convert_legacy_assessment_item_to_qti(item)

                self.assertNotIn("qti-choice-interaction", result.xml)
                self.assertNotIn("qti-response-declaration", result.xml)
                self.assertNotIn("qti-response-processing", result.xml)
                self.assertIn("<p>What is 2+2?</p>", result.xml)
                self.assertTrue(validate_qti_item(result.xml.encode("utf-8")).is_valid)

    def test_choice_type_with_no_answers_and_no_question(self):
        # The model's own defaults, and qti-item-body cannot be empty - so a
        # question with nothing typed into it yet carries an empty paragraph.
        item = _make_item(
            type=exercises.MULTIPLE_SELECTION,
            question="",
            answers=[],
            assessment_id="abcdef1234567890abcdef1234567890",
        )

        result = convert_legacy_assessment_item_to_qti(item)

        self.assertIn("<qti-item-body><div><p /></div></qti-item-body>", result.xml)
        self.assertTrue(validate_qti_item(result.xml.encode("utf-8")).is_valid)

    def test_choice_type_with_no_answers_and_block_maths(self):
        # Block maths renders as a top level <math>, which qti-item-body does not
        # accept directly - hence the wrapping div. XSD validity is not asserted
        # here: rendered MathML does not carry its namespace, the same gap
        # test_free_response_with_maths lives with.
        item = _make_item(
            type=exercises.SINGLE_SELECTION,
            question="$$\\sum_n^sxa^n$$",
            answers=[],
            assessment_id="abcdef1234567890abcdef1234567890",
        )

        result = convert_legacy_assessment_item_to_qti(item)

        self.assertIn('<qti-item-body><div><math display="block">', result.xml)

    def test_media_reference_survives(self):
        item = _make_item(
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
            assessment_id="1234567890abcdef1234567890abcdef",
            title="Media Test",
        )

        result = convert_legacy_assessment_item_to_qti(item)

        self.assertIn('<img alt="diagram" src="images/abc123.png" />', result.xml)
        self.assertIn('<img alt="opt" src="images/def456.png" />', result.xml)
        self.assertEqual(
            {"images/abc123.png", "images/def456.png"}, set(result.file_dependencies)
        )

    def test_math_content_in_choice_interaction(self):
        item = _make_item(
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
        )

        result = convert_legacy_assessment_item_to_qti(item)

        self.assertEqual(result.identifier, "K3d3d3d3d3d3d3d3d3d3d3Q")
        self.assertEqual(
            _normalize_xml(_load_fixture("math_content_choice_interaction.xml")),
            _normalize_xml(result.xml),
        )


class TextEntryInteractionConversionTests(unittest.TestCase):
    def test_input_question(self):
        item = _make_item(
            type=exercises.INPUT_QUESTION,
            question="What positive integers are less than 3?",
            answers=[
                {"answer": 1, "correct": True, "order": 1},
                {"answer": 2, "correct": True, "order": 2},
            ],
            randomize=True,
            assessment_id="fedcba0987654321fedcba0987654321",
        )

        result = convert_legacy_assessment_item_to_qti(item)

        self.assertEqual(result.identifier, "K_ty6CYdlQyH-3LoJh2VDIQ")
        self.assertEqual(
            _normalize_xml(_load_fixture("input_question.xml")),
            _normalize_xml(result.xml),
        )
        self.assertTrue(validate_qti_item(result.xml.encode("utf-8")).is_valid)

    def test_free_response_question(self):
        item = _make_item(
            type=exercises.FREE_RESPONSE,
            question="What positive integers are less than 3?",
            answers=[
                {"answer": 1, "correct": True, "order": 1},
                {"answer": 2, "correct": True, "order": 2},
            ],
            randomize=True,
            assessment_id="fedcba0987654321fedcba0987654321",
        )

        result = convert_legacy_assessment_item_to_qti(item)

        self.assertIn("<qti-text-entry-interaction", result.xml)
        self.assertTrue(validate_qti_item(result.xml.encode("utf-8")).is_valid)

    def test_free_response_no_answers(self):
        item = _make_item(
            type=exercises.FREE_RESPONSE,
            question="What is the capital of France?",
            answers=[],
            randomize=True,
            assessment_id="fedcba0987654321fedcba0987654321",
        )

        result = convert_legacy_assessment_item_to_qti(item)

        self.assertEqual(result.identifier, "K_ty6CYdlQyH-3LoJh2VDIQ")
        self.assertEqual(
            _normalize_xml(_load_fixture("free_response_no_answers.xml")),
            _normalize_xml(result.xml),
        )
        self.assertTrue(validate_qti_item(result.xml.encode("utf-8")).is_valid)

    def test_free_response_with_maths(self):
        item = _make_item(
            type=exercises.FREE_RESPONSE,
            question="$$\\sum_n^sxa^n$$\n\n What does this even mean?",
            answers=[{"answer": "Nothing", "correct": True, "order": 1}],
            randomize=True,
            assessment_id="fedcba0987654321fedcba0987654321",
        )

        result = convert_legacy_assessment_item_to_qti(item)

        self.assertEqual(result.identifier, "K_ty6CYdlQyH-3LoJh2VDIQ")
        self.assertEqual(
            _normalize_xml(_load_fixture("free_response_with_maths.xml")),
            _normalize_xml(result.xml),
        )


class CustomInteractionTests(unittest.TestCase):
    ASSESSMENT_ID = "2b1c3d4e5f60718293a4b5c6d7e8f900"

    def _build_item(self):
        return build_perseus_custom_interaction_item(
            self.ASSESSMENT_ID,
            f"perseus/{self.ASSESSMENT_ID}.json",
            "Q 1",
            "en",
        )

    def test_custom_interaction_element_and_attributes(self):
        interaction = CustomInteraction(
            response_identifier="RESPONSE",
            data_type="perseus",
            data_perseus_path="perseus/abc.json",
        )

        xml = interaction.to_xml_string()

        self.assertEqual(
            _normalize_xml(
                '<qti-custom-interaction response-identifier="RESPONSE" '
                'data-type="perseus" data-perseus-path="perseus/abc.json" />'
            ),
            _normalize_xml(xml),
        )

    def test_builder_identifier_and_validity(self):
        result = self._build_item()

        self.assertEqual(result.identifier, hex_to_qti_id(self.ASSESSMENT_ID))
        self.assertEqual(result.file_dependencies, [])
        self.assertTrue(validate_qti_item(result.xml.encode("utf-8")).is_valid)
        self.assertIn('data-type="perseus"', result.xml)
        self.assertIn(
            f'data-perseus-path="perseus/{self.ASSESSMENT_ID}.json"', result.xml
        )

    def test_builder_grades_from_record_correct_field(self):
        """
        The Perseus renderer reports its result through a record RESPONSE, and
        the item grades itself off that record's ``correct`` field.
        """
        result = self._build_item()

        normalized = _normalize_xml(result.xml)
        # RESPONSE is a record so it can carry correct/simpleAnswer/answerState.
        self.assertIn(
            '<qti-response-declaration identifier="RESPONSE" cardinality="record"',
            normalized,
        )
        # SCORE outcome plus response processing that reads the correct field.
        self.assertIn('<qti-outcome-declaration identifier="SCORE"', normalized)
        self.assertIn('<qti-field-value field-identifier="correct">', normalized)
        self.assertIn('<qti-variable identifier="RESPONSE"', normalized)
        self.assertIn('<qti-set-outcome-value identifier="SCORE">', normalized)


class UnsupportedTypeConversionTests(unittest.TestCase):
    def test_unsupported_type_raises(self):
        item = _make_item(
            type="NOT_A_REAL_TYPE",
            question="x",
            answers=[],
            assessment_id="1234567890abcdef1234567890abcdef",
            title="t",
        )

        with self.assertRaises(ValueError) as ctx:
            convert_legacy_assessment_item_to_qti(item)

        self.assertIn("Unsupported question type", str(ctx.exception))


class CatalogInfoConversionTests(unittest.TestCase):
    def _item_with_hints(self, hints, assessment_id="1234567890abcdef1234567890abcdef"):
        return _make_item(
            type=exercises.SINGLE_SELECTION,
            question="What is 2+2?",
            answers=[
                {"answer": "4", "correct": True, "order": 1},
                {"answer": "3", "correct": False, "order": 2},
            ],
            assessment_id=assessment_id,
            hints=hints,
        )

    def test_no_hints_produces_no_catalog_info(self):
        item = self._item_with_hints([])
        result = convert_legacy_assessment_item_to_qti(item)
        self.assertNotIn("<qti-catalog-info", result.xml)
        self.assertTrue(validate_qti_item(result.xml.encode("utf-8")).is_valid)

    def test_multi_hint_ordering_is_independent_of_input_list_order(self):
        item = self._item_with_hints(
            [
                {"hint": "Second hint", "order": 2},
                {"hint": "First hint", "order": 1},
            ]
        )
        result = convert_legacy_assessment_item_to_qti(item)
        self.assertEqual(result.xml.count('support="ext:kolibri-hint"'), 2)
        self.assertLess(result.xml.index("First hint"), result.xml.index("Second hint"))
        self.assertLess(
            result.xml.index("</qti-item-body>"), result.xml.index("<qti-catalog-info>")
        )
        self.assertLess(
            result.xml.index("</qti-catalog-info>"),
            result.xml.index("<qti-response-processing"),
        )
        self.assertTrue(validate_qti_item(result.xml.encode("utf-8")).is_valid)

    def test_hint_with_image_registers_file_dependency(self):
        item = self._item_with_hints(
            [{"hint": "See ![diagram](images/hint123.png)", "order": 1}]
        )
        result = convert_legacy_assessment_item_to_qti(item)
        self.assertIn('<img alt="diagram" src="images/hint123.png" />', result.xml)
        self.assertIn("images/hint123.png", result.file_dependencies)
        self.assertTrue(validate_qti_item(result.xml.encode("utf-8")).is_valid)

    def test_hint_missing_order_key_does_not_raise(self):
        # A malformed hint must degrade gracefully rather than raise: an uncaught
        # exception here would abort the entire channel's publish, not just this item.
        item = self._item_with_hints([{"hint": "Undated hint"}])
        result = convert_legacy_assessment_item_to_qti(item)
        self.assertIn("Undated hint", result.xml)
        self.assertTrue(validate_qti_item(result.xml.encode("utf-8")).is_valid)

    def test_hint_with_incomparable_order_values_does_not_raise(self):
        # A mixed-type "order" (e.g. a string alongside an int, or None) makes
        # sorted() raise TypeError - this must fall back to input order rather
        # than crash the channel publish.
        item = self._item_with_hints(
            [{"hint": "First hint", "order": 1}, {"hint": "Second hint", "order": "2"}]
        )
        result = convert_legacy_assessment_item_to_qti(item)
        self.assertEqual(result.xml.count('support="ext:kolibri-hint"'), 2)
        self.assertIn("First hint", result.xml)
        self.assertIn("Second hint", result.xml)
        self.assertTrue(validate_qti_item(result.xml.encode("utf-8")).is_valid)

    def test_hint_missing_text_key_is_logged_and_skipped(self):
        # Graceful-degradation contract for a hint dict with no "hint" value:
        # log + skip it, never crash the channel publish. With this the only
        # hint, no card survives, so no qti-catalog-info is emitted at all.
        item = self._item_with_hints([{"order": 1}])
        result = convert_legacy_assessment_item_to_qti(item)
        self.assertNotIn("<qti-catalog-info", result.xml)
        self.assertTrue(validate_qti_item(result.xml.encode("utf-8")).is_valid)

    def test_partial_malformed_hints_keep_valid_siblings(self):
        # A malformed hint is skipped while its valid siblings still render.
        item = self._item_with_hints([{"hint": "Real hint", "order": 1}, {"order": 2}])
        result = convert_legacy_assessment_item_to_qti(item)
        self.assertEqual(result.xml.count('support="ext:kolibri-hint"'), 1)
        self.assertIn("Real hint", result.xml)
        self.assertTrue(validate_qti_item(result.xml.encode("utf-8")).is_valid)
