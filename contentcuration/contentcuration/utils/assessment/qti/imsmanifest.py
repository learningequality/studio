import re
import zipfile
from typing import Annotated
from typing import List
from typing import NamedTuple
from typing import Optional
from xml.etree import ElementTree as ET

from pydantic import Field

from contentcuration.utils.assessment.qti.base import generate_coerced_string_type
from contentcuration.utils.assessment.qti.base import TextType
from contentcuration.utils.assessment.qti.base import XMLElement
from contentcuration.utils.assessment.qti.constants import ResourceType


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


def _get_item_ids_from_assessment_test(zip_file, test_href):
    """Extract assessment item identifiers from an assessment test file."""
    try:
        with zip_file.open(test_href) as test_file:
            test_content = test_file.read()
            test_root = ET.fromstring(test_content)

            # Look for both item references and inline items
            qti_ns = {"qti": "http://www.imsglobal.org/xsd/imsqti_v3p0"}
            item_refs = test_root.findall(".//qti:qti-assessment-item-ref", qti_ns)
            # TODO: Add handling for assessment sections and assessment section refs.

            all_items = list(item_refs)

            return [
                item.get("identifier") for item in all_items if item.get("identifier")
            ]
    except (KeyError, ET.ParseError):
        return []


namespace_re = re.compile("\\{([^}]+)\\}")


def _read_manifest_resources(zip_file):
    """Raises ValueError for an invalid or missing manifest."""
    try:
        with zip_file.open("imsmanifest.xml") as manifest_file:
            root = ET.fromstring(manifest_file.read())
    except ET.ParseError:
        raise ValueError("Invalid XML in manifest")
    except KeyError:
        raise ValueError("No IMS Manifest found in zip file")
    namespace = namespace_re.search(root.tag)
    if namespace is None:
        raise ValueError("Manifest has no namespace")
    namespaces = {"imscp": namespace.group(1)}
    return root.findall(".//imscp:resource", namespaces), namespaces


def get_assessment_ids_from_manifest(zip_file_handle):
    try:
        with zipfile.ZipFile(zip_file_handle, "r") as zip_file:
            resources, _ = _read_manifest_resources(zip_file)

            assessment_ids = []

            # First, collect direct assessment item resources
            for resource in resources:
                resource_type = resource.get("type", "")
                resource_identifier = resource.get("identifier")
                if (
                    resource_type == ResourceType.ASSESSMENT_ITEM.value
                    and resource_identifier
                ):
                    assessment_ids.append(resource_identifier)

                if resource_type == ResourceType.ASSESSMENT_TEST.value:
                    assessment_ids.extend(
                        _get_item_ids_from_assessment_test(
                            zip_file, resource.get("href")
                        )
                    )

            return assessment_ids
    except zipfile.BadZipFile:
        raise ValueError("File is not a valid zip archive")


class AssessmentItemResource(NamedTuple):
    href: str
    dependency_hrefs: List[str]


def get_assessment_item_resources_from_manifest(zip_file):
    """
    Return the package's assessment item resources in manifest (item) order.
    `dependency_hrefs` are the resource's files other than the item XML itself.
    """
    resources, namespaces = _read_manifest_resources(zip_file)
    return [
        AssessmentItemResource(
            href=resource.get("href"),
            dependency_hrefs=[
                file.get("href")
                for file in resource.findall("imscp:file", namespaces)
                if file.get("href") != resource.get("href")
            ],
        )
        for resource in resources
        if resource.get("type") == ResourceType.ASSESSMENT_ITEM.value
    ]
