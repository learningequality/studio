from django.core.exceptions import ValidationError
from jsonschema import RefResolver
from jsonschema.exceptions import best_match
from jsonschema.validators import validator_for
from le_utils.constants import completion_criteria
from le_utils.constants import content_kinds
from le_utils.constants import mastery_criteria


def _build_validator():
    """
    Builds the validator, once, for the completion criteria schema and includes the external mastery criteria schema
    :rtype: jsonschema.Draft7Validator|jsonschema.validators.Validator
    """
    cls = validator_for(completion_criteria.SCHEMA)
    validator = cls(completion_criteria.SCHEMA)
    validator.resolver.store.update(RefResolver.from_schema(mastery_criteria.SCHEMA).store)
    return validator


validator = _build_validator()


def validate(data, kind=None):
    """
    :param data: Dictionary of data to validate
    :param kind: A str of the node content kind
    :raises: ValidationError: When invalid
    """
    # empty dicts are okay
    if isinstance(data, (dict,)) and not data:
        return

    error = best_match(validator.iter_errors(data))
    if error is not None:
        raise ValidationError("Completion criteria does not conform to schema") from error

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
