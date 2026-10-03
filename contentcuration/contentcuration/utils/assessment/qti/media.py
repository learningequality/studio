import re
from typing import Optional
from typing import Tuple

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
PIXEL_LENGTH_REGEX = re.compile(r"[1-9][0-9]*")
XML_LANG_ATTRIBUTE = "{http://www.w3.org/XML/1998/namespace}lang"


def img_pixel_size(width, height) -> Optional[Tuple[int, int]]:
    """
    An ``<img>``'s size in pixels, or None unless both attributes are positive
    integers: a percentage or a lone dimension gives no size to resize to.
    """
    if not all(PIXEL_LENGTH_REGEX.fullmatch(value or "") for value in (width, height)):
        return None
    return int(width), int(height)


def _parse(raw_data):
    # ``raw_data`` is already-decoded text, so its UTF-8 bytes are read as UTF-8
    # whatever encoding the XML declaration names. Same safety flags as
    # ``secure_parser``.
    parser = etree.XMLParser(
        resolve_entities=False,
        no_network=True,
        load_dtd=False,
        huge_tree=False,
        encoding="utf-8",
    )
    return etree.fromstring(raw_data.encode("utf-8"), parser).getroottree()


def _serialize(doc):
    return etree.tostring(doc, encoding="UTF-8", xml_declaration=True).decode("utf-8")


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


def rewrite_qti_media_paths(raw_data, path_by_filename):
    """
    Rewrite src/href/data/srcset attribute values referencing keys of
    `path_by_filename` to the corresponding new path.
    """
    if not path_by_filename:
        return raw_data

    def _replace_srcset_entry(match):
        filename = match.group(1)
        new_path = path_by_filename.get(filename)
        if new_path is None:
            return match.group(0)
        return match.group(0).replace(filename, new_path, 1)

    doc = _parse(raw_data)
    for element in QTI_MEDIA_REFERENCE_XPATH(doc):
        for attribute in QTI_REFERENCE_ATTRIBUTES:
            value = element.get(attribute)
            if value in path_by_filename:
                element.set(attribute, path_by_filename[value])
        srcset = element.get("srcset")
        if srcset:
            element.set(
                "srcset", re.sub(srcset_entry_pattern, _replace_srcset_entry, srcset)
            )
    return _serialize(doc)


def rewrite_qti_sized_image_paths(raw_data, path_for_size):
    """
    Point the ``src`` of each ``<img>`` with a pixel size at
    ``path_for_size(filename, width, height)``, per element so one image at two
    sizes gets two paths. A ``None`` path leaves the element alone.
    """
    doc = _parse(raw_data)
    for img in doc.iter("{*}img"):
        src = img.get("src")
        size = img_pixel_size(img.get("width"), img.get("height"))
        if not (src and size and QTI_CHECKSUM_FILENAME_REGEX.match(src)):
            continue
        path = path_for_size(src, *size)
        if path is not None:
            img.set("src", path)
    return _serialize(doc)


def set_qti_item_language(raw_data, language):
    """
    Set ``xml:lang`` on the item root, replacing any value already there.

    The node's language is the one Studio knows to be current, so it wins over whatever an
    item recorded when it was written — which for an item authored in the QTI editor before
    it had a language to record is nothing at all.
    """
    if not language:
        return raw_data
    doc = _parse(raw_data)
    doc.getroot().set(XML_LANG_ATTRIBUTE, language)
    return _serialize(doc)


def strip_studio_attributes(raw_data):
    """
    Remove every ``data-studio-*`` attribute, such as the ``data-studio-prompt`` marker the
    QTI editor writes for its own use when it reopens an item, so none reaches Kolibri.
    """
    if "data-studio-" not in raw_data:
        return raw_data
    doc = _parse(raw_data)
    for element in doc.iter(etree.Element):
        for name in list(element.attrib):
            if name.startswith("data-studio-"):
                del element.attrib[name]
    return _serialize(doc)
