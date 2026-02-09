from django.core.exceptions import ValidationError
from django.test import SimpleTestCase

from contentcuration.constants import feature_flags


class FeatureFlagsTestCase(SimpleTestCase):
    def test_validate__success(self):
        feature_flags.validate({"test_dev_feature": False})

    def test_validate__not_bool(self):
        with self.assertRaises(ValidationError):
            feature_flags.validate({"test_dev_feature": 123})

    def test_validate__nonexistent(self):
        with self.assertRaises(ValidationError):
            feature_flags.validate({"does_not_exist": True})

    def test_validate__ai_feature_rejected(self):
        with self.assertRaises(ValidationError):
            feature_flags.validate({"ai_feature": True})
