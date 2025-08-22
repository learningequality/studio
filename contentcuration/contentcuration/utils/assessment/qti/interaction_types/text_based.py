from typing import Optional

from pydantic import NonNegativeInt

from contentcuration.utils.assessment.qti.constants import Format
from contentcuration.utils.assessment.qti.fields import QTIIdentifier
from contentcuration.utils.assessment.qti.interaction_types.base import BlockInteraction
from contentcuration.utils.assessment.qti.interaction_types.base import (
    InlineInteraction,
)
from contentcuration.utils.assessment.qti.prompt import Prompt


class TextEntryInteraction(InlineInteraction):
    """For short text entry"""

    # The QTI spec specifies a default of 10 here
    # but this is only needed if we're intending to collect a numerical result
    # so we let it be nullable and let the rendering engine handle this.
    base: Optional[int] = None
    string_identifier: Optional[QTIIdentifier] = None
    expected_length: Optional[NonNegativeInt] = None
    pattern_mask: Optional[str] = None
    placeholder_text: Optional[str] = None
    format_: Optional[Format] = None


class ExtendedTextInteraction(BlockInteraction):
    """For longer text entry/free response"""

    # The QTI spec specifies a default of 10 here
    # but this is only needed if we're intending to collect a numerical result
    # so we let it be nullable and let the rendering engine handle this.
    base: Optional[int] = None
    string_identifier: Optional[QTIIdentifier] = None
    pattern_mask: Optional[str] = None
    placeholder_text: Optional[str] = None
    max_strings: Optional[NonNegativeInt] = None
    min_strings: Optional[NonNegativeInt] = 0
    expected_lines: Optional[NonNegativeInt] = None
    format_: Optional[Format] = Format.PLAIN
    prompt: Optional[Prompt] = None
