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
ITEM_ROOT_START_TAG_REGEX = re.compile(r"<qti-assessment-item\b[^>]*>")
XML_LANG_ATTRIBUTE_REGEX = re.compile(r'\s+xml:lang="[^"]*"')

QTI_MEDIA_ATTRIBUTE_VALUE_REGEX = re.compile(
    r"(?P<attr>" + "|".join(QTI_REFERENCE_ATTRIBUTES + ("srcset",)) + r")"
    r'(?P<eq>\s*=\s*)(?P<quote>["\'])(?P<value>[^"\']*)(?P=quote)'
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


def rewrite_qti_media_paths(raw_data, path_by_filename):
    """
    Rewrite src/href/data/srcset attribute values referencing keys of
    `path_by_filename` to the corresponding new path. Operates as a targeted
    text substitution rather than a parse/serialize round-trip, so every other
    byte of `raw_data` (formatting, attribute order, self-closing tag style,
    etc.) is left untouched.
    """
    if not path_by_filename:
        return raw_data

    def _replace_srcset_entry(match):
        filename = match.group(1)
        new_path = path_by_filename.get(filename)
        if new_path is None:
            return match.group(0)
        return match.group(0).replace(filename, new_path, 1)

    def _replace_attribute(match):
        attribute, eq, quote, value = match.group("attr", "eq", "quote", "value")
        if attribute == "srcset":
            value = re.sub(srcset_entry_pattern, _replace_srcset_entry, value)
        elif value in path_by_filename:
            value = path_by_filename[value]
        return f"{attribute}{eq}{quote}{value}{quote}"

    return QTI_MEDIA_ATTRIBUTE_VALUE_REGEX.sub(_replace_attribute, raw_data)


def set_qti_item_language(raw_data, language):
    """
    Set ``xml:lang`` on the item root, replacing any value already there.

    The node's language is the one Studio knows to be current, so it wins over whatever an
    item recorded when it was written — which for an item authored in the QTI editor before
    it had a language to record is nothing at all.

    Operates as a targeted text substitution on the root start tag, for the same reason
    ``rewrite_qti_media_paths`` does: every other byte of ``raw_data``, formatting included,
    is left as the author's editor produced it. An attribute already present is rewritten
    where it stands rather than moved to the end, so an item that already declares the
    node's language comes back byte for byte.
    """
    if not language:
        return raw_data

    replacement = f' xml:lang="{language}"'

    def _replace_root(match):
        tag = match.group(0)
        if XML_LANG_ATTRIBUTE_REGEX.search(tag):
            # A function, not a string: a replacement string would read any backslash
            # in the language tag as a group reference.
            return XML_LANG_ATTRIBUTE_REGEX.sub(lambda _: replacement, tag, count=1)
        return f"{tag[:-1].rstrip()}{replacement}>"

    return ITEM_ROOT_START_TAG_REGEX.sub(_replace_root, raw_data, count=1)
