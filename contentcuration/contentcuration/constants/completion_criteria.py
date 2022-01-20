import jsonschema
from django.core.exceptions import ValidationError
from le_utils.constants.completion_criteria import SCHEMA


def validate(data):
    """
    :param data: Dictionary of data to validate
    :raises: ValidationError: When invalid
    """
    try:
        jsonschema.validate(instance=data, schema=SCHEMA)
    except jsonschema.ValidationError as e:
        raise ValidationError("Invalid completion criteria") from e
