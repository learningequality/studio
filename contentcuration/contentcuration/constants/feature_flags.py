import json
import os

import jsonschema


def _schema():
    file = os.path.join(os.path.dirname(os.path.realpath(__file__)), '../static/feature_flags.json')
    with open(file) as f:
        data = json.load(f)
    return data


SCHEMA = _schema()


def validate(data):
    """
    :param data: Dictionary of data to validate
    :raises: ValidationError
    """
    jsonschema.validate(instance=data, schema=SCHEMA)
