import jsonschema
from django.core.exceptions import ValidationError
from le_utils.constants import completion_criteria
from le_utils.constants import content_kinds


def validate(data, kind=None):
    """
    :param data: Dictionary of data to validate
    :param kind: A str of the node content kind
    :raises: ValidationError: When invalid
    """
    # empty dicts are okay
    if isinstance(data, (dict,)) and not data:
        return

    try:
        jsonschema.validate(instance=data, schema=completion_criteria.SCHEMA)
    except jsonschema.ValidationError as e:
        raise ValidationError("Completion criteria does not conform to schema") from e

    model = data.get("model")
    if kind is None or model is None:
        return

    # validate that content kind is allowed for the completion criteria model
    if (model == completion_criteria.PAGES and kind != content_kinds.DOCUMENT) or (
        model == completion_criteria.MASTERY and kind != content_kinds.EXERCISE
    ):
        raise ValidationError(
            "Completion criteria model '{}' is invalid for content kind '{}'".format(
                model, kind
            )
        )
