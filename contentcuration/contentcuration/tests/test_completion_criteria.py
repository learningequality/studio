from django.core.exceptions import ValidationError
from django.test import SimpleTestCase
from le_utils.constants import completion_criteria
from le_utils.constants import content_kinds
from le_utils.constants import exercises
from le_utils.constants import mastery_criteria
from le_utils.constants import modalities

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

    def _make_preposttest_threshold(self):
        """Helper to create a valid pre_post_test threshold structure."""
        # UUIDs must be 32 hex characters
        uuid_a = "a" * 32
        uuid_b = "b" * 32
        return {
            "mastery_model": exercises.PRE_POST_TEST,
            "pre_post_test": {
                "assessment_item_ids": [uuid_a, uuid_b],
                "version_a_item_ids": [uuid_a],
                "version_b_item_ids": [uuid_b],
            },
        }

    def test_validate__topic_with_unit_modality_and_preposttest__success(self):
        """Topic with UNIT modality and PRE_POST_TEST mastery model should pass validation."""
        validate(
            {
                "model": completion_criteria.MASTERY,
                "threshold": self._make_preposttest_threshold(),
            },
            kind=content_kinds.TOPIC,
            modality=modalities.UNIT,
        )

    def test_validate__topic_with_unit_modality_and_wrong_mastery_model__fail(self):
        """Topic with UNIT modality but non-PRE_POST_TEST mastery model should fail."""
        with self.assertRaisesRegex(
            ValidationError, "mastery_model.*invalid for.*topic"
        ):
            validate(
                {
                    "model": completion_criteria.MASTERY,
                    "threshold": {
                        "mastery_model": mastery_criteria.M_OF_N,
                        "m": 3,
                        "n": 5,
                    },
                },
                kind=content_kinds.TOPIC,
                modality=modalities.UNIT,
            )

    def test_validate__topic_with_non_unit_modality_and_completion_criteria__fail(self):
        """Topic with non-UNIT modality (e.g., LESSON) should not have completion criteria."""
        with self.assertRaisesRegex(
            ValidationError, "only.*completion criteria.*UNIT modality"
        ):
            validate(
                {
                    "model": completion_criteria.MASTERY,
                    "threshold": self._make_preposttest_threshold(),
                },
                kind=content_kinds.TOPIC,
                modality=modalities.LESSON,
            )

    def test_validate__topic_with_no_modality_and_completion_criteria__fail(self):
        """Topic with no modality should not have completion criteria."""
        with self.assertRaisesRegex(
            ValidationError, "only.*completion criteria.*UNIT modality"
        ):
            validate(
                {
                    "model": completion_criteria.MASTERY,
                    "threshold": self._make_preposttest_threshold(),
                },
                kind=content_kinds.TOPIC,
                modality=None,
            )
