from typing import List
from typing import Union

from pydantic import Field

from contentcuration.utils.assessment.qti.base import QTIBase
from contentcuration.utils.assessment.qti.html import FlowContent
from contentcuration.utils.assessment.qti.mathml import Math


class Prompt(QTIBase):

    children: List[Union[Math, FlowContent]] = Field(default_factory=list)
