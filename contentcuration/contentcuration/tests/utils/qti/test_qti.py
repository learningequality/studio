import unittest

from pydantic import ValidationError

from contentcuration.utils.assessment.qti.assessment_item import AssessmentItem
from contentcuration.utils.assessment.qti.assessment_item import ContextDeclaration
from contentcuration.utils.assessment.qti.assessment_item import CorrectResponse
from contentcuration.utils.assessment.qti.assessment_item import DefaultValue
from contentcuration.utils.assessment.qti.assessment_item import ItemBody
from contentcuration.utils.assessment.qti.assessment_item import OutcomeDeclaration
from contentcuration.utils.assessment.qti.assessment_item import ResponseDeclaration
from contentcuration.utils.assessment.qti.assessment_item import ResponseProcessing
from contentcuration.utils.assessment.qti.assessment_item import Value
from contentcuration.utils.assessment.qti.constants import BaseType
from contentcuration.utils.assessment.qti.constants import Cardinality
from contentcuration.utils.assessment.qti.html import P
from contentcuration.utils.assessment.qti.interaction_types.simple import (
    ChoiceInteraction,
)
from contentcuration.utils.assessment.qti.interaction_types.simple import SimpleChoice
from contentcuration.utils.assessment.qti.interaction_types.text_based import (
    ExtendedTextInteraction,
)
from contentcuration.utils.assessment.qti.interaction_types.text_based import (
    TextEntryInteraction,
)
from contentcuration.utils.assessment.qti.prompt import Prompt


