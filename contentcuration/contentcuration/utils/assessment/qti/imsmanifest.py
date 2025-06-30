from typing import Annotated
from typing import List
from typing import Optional

from pydantic import Field

from contentcuration.utils.assessment.qti.base import generate_coerced_string_type
from contentcuration.utils.assessment.qti.base import TextType
from contentcuration.utils.assessment.qti.base import XMLElement


IMSCPIdentifier = Annotated[
    str,
    Field(
        pattern=r"^[a-zA-Z_][a-zA-Z0-9_.-]*$",
        min_length=1,
        description="Resource identifier following XML NCName rules",
    ),
]


class Schema(XMLElement):
    text: TextType


SchemaType = generate_coerced_string_type(Schema)


class SchemaVersion(XMLElement):
    text: TextType


SchemaVersionType = generate_coerced_string_type(SchemaVersion)


class Metadata(XMLElement):
    """Represents the metadata element"""

    schema: Optional[SchemaType] = None
    schemaversion: Optional[SchemaVersionType] = None


class Item(XMLElement):
    """Represents the item element"""

    identifier: Optional[IMSCPIdentifier] = None
    identifierref: Optional[IMSCPIdentifier] = None


class Organization(XMLElement):
    """Represents the organization element"""

    identifier: Optional[IMSCPIdentifier] = None
    structure: Optional[str] = None
    title: Optional[str] = None
    item: List[Item] = Field(default_factory=list)


class Organizations(XMLElement):
    """Represents the organizations element"""

    organizations: List[Organization] = Field(default_factory=list)


class File(XMLElement):
    """Represents the file element"""

    href: Optional[str] = None


class Dependency(XMLElement):
    identifierref: IMSCPIdentifier


class Resource(XMLElement):
    """Represents the resource element"""

    identifier: IMSCPIdentifier
    type_: str
    href: Optional[str] = None
    files: List[File] = Field(default_factory=list)
    dependencies: List[Dependency] = Field(default_factory=list)


class Resources(XMLElement):
    """Represents the resources element"""

    resources: List[Resource] = Field(default_factory=list)


class Manifest(XMLElement):
    """Represents the imsmanifest.xml file"""

    xmlns: str = "http://www.imsglobal.org/xsd/qti/qtiv3p0/imscp_v1p2"
    xmlns__xsi: str = "http://www.w3.org/2001/XMLSchema-instance"
    xsi__schemaLocation: str = "http://www.imsglobal.org/xsd/qti/qtiv3p0/imscp_v1p2 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqtiv3p0_imscpv1p2_v1p0.xsd"  # noqa: E501
    identifier: IMSCPIdentifier
    version: Optional[str] = None
    metadata: Metadata = Field(default_factory=Metadata)
    organizations: Organizations = Field(default_factory=Organizations)
    resources: Resources = Field(default_factory=Resources)
    manifests: List["Manifest"] = Field(default_factory=list)
