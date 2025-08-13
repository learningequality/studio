from contentcuration.utils.assessment.qti.base import BaseSequence
from contentcuration.utils.assessment.qti.base import QTIBase
from contentcuration.utils.assessment.qti.fields import QTIIdentifier


class Interaction(QTIBase, BaseSequence):
    """
    Abstract base class for QTI interactions.
    """

    response_identifier: QTIIdentifier


class BlockInteraction(Interaction):
    pass


class InlineInteraction(Interaction):
    pass
