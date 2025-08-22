import json
import os

import jsonschema
from django.core.exceptions import ValidationError


def _schema():
    """
    Loads JSON schema file
    """
    file = os.path.join(
        os.path.dirname(os.path.realpath(__file__)), "../static/feature_flags.json"
    )
    with open(file) as f:
        data = json.load(f)
    return data


SCHEMA = _schema()


def validate(data):
    """
    :param data: Dictionary of data to validate
    :raises: ValidationError: When invalid
    """
    try:
        jsonschema.validate(instance=data, schema=SCHEMA)
    except jsonschema.ValidationError as e:
        raise ValidationError("Invalid feature flags data") from e
