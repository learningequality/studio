import re
import xml.etree.ElementTree as ET
from abc import ABC
from enum import Enum
from functools import partial
from typing import Annotated
from typing import List
from typing import Optional
from typing import Set
from typing import Union

from pydantic import BaseModel
from pydantic import BeforeValidator
from pydantic import ConfigDict
from pydantic import PrivateAttr

from .constants import Dir
from .fields import entry_pattern as srcset_entry_pattern
from contentcuration.utils.assessment.qti.fields import BCP47Language


class TextNode(BaseModel):
    """Class to represent text nodes within XML elements"""

    text: str


class XMLElement(BaseModel, ABC):
    """Base class for XML elements"""

    # Pydantic configuration
    model_config = ConfigDict(
        # Prevent extra fields
        extra="forbid",
        validate_assignment=True,
        # Prevent mutations to ensure immutability
        frozen=True,
    )

    # Private attributes (not included in Pydantic fields)
    _file_dependencies: Set[str] = PrivateAttr(default_factory=set)
    _element: ET.Element = PrivateAttr(default=None)

    @classmethod
    def element_name(cls):
        return cls.__name__.lower()

    def to_element(self) -> ET.Element:  # noqa: C901
        if self._element:
            return self._element

        element = ET.Element(self.element_name())

        self._file_dependencies = set()

        # Add attributes based on pydantic fields
        for field_name in self.__class__.model_fields:

            value = getattr(self, field_name)

            # Skip None values
            if value is None:
                continue

            if isinstance(value, (XMLElement, TextNode)):
                value = [value]

            if isinstance(value, list):
                if all(isinstance(item, (XMLElement, TextNode)) for item in value):
                    for item in value:
                        if isinstance(item, XMLElement):
                            child_elements = item.to_element()
                            if not isinstance(child_elements, list):
                                child_elements = [child_elements]
                            for child_element in child_elements:
                                element.append(child_element)
                                self._file_dependencies |= item._file_dependencies
                        else:
                            current_children = list(element)
                            if current_children:
                                current_children[-1].tail = (
                                    current_children[-1].tail or ""
                                ) + item.text
                            else:
                                element.text = (element.text or "") + item.text

                    continue
                raise ValueError(
                    "List types should only contain XMLElement or TextNodes"
                )

            elif isinstance(value, bool):
                value = str(value).lower()

            elif isinstance(value, Enum):
                # Handle enum values
                value = value.value

            # Some attribute names are reserved Python keywords or Python builtins
            # to allow this, we allow a trailing underscore which we strip here.
            # All attributes use kebab-case, which we can't easily use as field names
            # so we encode them as snake_case and convert to kebab-case here.
            # Some attributes also include : which we encode as double underscore.
            attr_name = field_name.rstrip("_").replace("__", ":").replace("_", "-")

            # Set the attribute
            element.set(attr_name, str(value))

            if attr_name == "src" or attr_name == "href":
                self._file_dependencies.add(value)
            elif attr_name == "srcset":
                entries = re.findall(srcset_entry_pattern, value)
                for entry in entries:
                    # Each entry is a tuple of (url, descriptors)
                    url = entry[0].strip()
                    self._file_dependencies.add(url)

        self._element = element

        return self._element

    def to_xml_string(self) -> str:
        """Convert to XML string"""
        element = self.to_element()
        return ET.tostring(element, encoding="unicode")

    def get_file_dependencies(self) -> List[str]:
        # Ensure the element has been processed so that the file dependencies are collected.
        self.to_element()
        return list(self._file_dependencies)


class QTIBase(XMLElement):
    """
    A base class to allow us to conventionally generate element names from class names for QTI elements.
    """

    @classmethod
    def element_name(cls):
        # Convert PascalCase to kebab-case
        name = re.sub(r"(?<=[a-z])(?=[A-Z])", "-", cls.__name__)
        return f"qti-{name.lower()}"


def coerce_str_to_model(element_type, value: Union[str, XMLElement]) -> XMLElement:
    """Convert string to element_type if needed"""
    if isinstance(value, str):
        return element_type(text=value)
    return value


def generate_coerced_string_type(element_type):
    return Annotated[
        element_type, BeforeValidator(partial(coerce_str_to_model, element_type))
    ]


TextType = generate_coerced_string_type(TextNode)


class BaseSequence(XMLElement):
    id_: Optional[str] = None
    class_: Optional[str] = None
    lang: Optional[BCP47Language] = None
    # We explicitly do not set the deprecated language value.
    label: Optional[str] = None
    # We explicitly do not set the base value.
    dir_: Optional[Dir] = None
