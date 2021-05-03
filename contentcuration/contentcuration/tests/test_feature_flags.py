from django.core.exceptions import ValidationError
from django.test import SimpleTestCase

from contentcuration.constants import feature_flags


class FeatureFlagsTestCase(SimpleTestCase):
    def test_validate__success(self):
        feature_flags.validate({"test_feature": False})

    def test_validate__failure(self):
        with self.assertRaises(ValidationError):
            self.assertFalse(feature_flags.validate({"test_feature": 123}))
