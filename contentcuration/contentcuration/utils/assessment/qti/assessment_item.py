from typing import Annotated
from typing import List
from typing import Optional
from typing import Union

from annotated_types import Len
from pydantic import AnyUrl
from pydantic import Field
from pydantic import model_validator
from pydantic import PositiveInt

from contentcuration.utils.assessment.qti.base import BaseSequence
from contentcuration.utils.assessment.qti.base import QTIBase
from contentcuration.utils.assessment.qti.base import TextType
from contentcuration.utils.assessment.qti.constants import BaseType
from contentcuration.utils.assessment.qti.constants import Cardinality
from contentcuration.utils.assessment.qti.constants import ExternalScored
from contentcuration.utils.assessment.qti.constants import View
from contentcuration.utils.assessment.qti.fields import BCP47Language
from contentcuration.utils.assessment.qti.fields import LocalHrefPath
from contentcuration.utils.assessment.qti.fields import QTIIdentifier
from contentcuration.utils.assessment.qti.html import BlockContentElement
from contentcuration.utils.assessment.qti.interaction_types.base import BlockInteraction


class Value(QTIBase):
    """
    Represents a single value within a default value, correct response,
    or other value container.

    For record values, both the field-identifier and base-type attributes
    are required to identify which field of the record this value belongs to
    and what type that field is.

    For non-record values (single, multiple, ordered cardinality), these
    attributes are optional and typically not needed as the base-type is
    determined by the parent variable declaration.
    """

    value: TextType  # The actual value content
    field_identifier: Optional[QTIIdentifier] = None  # Required only for record values
    base_type: Optional[BaseType] = None  # Required only for record values


ValueType = Annotated[List[Value], Len(min_length=1)]


class CorrectResponse(QTIBase):
    """Defines the correct response for the interaction."""

    value: ValueType = Field(default_factory=list)


class DefaultValue(QTIBase):
    """
    Defines the default value for a variable. Contains one or more
    value elements depending on the cardinality of the variable.
    """

    value: ValueType = Field(default_factory=list)
    # Human readable interpretation of the default value
    interpretation: Optional[str] = None


def _validate_value(self, attribute_name="default_value"):
    attr_value = getattr(self, attribute_name)
    if attr_value is not None:
        if self.cardinality == Cardinality.SINGLE:
            # Single cardinality should have exactly one value
            if len(attr_value.value) > 1:
                raise ValueError(
                    f"Single cardinality cannot have multiple {attribute_name.replace('_', ' ')}s"
                )
        elif self.cardinality == Cardinality.RECORD:
            # Record cardinality requires field identifiers
            for value in attr_value.value:
                if not value.field_identifier:
                    raise ValueError(
                        f"Record cardinality requires field_identifier in {attribute_name.replace('_', ' ')}"
                    )
                if not value.base_type:
                    raise ValueError(
                        f"Record cardinality requires base_type in {attribute_name.replace('_', ' ')}"
                    )


class OutcomeDeclaration(QTIBase):
    """
    QTI outcome declaration defines an outcome variable, which represents the
    result of response processing. Outcomes are typically scores but can also
    be other results such as feedback identifiers or completion status.
    """

    identifier: QTIIdentifier
    cardinality: Cardinality = Cardinality.SINGLE
    base_type: Optional[BaseType] = None
    view: Optional[View] = None
    interpretation: Optional[AnyUrl] = None
    long_interpretation: Optional[str] = None
    normal_maximum: Optional[PositiveInt] = None
    normal_minimum: Optional[float] = None
    mastery_value: Optional[float] = None
    external_scored: Optional[ExternalScored] = None
    variable_identifier_ref: Optional[str] = None
    default_value: Optional[DefaultValue] = None

    @model_validator(mode="after")
    def validate_cardinality_compatibility(self):
        _validate_value(self)
        return self


class ItemBody(QTIBase, BaseSequence):
    """Contains the content of the assessment item"""

    children: List[Union[BlockInteraction, BlockContentElement]] = Field(
        default_factory=list
    )


class ContextDeclaration(QTIBase):
    """
    QTI context declaration defines a 'contextual' variable with global scope to
    an assessment item. Context variables provide contextual information to
    template processing and response processing, such as candidate information,
    test information, and environment information.
    """

    identifier: QTIIdentifier
    cardinality: Cardinality
    base_type: Optional[BaseType] = None
    default_value: Optional[DefaultValue] = None

    @model_validator(mode="after")
    def validate_cardinality_compatibility(self):
        _validate_value(self)
        return self


class MapEntry(QTIBase):
    """Entry in a mapping that maps a specific value to a score"""

    # Key (usually an identifier)
    map_key: str
    # Value to map
    mapped_value: float
    # Whether string comparison is case sensitive
    case_sensitive: bool = False


class Mapping(QTIBase):
    """Maps response values to scores for partial credit scoring"""

    map_entries: List[MapEntry] = Field(default_factory=list)
    # Score for responses not explicitly mapped
    default_value: float = 0.0
    # Lower bound for mapping results
    lower_bound: Optional[float] = None
    # Upper bound for mapping results
    upper_bound: Optional[float] = None


class AreaMapEntry(QTIBase):
    """Entry in an area mapping that maps a specific area to a score"""

    # Shape of the area (rect, circle, poly, default)
    shape: str
    # Coordinates defining the area
    coords: str
    # Score for responses in this area
    mapped_value: float


class AreaMapping(QTIBase):
    """Maps areas to scores for graphical interactions"""

    area_map_entries: List[AreaMapEntry] = Field(default_factory=list)
    # Score for responses not in any defined area
    default_value: float = 0.0
    # Lower bound for mapping results
    lower_bound: Optional[float] = None
    # Upper bound for mapping results
    upper_bound: Optional[float] = None


class ResponseDeclaration(QTIBase):
    """
    QTI response declaration defines a response variable and optionally its
    correct response value and/or mapping. Response variables capture candidate
    interactions with the assessment item's interactions and are used in response
    processing to determine outcomes.
    """

    identifier: QTIIdentifier
    cardinality: Cardinality
    base_type: BaseType
    correct_response: Optional[CorrectResponse] = None
    mapping: Optional[Mapping] = None
    area_mapping: Optional[AreaMapping] = None

    @model_validator(mode="after")
    def validate_cardinality_compatibility(self):
        _validate_value(self, "correct_response")
        return self


class ResponseProcessing(QTIBase):
    """Represents response processing rules or template reference"""

    # URI reference to a response processing template
    template: Optional[AnyUrl] = None
    # Optional URL that resolves to the template - we additionally enforce that this be local
    # although this is not required by the QTI spec
    template_location: Optional[LocalHrefPath] = None
    # rules deliberately not implemented yet


class AssessmentItem(QTIBase):
    """Represents a QTI assessment item"""

    xmlns: str = "http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    xmlns__xsi: str = "http://www.w3.org/2001/XMLSchema-instance"
    xsi__schemaLocation: str = "http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd"
    identifier: QTIIdentifier
    title: str
    label: Optional[str] = None
    adaptive: bool = False
    time_dependent: Optional[bool] = None
    language: BCP47Language
    tool_name: str = "kolibri"
    tool_version: str = "0.1"

    context_declaration: List[ContextDeclaration] = Field(default_factory=list)
    response_declaration: List[ResponseDeclaration] = Field(default_factory=list)
    outcome_declaration: List[OutcomeDeclaration] = Field(default_factory=list)
    item_body: Optional[ItemBody] = None
    response_processing: Optional[ResponseProcessing] = None
