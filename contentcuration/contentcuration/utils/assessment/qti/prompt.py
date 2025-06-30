from pydantic import Field

from contentcuration.utils.assessment.qti.base import QTIBase
from contentcuration.utils.assessment.qti.html import FlowContentList


class Prompt(QTIBase):

    children: FlowContentList = Field(default_factory=list)
