from django.test import TestCase

from contentcuration.utils.recommendations import Recommendations


class RecommendationsTestCase(TestCase):
    def test_backend_initialization(self):
        recomendations = Recommendations()
        self.assertIsNotNone(recomendations)
        self.assertIsInstance(recomendations.get_instance(), Recommendations)
