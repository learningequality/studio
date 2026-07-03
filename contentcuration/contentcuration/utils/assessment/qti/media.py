import re

from lxml import etree

from contentcuration.utils.assessment.qti.fields import (
    entry_pattern as srcset_entry_pattern,
)
from contentcuration.utils.assessment.qti.validation import parse_qti_xml

QTI_REFERENCE_ATTRIBUTES = ("src", "href", "data")
QTI_CHECKSUM_FILENAME_REGEX = re.compile(r"^[a-f0-9]{32}\.[0-9a-z]+$")
QTI_MEDIA_REFERENCE_XPATH = etree.XPath(
    "//*["
    + " or ".join(f"@{attribute}" for attribute in QTI_REFERENCE_ATTRIBUTES)
    + " or @srcset]"
)


def get_qti_media_references(raw_data):
    """
    Scan QTI item XML for <checksum>.<ext> media references in src/href/data/srcset
    attributes, matching the TipTap editor's permanentSrc="<checksum>.<ext>" convention.
    """
    if isinstance(raw_data, str):
        raw_data = raw_data.encode("utf-8")
    checksums = set()
    try:
        doc = parse_qti_xml(raw_data)
    except etree.XMLSyntaxError:
        return checksums
    for element in QTI_MEDIA_REFERENCE_XPATH(doc):
        candidates = [
            element.attrib.get(attribute) for attribute in QTI_REFERENCE_ATTRIBUTES
        ]
        srcset = element.attrib.get("srcset")
        if srcset:
            candidates += [
                entry[0].strip() for entry in re.findall(srcset_entry_pattern, srcset)
            ]
        checksums.update(
            value
            for value in candidates
            if value and QTI_CHECKSUM_FILENAME_REGEX.match(value)
        )
    return checksums
