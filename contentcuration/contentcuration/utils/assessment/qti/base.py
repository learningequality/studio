import re
import xml.etree.ElementTree as ET
from abc import ABC
from enum import Enum
from functools import partial
from typing import Annotated
from typing import List
from typing import Optional
from typing import Set
from typing import Type
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


# Pydantic's BaseModel Metaclass is only importable from an internal module,
# so we inspect the BaseSequence class to get its metaclass.
BaseSequenceMetaclass = type(BaseSequence)


class RegistryMeta(BaseSequenceMetaclass):
    """Generic metaclass that creates separate registries for each subclass"""

    def __new__(mcs, name, bases, attrs):
        cls = super().__new__(mcs, name, bases, attrs)

        # Each metaclass gets its own registry
        if not hasattr(mcs, "_registry"):
            mcs._registry = {}

        element_name = cls.element_name()
        if element_name in mcs._registry and mcs._registry[element_name] is not cls:
            raise ValueError(
                f"Element name '{element_name}' already registered in {mcs.__name__}"
            )
        mcs._registry[element_name] = cls

        return cls

    @classmethod
    def _ensure_registry_complete(cls):
        """Ensure all HTML and MathML classes are registered"""
        if not hasattr(cls, "_registry_initialized"):
            # Import modules to trigger registration
            from contentcuration.utils.assessment.qti import html, mathml  # noqa: F401

            cls._registry_initialized = True

    @classmethod
    def get_class_for_tag(cls, tag_name: str) -> Optional[Type]:
        """Get the registered class for a given tag name"""
        cls._ensure_registry_complete()
        return getattr(cls, "_registry", {}).get(tag_name)


class ElementTreeBase(BaseSequence, metaclass=RegistryMeta):
    @classmethod
    def from_element(cls, element: ET.Element) -> "ElementTreeBase":
        # Get the appropriate class for this tag
        target_class = type(cls).get_class_for_tag(element.tag)
        if target_class is None:
            raise ValueError(f"No registered class found for tag: {element.tag}")

        # Convert attributes to field data - Pydantic will handle type coercion
        field_data = {}
        for attr_name, attr_value in element.attrib.items():
            field_name = cls._attr_name_to_field_name(attr_name)
            field_data[field_name] = attr_value

        # Convert children and text
        children = cls._extract_children(element)
        if children:
            field_data["children"] = children

        return target_class(**field_data)

    @classmethod
    def _attr_name_to_field_name(cls, attr_name: str) -> str:
        """Convert attribute name to Python field name"""
        # kebab-case -> snake_case, : -> __
        field_name = attr_name.replace(":", "__").replace("-", "_")

        # Add trailing underscore for Python keywords
        if field_name in {"class", "for", "type", "id", "dir"}:
            field_name += "_"

        return field_name

    @classmethod
    def _extract_children(
        cls, element: ET.Element
    ) -> List[Union["ElementTreeBase", TextNode]]:
        """Extract child elements and text nodes from XML element"""
        children = []

        # Add initial text if present
        if element.text and element.text.strip():
            children.append(TextNode(text=element.text))

        # Process child elements
        for child_elem in element:
            children.append(cls.from_element(child_elem))
            # Add tail text after child element
            if child_elem.tail and child_elem.tail.strip():
                children.append(TextNode(text=child_elem.tail))

        return children

    @classmethod
    def from_string(cls, string: str) -> List["ElementTreeBase"]:
        """Parse markup string and return list of ElementTreeBase instances"""
        try:
            # Wrap in a root element to handle multiple top-level elements
            wrapped_markup = f"<root>{string}</root>"
            root = ET.fromstring(wrapped_markup)
            return [cls.from_element(child) for child in root]
        except ET.ParseError as e:
            raise ValueError(f"Invalid Markup: {e}") from e
