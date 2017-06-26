import pytest
from django.conf import settings

from contentcuration.utils.parser import extract_value

@pytest.fixture
def number_tests():
    return [
        ("abc", None),
        ("100", 100),
        ("-100", -100),
        ("1,000,000", 1000000),
        ("-1,000,000", -1000000),
        ("1,00,00", 1),
        ("1.2", 1.2),
        ("-1.2", -1.2),
        ("1.-2", 1),
        ("1.2,00", 1.2),
        ("1,000.5", 1000.5),
        ("-1,000.5", -1000.5),
        ("1 1/2", 1.5),
        ("1,000 1/2", 1000.5),
        ("-1 1/2", -1.5),
        ("1/2/123", 0.5),
        ("12/0", 12),
        ("50%", 0.5),
        ("-4.5%", -0.045),
        ("100%", 1),
        ("1/2%", 0.005),
        ("1 1/2%", 0.015),
        ("1.1.23", 1.1),
        ("2.3e10", 2.3e10),
        ("-2.3e10", -2.3e10),
        ("2.3e-10", 2.3e-10),
        ("1,000e+-3", 1),
        ("eeee", None),
    ]


def test_numbers(number_tests):
    for val1, val2 in number_tests:
        assert extract_value(val1) == val2, "Numbers don't match: {} != {}".format(val1, val2)
