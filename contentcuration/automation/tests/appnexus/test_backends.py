from automation.utils.appnexus.backends import Recommendations
from django.test import TestCase


class RecommendationsTestCase(TestCase):
    def test_recommendations_backend_initialization(self):
        recomendations = Recommendations()
        assert isinstance(recomendations.get_instance(), Recommendations)
