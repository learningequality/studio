from django.core.exceptions import ValidationError
from jsonschema import RefResolver
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
    validator.resolver.store.update(
        RefResolver.from_schema(mastery_criteria.SCHEMA).store
    )
    return validator


validator = _build_validator()


ALLOWED_MODELS_PER_KIND = {
    content_kinds.DOCUMENT: {
        completion_criteria.PAGES,
        completion_criteria.TIME,
        completion_criteria.APPROX_TIME,
        completion_criteria.REFERENCE,
    },
    content_kinds.EXERCISE: {completion_criteria.MASTERY},
    content_kinds.HTML5: {
        completion_criteria.DETERMINED_BY_RESOURCE,
        completion_criteria.TIME,
        completion_criteria.APPROX_TIME,
        completion_criteria.REFERENCE,
    },
    content_kinds.H5P: {
        completion_criteria.DETERMINED_BY_RESOURCE,
        completion_criteria.TIME,
        completion_criteria.APPROX_TIME,
        completion_criteria.REFERENCE,
    },
    content_kinds.AUDIO: {
        completion_criteria.TIME,
        completion_criteria.APPROX_TIME,
        completion_criteria.REFERENCE,
    },
    content_kinds.VIDEO: {
        completion_criteria.TIME,
        completion_criteria.APPROX_TIME,
        completion_criteria.REFERENCE,
    },
    content_kinds.TOPIC: {completion_criteria.MASTERY},
}


def check_model_for_kind(data, kind):
    model = data.get("model")
    if kind is None or model is None or kind not in ALLOWED_MODELS_PER_KIND:
        return

    # validate that content kind is allowed for the completion criteria model
    if model not in ALLOWED_MODELS_PER_KIND[kind]:
        raise ValidationError(
            "Completion criteria model '{}' is invalid for content kind '{}'".format(
                model, kind
            )
        )


def validate(data, kind=None):
    """
    :param data: Dictionary of data to validate
    :param kind: A str of the node content kind
    :raises: ValidationError: When invalid
    """
    # empty dicts are okay
    if isinstance(data, (dict,)) and not data:
        return

    error_descriptions = []
    # @see https://python-jsonschema.readthedocs.io/en/latest/errors/
    for error in validator.iter_errors(data):
        if error.cause:
            # documentation says this will only be set on FormatChecker errors
            error_descriptions.append(error.cause)
        elif error.absolute_path:
            # if there's a path to a field, we can give a specific error
            json_path = ".".join(error.absolute_path)
            error_descriptions.append(
                ValidationError("{} {}".format(json_path, error.message))
            )
        else:
            # without a path, likely top-level validation error, e.g. `anyOf` conditions
            error_descriptions.append(
                ValidationError(
                    "object doesn't satisfy '{}' conditions".format(error.validator)
                )
            )

    if error_descriptions:
        e = ValidationError("Completion criteria doesn't conform to schema")
        e.error_list.extend(error_descriptions)
        raise e

    check_model_for_kind(data, kind)
