from typing import Annotated
from typing import List
from typing import Optional
from typing import Union

from annotated_types import Len
from pydantic import Field

from contentcuration.utils.assessment.qti.base import QTIBase
from contentcuration.utils.assessment.qti.html import FlowContent
from contentcuration.utils.assessment.qti.mathml import Math


KOLIBRI_HINT_SUPPORT = "ext:kolibri-hint"


class HtmlContent(QTIBase):
    """Dormant HTML content carried inside a qti-card, per the qti-catalog-info spec."""

    children: List[Union[Math, FlowContent]] = Field(default_factory=list)


class Card(QTIBase):
    """A single support-tagged content card within a qti-catalog."""

    support: str = KOLIBRI_HINT_SUPPORT
    html_content: Optional[HtmlContent] = None


class Catalog(QTIBase):
    """A named collection of cards for a specific support/feature."""

    id_: str
    card: Annotated[List[Card], Len(min_length=1)]


class CatalogInfo(QTIBase):
    """Dormant, non-delivered catalog content attached to a qti-assessment-item."""

    catalog: Annotated[List[Catalog], Len(min_length=1)]