class QTICardinalityValidationTests(unittest.TestCase):
    def test_outcome_declaration_single_cardinality_valid(self):
        """Test that single cardinality with single default value is valid"""
        default_value = DefaultValue(value=[Value(value="10")])
        outcome = OutcomeDeclaration(
            identifier="SCORE",
            cardinality=Cardinality.SINGLE,
            base_type=BaseType.INTEGER,
            default_value=default_value,
        )
        self.assertEqual(outcome.cardinality, Cardinality.SINGLE)
        self.assertIsNotNone(outcome.default_value)

    def test_outcome_declaration_record_cardinality_requires_field_identifier(self):
        """Test that record cardinality requires field_identifier in default value"""
        default_value = DefaultValue(
            value=[Value(value="10")]
        )  # Missing field_identifier
        with self.assertRaises(ValidationError):
            OutcomeDeclaration(
                identifier="RECORD_SCORE",
                cardinality=Cardinality.RECORD,
                base_type=BaseType.INTEGER,
                default_value=default_value,
            )

    def test_outcome_declaration_record_cardinality_valid_with_field_identifier(self):
        """Test that record cardinality works with field_identifier"""
        default_value = DefaultValue(
            value=[
                Value(value="10", field_identifier="part1", base_type=BaseType.INTEGER)
            ]
        )
        outcome = OutcomeDeclaration(
            identifier="RECORD_SCORE",
            cardinality=Cardinality.RECORD,
            base_type=BaseType.INTEGER,
            default_value=default_value,
        )
        self.assertEqual(outcome.cardinality, Cardinality.RECORD)

    def test_context_declaration_single_cardinality_valid(self):
        """Test that single cardinality with single default value is valid"""
        default_value = DefaultValue(value=[Value(value="test_context")])
        context = ContextDeclaration(
            identifier="CONTEXT_VAR",
            cardinality=Cardinality.SINGLE,
            base_type=BaseType.STRING,
            default_value=default_value,
        )
        self.assertEqual(context.cardinality, Cardinality.SINGLE)

    def test_context_declaration_record_cardinality_requires_field_identifier(self):
        """Test that record cardinality requires field_identifier in default value"""
        default_value = DefaultValue(
            value=[Value(value="test")]
        )  # Missing field_identifier
        with self.assertRaises(ValidationError):
            ContextDeclaration(
                identifier="RECORD_CONTEXT",
                cardinality=Cardinality.RECORD,
                base_type=BaseType.STRING,
                default_value=default_value,
            )

    def test_response_declaration_single_cardinality_valid(self):
        """Test that single cardinality with single correct response is valid"""
        correct_response = CorrectResponse(value=[Value(value="A")])
        response = ResponseDeclaration(
            identifier="RESPONSE_1",
            cardinality=Cardinality.SINGLE,
            base_type=BaseType.IDENTIFIER,
            correct_response=correct_response,
        )
        self.assertEqual(response.cardinality, Cardinality.SINGLE)
        self.assertEqual(len(response.correct_response.value), 1)

    def test_response_declaration_single_cardinality_multiple_values_invalid(self):
        """Test that single cardinality cannot have multiple correct response values"""
        correct_response = CorrectResponse(value=[Value(value="A"), Value(value="B")])
        with self.assertRaises(ValidationError):
            ResponseDeclaration(
                identifier="RESPONSE_1",
                cardinality=Cardinality.SINGLE,
                base_type=BaseType.IDENTIFIER,
                correct_response=correct_response,
            )

    def test_response_declaration_multiple_cardinality_multiple_values_valid(self):
        """Test that multiple cardinality can have multiple correct response values"""
        correct_response = CorrectResponse(value=[Value(value="A"), Value(value="B")])
        response = ResponseDeclaration(
            identifier="RESPONSE_1",
            cardinality=Cardinality.MULTIPLE,
            base_type=BaseType.IDENTIFIER,
            correct_response=correct_response,
        )
        self.assertEqual(response.cardinality, Cardinality.MULTIPLE)
        self.assertEqual(len(response.correct_response.value), 2)

    def test_response_declaration_record_cardinality_requires_field_identifiers(self):
        """Test that record cardinality requires field_identifier in all correct response values"""
        correct_response = CorrectResponse(
            value=[
                Value(value="10", field_identifier="part1", base_type=BaseType.INTEGER),
                Value(value="20"),
            ]
        )
        with self.assertRaises(ValidationError):
            ResponseDeclaration(
                identifier="RECORD_RESPONSE",
                cardinality=Cardinality.RECORD,
                base_type=BaseType.INTEGER,
                correct_response=correct_response,
            )

    def test_response_declaration_record_cardinality_valid_with_field_identifiers(self):
        """Test that record cardinality works with field_identifiers"""
        correct_response = CorrectResponse(
            value=[
                Value(value="10", field_identifier="part1", base_type=BaseType.INTEGER),
                Value(value="20", field_identifier="part2", base_type=BaseType.INTEGER),
            ]
        )
        response = ResponseDeclaration(
            identifier="RECORD_RESPONSE",
            cardinality=Cardinality.RECORD,
            base_type=BaseType.INTEGER,
            correct_response=correct_response,
        )
        self.assertEqual(response.cardinality, Cardinality.RECORD)
        self.assertEqual(len(response.correct_response.value), 2)
        self.assertEqual(response.correct_response.value[0].field_identifier, "part1")
        self.assertEqual(response.correct_response.value[1].field_identifier, "part2")


