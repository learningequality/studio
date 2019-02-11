import copy

from base import BaseTestCase
from contentcuration import forms


class LanguageSortTest(BaseTestCase):
    def test_sorted_countries_en(self):
        countries = forms.get_sorted_countries("en")
        localized_names = [country[1] for country in countries]

        # Since we're using English, Python's default sort should give the same language order as the one
        # returned from get_sorted_countries. If we want to test sorts in different languages, we'll probably
        # need a different approach.
        sorted = copy.copy(localized_names)
        sorted.sort()
        assert localized_names == sorted
