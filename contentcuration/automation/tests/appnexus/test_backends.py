from automation.utils.appnexus.backends import Recommendations
from django.test import TestCase


class RecommendationsTestCase(TestCase):
    def test_backend_initialization(self):
        recomendations = Recommendations()
        self.assertIsNotNone(recomendations)
        self.assertIsInstance(recomendations.get_instance(), Recommendations)
