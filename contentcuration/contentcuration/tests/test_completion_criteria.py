from django.core.exceptions import ValidationError
from django.test import SimpleTestCase
from le_utils.constants import completion_criteria
from le_utils.constants import content_kinds

from contentcuration.constants.completion_criteria import validate


class CompletionCriteriaTestCase(SimpleTestCase):
    def test_validate__success(self):
        validate({"model": completion_criteria.REFERENCE, "learner_managed": True})

    def test_validate__success__empty(self):
        validate({})

    def test_validate__fail(self):
        with self.assertRaises(ValidationError):
            validate({"model": "does not exist"})

    def test_validate__content_kind(self):
        with self.assertRaises(ValidationError):
            validate({"model": completion_criteria.PAGES}, kind=content_kinds.EXERCISE)
        with self.assertRaises(ValidationError):
            validate({"model": completion_criteria.MASTERY}, kind=content_kinds.DOCUMENT)
