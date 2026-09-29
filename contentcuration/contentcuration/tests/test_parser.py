import pytest

from contentcuration.utils.parser import extract_value
from contentcuration.utils.parser import load_json_string


@pytest.fixture
def number_tests():
    return [
        ("abc", None),
        ("100", 100),
        ("-100", -100),
        ("1,000,000", 1000000),
        ("-1,000,000", -1000000),
        ("1,00,00", None),
        ("1.2", 1.2),
        ("-1.2", -1.2),
        ("1.-2", None),
        ("1.2,00", None),
        ("1,000.5", 1000.5),
        ("-1,000.5", -1000.5),
        ("1 1/2", 1.5),
        ("1,000 1/2", 1000.5),
        ("-1 1/2", -1.5),
        ("1/2/123", None),
        ("12/0", None),
        ("50%", 0.5),
        ("-4.5%", -0.045),
        ("100%", 1),
        ("1/2%", 0.005),
        ("1 1/2%", 0.015),
        ("1.1.23", None),
        ("2.3e10", 2.3e10),
        ("-2.3e10", -2.3e10),
        ("2.3e-10", 2.3e-10),
        ("1,000e+-3", None),
        ("eeee", None),
        ("1:3", None),
        ("5 apples", None),
        ("x = 4.62", None),
        (" 4.62 ", 4.62),
        ("0.0", 0),
        ("0%", 0),
        ("0/5", 0),
        ("2e0", 2),
        (r"4\.62", 4.62),
        (r"249\.6", 249.6),
        (r"8\.5", 8.5),
        (r"0\.0025", 0.0025),
        (r"-4\.5%", -0.045),
        (r"2\.3e10", 2.3e10),
    ]


@pytest.fixture
def json_tests():
    return [
        ("{'a': 'b'}", {"a": "b"}),  # Test single quotes -> double quotes
        ('{"a": False}', {"a": False}),  # Test False -> false
        ('{"a": True}', {"a": True}),  # Test True -> true
    ]


def test_numbers(number_tests):
    for val1, val2 in number_tests:
        assert extract_value(val1) == val2, "Numbers don't match: {} != {}".format(
            val1, val2
        )


def test_non_string_answer_returns_none():
    assert extract_value(10) is None
    assert extract_value(1.5) is None


def test_jsons(json_tests):
    for val1, val2 in json_tests:
        assert load_json_string(val1) == val2, "JSONs don't match: {} != {}".format(
            val1, val2
        )