class QTIDataClassTests(unittest.TestCase):
    def test_value_element(self):
        value_element = Value(value="10")
        self.assertEqual(value_element.to_xml_string(), "<qti-value>10</qti-value>")

        value_element_with_attributes = Value(
            value="5",
            field_identifier="part1",
            base_type=BaseType.INTEGER,
        )
        self.assertEqual(
            value_element_with_attributes.to_xml_string(),
            '<qti-value field-identifier="part1" base-type="integer">5</qti-value>',
        )

    def test_correct_response_element(self):
        correct_response_element = CorrectResponse(
            value=[Value(value="A"), Value(value="B")]
        )
        self.assertEqual(
            correct_response_element.to_xml_string(),
            "<qti-correct-response><qti-value>A</qti-value><qti-value>B</qti-value></qti-correct-response>",
        )

    def test_response_declaration_element(self):
        response_declaration_element = ResponseDeclaration(
            identifier="RESPONSE_1",
            cardinality=Cardinality.SINGLE,
            base_type=BaseType.IDENTIFIER,
            correct_response=CorrectResponse(value=[Value(value="choiceA")]),
        )
        expected_xml = '<qti-response-declaration identifier="RESPONSE_1" cardinality="single" base-type="identifier"><qti-correct-response><qti-value>choiceA</qti-value></qti-correct-response></qti-response-declaration>'  # noqa: E501
        self.assertEqual(response_declaration_element.to_xml_string(), expected_xml)

    def test_outcome_declaration_element(self):
        outcome_declaration_element = OutcomeDeclaration(
            identifier="SCORE",
            cardinality=Cardinality.SINGLE,
            base_type=BaseType.FLOAT,
        )
        expected_xml = '<qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float" />'
        self.assertEqual(outcome_declaration_element.to_xml_string(), expected_xml)

    def test_response_processing_element(self):
        response_processing_element = ResponseProcessing(
            template="https://example.com/response_processing.xml"
        )
        self.assertEqual(
            response_processing_element.to_xml_string(),
            '<qti-response-processing template="https://example.com/response_processing.xml" />',
        )

    def test_assessment_item_element(self):
        item_body = ItemBody(children=[P(children=["Test Item Body Content"])])
        assessment_item_element = AssessmentItem(
            identifier="item_1",
            title="Test Assessment Item",
            language="en-US",
            item_body=item_body,
        )
        expected_xml = '<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="item_1" title="Test Assessment Item" adaptive="false" language="en-US" tool-name="kolibri" tool-version="0.1"><qti-item-body><p>Test Item Body Content</p></qti-item-body></qti-assessment-item>'  # noqa: E501
        self.assertEqual(assessment_item_element.to_xml_string(), expected_xml)

    def test_prompt_element(self):
        prompt_element = Prompt(children=["This is the prompt text."])
        self.assertEqual(
            prompt_element.to_xml_string(),
            "<qti-prompt>This is the prompt text.</qti-prompt>",
        )

    def test_simple_choice_element(self):
        simple_choice_element = SimpleChoice(
            identifier="choice1", children=["Choice 1"]
        )
        self.assertEqual(
            simple_choice_element.to_xml_string(),
            '<qti-simple-choice identifier="choice1" show-hide="show" fixed="false">Choice 1</qti-simple-choice>',
        )

    def test_choice_interaction_element(self):
        choice1 = SimpleChoice(identifier="choice1", children=["Choice 1"])
        choice2 = SimpleChoice(identifier="choice2", children=["Choice 2"])
        choice_interaction_element = ChoiceInteraction(
            answers=[choice1, choice2],
            response_identifier="RESPONSE",
            prompt=Prompt(children=["Select the correct answer."]),
        )
        expected_xml = '<qti-choice-interaction response-identifier="RESPONSE" max-choices="1" min-choices="0" orientation="vertical"><qti-prompt>Select the correct answer.</qti-prompt><qti-simple-choice identifier="choice1" show-hide="show" fixed="false">Choice 1</qti-simple-choice><qti-simple-choice identifier="choice2" show-hide="show" fixed="false">Choice 2</qti-simple-choice></qti-choice-interaction>'  # noqa: E501
        self.assertEqual(choice_interaction_element.to_xml_string(), expected_xml)

    def test_text_entry_interaction_element(self):
        text_entry_interaction = TextEntryInteraction(
            response_identifier="textEntry1",
            expected_length=10,
            placeholder_text="Enter your answer",
        )
        expected_xml = '<qti-text-entry-interaction response-identifier="textEntry1" expected-length="10" placeholder-text="Enter your answer" />'
        self.assertEqual(text_entry_interaction.to_xml_string(), expected_xml)

    def test_extended_text_interaction_element(self):
        extended_text_interaction = ExtendedTextInteraction(
            response_identifier="extendedText1",
            placeholder_text="Enter your essay here.",
            prompt=Prompt(children=["What is truth?"]),
        )
        expected_xml = '<qti-extended-text-interaction response-identifier="extendedText1" placeholder-text="Enter your essay here." min-strings="0" format="plain"><qti-prompt>What is truth?</qti-prompt></qti-extended-text-interaction>'  # noqa: E501
        self.assertEqual(extended_text_interaction.to_xml_string(), expected_xml)
