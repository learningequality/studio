# flake8: noqa: E501
import unittest

from le_utils.constants import exercises

from contentcuration.utils.assessment.qti.convert import (
    convert_legacy_assessment_item_to_qti,
)
from contentcuration.utils.assessment.qti.convert import LegacyAssessmentItem
from contentcuration.utils.assessment.qti.validation import validate_qti_item


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

        expected_xml = """<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="KEjRWeJCrze8SNFZ4kKvN7w" title="Test Question 1" adaptive="false" time-dependent="false" language="en-US" tool-name="kolibri" tool-version="0.1">
    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>choice_0</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float" />
    <qti-item-body>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" max-choices="1" min-choices="0" orientation="vertical">
            <qti-prompt>
                <p>What is 2+2?</p>
            </qti-prompt>
            <qti-simple-choice identifier="choice_0" show-hide="show" fixed="false"><p>4</p></qti-simple-choice>
            <qti-simple-choice identifier="choice_1" show-hide="show" fixed="false"><p>3</p></qti-simple-choice>
            <qti-simple-choice identifier="choice_2" show-hide="show" fixed="false"><p>5</p></qti-simple-choice>
        </qti-choice-interaction>
    </qti-item-body>
    <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />
</qti-assessment-item>"""

        self.assertEqual(_normalize_xml(expected_xml), _normalize_xml(result.xml))
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

        expected_xml = """<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="Kq83vEjRWeJCrze8SNFZ4kA" title="Test Question 1" adaptive="false" time-dependent="false" language="en-US" tool-name="kolibri" tool-version="0.1">
    <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="identifier">
        <qti-correct-response>
            <qti-value>choice_0</qti-value>
            <qti-value>choice_1</qti-value>
            <qti-value>choice_3</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float" />
    <qti-item-body>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" max-choices="4" min-choices="0" orientation="vertical">
            <qti-prompt>
                <p>Select all prime numbers:</p>
            </qti-prompt>
            <qti-simple-choice identifier="choice_0" show-hide="show" fixed="false"><p>2</p></qti-simple-choice>
            <qti-simple-choice identifier="choice_1" show-hide="show" fixed="false"><p>3</p></qti-simple-choice>
            <qti-simple-choice identifier="choice_2" show-hide="show" fixed="false"><p>4</p></qti-simple-choice>
            <qti-simple-choice identifier="choice_3" show-hide="show" fixed="false"><p>5</p></qti-simple-choice>
        </qti-choice-interaction>
    </qti-item-body>
    <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />
</qti-assessment-item>"""

        self.assertEqual(_normalize_xml(expected_xml), _normalize_xml(result.xml))
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

        expected_xml = """<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="KEjRWeJCrze8SNFZ4kKvN7w" title="Test Question 1" adaptive="false" time-dependent="false" language="en-US" tool-name="kolibri" tool-version="0.1">
    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>choice_0</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float" />
    <qti-item-body>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="false" max-choices="1" min-choices="0" orientation="vertical">
            <qti-prompt>
                <p>Is the sky blue?</p>
            </qti-prompt>
            <qti-simple-choice identifier="choice_0" show-hide="show" fixed="false"><p>True</p></qti-simple-choice>
            <qti-simple-choice identifier="choice_1" show-hide="show" fixed="false"><p>False</p></qti-simple-choice>
        </qti-choice-interaction>
    </qti-item-body>
    <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />
</qti-assessment-item>"""

        self.assertEqual(_normalize_xml(expected_xml), _normalize_xml(result.xml))
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

        expected_xml = """<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="K_ty6CYdlQyH-3LoJh2VDIQ" title="Test Question 1" adaptive="false" time-dependent="false" language="en-US" tool-name="kolibri" tool-version="0.1">
    <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="float">
        <qti-correct-response>
            <qti-value>1</qti-value>
            <qti-value>2</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float" />
    <qti-item-body>
        <div>
            <p>What positive integers are less than 3?</p>
            <p><qti-text-entry-interaction response-identifier="RESPONSE" expected-length="50" placeholder-text="Enter your answer here" /></p>
        </div>
    </qti-item-body>
    <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />
</qti-assessment-item>"""

        self.assertEqual(_normalize_xml(expected_xml), _normalize_xml(result.xml))
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
