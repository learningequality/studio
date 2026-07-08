from django.core.exceptions import ValidationError as DjangoValidationError
from le_utils.constants import exercises

from contentcuration.tests.base import StudioTestCase
from contentcuration.tests.testdata import channel
from contentcuration.tests.utils.qti.test_validation import _item_xml
from contentcuration.views.internal import create_exercises


class CreateExercisesInvalidQTITestCase(StudioTestCase):
    def test_invalid_qti_raw_data_raises_node_validation_error(self):
        node = channel().main_tree
        questions = [
            {
                "assessment_id": "dddddddddddddddddddddddddddddddd",
                "type": exercises.QTI,
                "raw_data": "<not-qti>this is not valid QTI</not-qti>",
                "files": [],
                "source_url": None,
                "randomize": False,
            }
        ]
        with self.assertRaises(DjangoValidationError):
            create_exercises(self.admin_user, node, questions)

    def test_unsupported_legacy_question_type_raises_node_validation_error(self):
        node = channel().main_tree
        questions = [
            {
                "assessment_id": "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
                "type": "not_a_real_question_type",
                "question": "What?",
                "answers": "[]",
                "files": [],
                "source_url": None,
                "randomize": False,
            }
        ]
        with self.assertRaises(DjangoValidationError):
            create_exercises(self.admin_user, node, questions)

    def test_qti_raw_data_referencing_missing_file_raises_node_validation_error(self):
        node = channel().main_tree
        raw_data = _item_xml(
            "item_1",
            "Sample Item",
            '<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">'
            "<qti-correct-response><qti-value>choice_0</qti-value></qti-correct-response>"
            "</qti-response-declaration>",
            '<qti-choice-interaction response-identifier="RESPONSE" max-choices="1" '
            'min-choices="0" orientation="vertical"><qti-prompt>Pick. '
            '<img src="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png" alt="diagram" /></qti-prompt>'
            '<qti-simple-choice identifier="choice_0" show-hide="show" fixed="false">A</qti-simple-choice>'
            '<qti-simple-choice identifier="choice_1" show-hide="show" fixed="false">B</qti-simple-choice>'
            "</qti-choice-interaction>",
        )
        questions = [
            {
                "assessment_id": "ffffffffffffffffffffffffffffffff",
                "type": exercises.QTI,
                "raw_data": raw_data,
                "files": [],
                "source_url": None,
                "randomize": False,
            }
        ]
        with self.assertRaises(DjangoValidationError):
            create_exercises(self.admin_user, node, questions)

    def test_qti_wrapping_perseus_custom_interaction_rejected(self):
        node = channel().main_tree
        raw_data = _item_xml(
            "item_2",
            "Sample Item",
            "",
            '<qti-custom-interaction response-identifier="RESPONSE" data-type="perseus" '
            'data-perseus-path="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.json"/>',
        )
        questions = [
            {
                "assessment_id": "cccccccccccccccccccccccccccccccc",
                "type": exercises.QTI,
                "raw_data": raw_data,
                "files": [],
                "source_url": None,
                "randomize": False,
            }
        ]
        with self.assertRaises(DjangoValidationError):
            create_exercises(self.admin_user, node, questions)
