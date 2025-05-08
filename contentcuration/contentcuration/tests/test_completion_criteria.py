from django.core.exceptions import ValidationError
from django.test import SimpleTestCase
from le_utils.constants import completion_criteria
from le_utils.constants import content_kinds
from le_utils.constants import mastery_criteria

from contentcuration.constants.completion_criteria import validate


class CompletionCriteriaTestCase(SimpleTestCase):
    def test_validate__success(self):
        validate({"model": completion_criteria.REFERENCE, "learner_managed": True})

    def test_validate__success__empty(self):
        validate({})

    def test_validate__fail__model(self):
        with self.assertRaisesRegex(
            ValidationError, "model 'does not exist' is not one of"
        ):
            validate({"model": "does not exist"})

    def test_validate__fail__threshold(self):
        with self.assertRaisesRegex(
            ValidationError, "object doesn't satisfy 'anyOf' conditions"
        ):
            validate({"model": completion_criteria.PAGES, "threshold": "not a number"})

    def test_validate__content_kind(self):
        with self.assertRaisesRegex(ValidationError, "is invalid for content kind"):
            validate(
                {"model": completion_criteria.PAGES, "threshold": 1},
                kind=content_kinds.EXERCISE,
            )
        with self.assertRaisesRegex(ValidationError, "is invalid for content kind"):
            validate(
                {
                    "model": completion_criteria.MASTERY,
                    "threshold": {"mastery_model": mastery_criteria.DO_ALL},
                },
                kind=content_kinds.DOCUMENT,
            )
