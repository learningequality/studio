from contentcuration.utils.assessment.qti.interaction_types.base import BlockInteraction


class CustomInteraction(BlockInteraction):
    """
    A delivery-engine-specific interaction (``qti-custom-interaction``).

    Used to embed a raw Perseus question in a QTI package: the host's Perseus
    renderer, keyed off ``data-type="perseus"``, owns rendering and grading and
    reports correctness back through the QTI response.
    """

    data_type: str
    data_perseus_path: str
