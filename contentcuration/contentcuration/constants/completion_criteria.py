from django.core.exceptions import ValidationError
from jsonschema import RefResolver
from jsonschema.validators import validator_for
from le_utils.constants import completion_criteria
from le_utils.constants import content_kinds
from le_utils.constants import exercises
from le_utils.constants import mastery_criteria
from le_utils.constants import modalities


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


def check_model_for_kind(data, kind, modality=None):
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

    if kind == content_kinds.TOPIC:
        check_topic_completion_criteria(data, modality)


def check_topic_completion_criteria(data, modality):
    """
    Validates topic-specific completion criteria rules:
    - Topics can only have completion criteria if modality is UNIT
    - Topics can only use PRE_POST_TEST mastery model
    """
    # Topics can only have completion criteria with UNIT modality
    if modality != modalities.UNIT:
        raise ValidationError(
            "Topics can only have completion criteria with UNIT modality"
        )

    # Topics can only use PRE_POST_TEST mastery model
    threshold = data.get("threshold", {})
    mastery_model = threshold.get("mastery_model")
    if mastery_model is not None and mastery_model != exercises.PRE_POST_TEST:
        raise ValidationError(
            "mastery_model '{}' is invalid for topic content kind; "
            "only '{}' is allowed".format(mastery_model, exercises.PRE_POST_TEST)
        )


def validate(data, kind=None, modality=None):
    """
    :param data: Dictionary of data to validate
    :param kind: A str of the node content kind
    :param modality: A str of the node modality (required for topics with completion criteria)
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

    check_model_for_kind(data, kind, modality)
