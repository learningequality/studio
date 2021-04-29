from django.test import SimpleTestCase

from contentcuration.constants import feature_flags


class FeatureFlagsTestCase(SimpleTestCase):
    def test_validate(self):
        self.assertTrue(feature_flags.validate({"test_feature": False}))
        self.assertFalse(feature_flags.validate({"test_feature": 123}))
