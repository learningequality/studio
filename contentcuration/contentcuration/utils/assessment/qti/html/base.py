import xml.etree.ElementTree as ET
from typing import Dict
from typing import List
from typing import Optional
from typing import Type
from typing import Union

from pydantic import model_validator

from contentcuration.utils.assessment.qti.base import BaseSequence
from contentcuration.utils.assessment.qti.base import TextNode
from contentcuration.utils.assessment.qti.fields import LocalSrcPath
from contentcuration.utils.assessment.qti.fields import LocalSrcSet


# Pydantic's BaseModel Metaclass is only importable from an internal module,
# so we inspect the BaseSequence class to get its metaclass.
BaseSequenceMetaclass = type(BaseSequence)


class HTMLElementMeta(BaseSequenceMetaclass):
    """Metaclass that auto-registers HTML element classes by their tag name"""

    # Class registry mapping tag names to classes
    _registry: Dict[str, Type["HTMLElement"]] = {}

    def __new__(mcs, name, bases, attrs):
        cls = super().__new__(mcs, name, bases, attrs)
        element_name = cls.element_name()
        mcs._registry[element_name] = cls
        return cls

    @classmethod
    def get_class_for_tag(mcs, tag_name: str) -> Optional[Type["HTMLElement"]]:
        """Get the registered class for a given tag name"""
        return mcs._registry.get(tag_name)

    @classmethod
    def register_class(mcs, tag_name: str, cls: Type["HTMLElement"]):
        """Manually register a class for a tag name"""
        mcs._registry[tag_name] = cls


class HTMLElement(BaseSequence, metaclass=HTMLElementMeta):
    """
    Represents an HTML element within QTI.
    """

    @classmethod
    def element_name(cls):
        return cls.__name__.lower()

    @classmethod
    def from_element(cls, element: ET.Element) -> "HTMLElement":
        """Create HTMLElement instance from ET.Element"""
        # Get the appropriate class for this tag
        target_class = HTMLElementMeta.get_class_for_tag(element.tag)
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
        """Convert HTML attribute name to Python field name"""
        # kebab-case -> snake_case, : -> __
        field_name = attr_name.replace(":", "__").replace("-", "_")

        # Add trailing underscore for Python keywords
        if field_name in {"class", "for", "type", "id", "dir"}:
            field_name += "_"

        return field_name

    @classmethod
    def _extract_children(
        cls, element: ET.Element
    ) -> List[Union["HTMLElement", TextNode]]:
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
    def from_html_string(cls, html_string: str) -> List["HTMLElement"]:
        """Parse HTML string and return list of HTMLElement instances"""
        try:
            # Wrap in a root element to handle multiple top-level elements
            wrapped_html = f"<root>{html_string}</root>"
            root = ET.fromstring(wrapped_html)
            return [cls.from_element(child) for child in root]
        except ET.ParseError as e:
            raise ValueError(f"Invalid HTML: {e}") from e


class FlowContentElement(HTMLElement):
    pass


class InlineContentElement(FlowContentElement):
    pass


class BlockContentElement(FlowContentElement):
    pass


class Source(HTMLElement):
    # These attributes are common to all <source> elements in HTML5
    media: Optional[str] = None
    type: Optional[str] = None

    # Required if a child of <audio> or <video>
    # not allowed if a child of <picture>
    src: Optional[LocalSrcPath] = None

    # Required if a child of <picture>
    # not allowed if a child of <audio> or <video>
    srcset: Optional[LocalSrcSet] = None

    sizes: Optional[str] = None
    height: Optional[int] = None
    width: Optional[int] = None

    @model_validator(mode="after")
    def _check_src_and_srcset(self):
        # both None or both set
        if (self.src is None) == (self.srcset is None):
            raise ValueError("Exactly one of 'src' or 'srcset' must be specified")
        return self
