import json
import os

import jsonschema


def _schema():
    file = os.path.join(os.path.dirname(os.path.realpath(__file__)), '../static/feature_flags.json')
    with open(file) as f:
        data = json.load(f)
    return data


SCHEMA = _schema()


def _choices():
    return [
        (prop, prop_schema.get("title", ""))
        for prop, prop_schema in SCHEMA.get("properties", {}).items()
        if not prop.startswith("test_")
    ]


CHOICES = _choices()


def validate(data):
    """
    :param data: Dictionary of data to validate
    :return: Boolean
    """
    jsonschema.validate(instance=data, schema=SCHEMA)
