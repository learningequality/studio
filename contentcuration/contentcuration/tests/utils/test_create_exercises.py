from django.core.exceptions import ValidationError as DjangoValidationError
from le_utils.constants import exercises

from contentcuration.tests.base import StudioTestCase
from contentcuration.tests.testdata import channel
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
