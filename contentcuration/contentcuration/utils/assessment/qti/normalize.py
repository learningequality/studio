import logging

from lxml import etree

from contentcuration.utils.assessment.qti.validation import parse_qti_xml

logger = logging.getLogger(__name__)

_RPTEMPLATES = "https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/"
_MATCH_CORRECT_TEMPLATES = (
    _RPTEMPLATES + "match_correct",
    _RPTEMPLATES + "match_correct.xml",
)
_MAP_RESPONSE_TEMPLATE = _RPTEMPLATES + "map_response.xml"


def _local(el):
    return etree.QName(el).localname


def _children(el, localname):
    return [
        child
        for child in el
        if isinstance(child.tag, str) and _local(child) == localname
    ]


def _descendants(root, localname):
    return [
        el for el in root.iter() if isinstance(el.tag, str) and _local(el) == localname
    ]


def _multiple_cardinality_text_entry_declarations(root):
    identifiers = {
        el.get("response-identifier")
        for el in _descendants(root, "qti-text-entry-interaction")
    }
    return [
        el
        for el in _descendants(root, "qti-response-declaration")
        if el.get("identifier") in identifiers and el.get("cardinality") == "multiple"
    ]


def _answers(declaration):
    correct_response = next(iter(_children(declaration, "qti-correct-response")), None)
    if correct_response is None:
        return []
    return _children(correct_response, "qti-value")


def _answer_keys(declaration):
    texts = ((value.text or "").strip() for value in _answers(declaration))
    return [key for key in texts if key]


def _has_empty_mapping(declaration):
    mapping = next(iter(_children(declaration, "qti-mapping")), None)
    return mapping is not None and not _children(mapping, "qti-map-entry")


def _convert_to_single_answer(declaration):
    values = _answers(declaration)
    mapping = next(iter(_children(declaration, "qti-mapping")), None)
    if mapping is None:
        mapping = etree.Element(
            etree.QName(declaration, "qti-mapping"), {"default-value": "0.0"}
        )
        values[0].getparent().addnext(mapping)
    mapped_keys = {
        entry.get("map-key") for entry in _children(mapping, "qti-map-entry")
    }
    for value in values:
        key = (value.text or "").strip()
        if key and key not in mapped_keys:
            etree.SubElement(
                mapping,
                etree.QName(declaration, "qti-map-entry"),
                {"map-key": key, "mapped-value": "1.0"},
            )
            mapped_keys.add(key)
    kept = next((v for v in values if (v.text or "").strip()), values[0])
    for extra in values:
        if extra is not kept:
            extra.getparent().remove(extra)
    declaration.set("cardinality", "single")


def _unsafe_to_rewrite_reason(tree):
    root = tree.getroot()
    # Re-serialising drops the DOCTYPE, which would orphan any entities it declares.
    if tree.docinfo.doctype:
        return "has a DOCTYPE"
    # Multi-declaration items keep their template, so the mapping would go unused.
    if len(_descendants(root, "qti-response-declaration")) != 1:
        return "not exactly one declaration"
    # Validation rejects element content in a value; don't rewrite it into a valid item.
    if any(len(value) for value in _descendants(root, "qti-value")):
        return "qti-value has child elements"
    # Explicit rules or other templates would not use the converted declaration.
    scoring_templates = _MATCH_CORRECT_TEMPLATES + (_MAP_RESPONSE_TEMPLATE,)
    if any(
        processing.get("template") not in scoring_templates
        for processing in _children(root, "qti-response-processing")
    ):
        return "non-template response processing"
    return None


def normalize_text_entry_cardinality(raw_data):
    """
    Rewrite a text-entry item the editor saved with ``cardinality="multiple"`` and
    ``match_correct`` — which Kolibri scores as always incorrect — to the single-cardinality
    shape the editor writes.

    Returns ``raw_data`` itself when nothing needs changing or it cannot be parsed, so
    unaffected items stay byte for byte and one bad item cannot abort a publish.
    """
    try:
        tree = parse_qti_xml(raw_data.encode("utf-8"))
    except etree.XMLSyntaxError:
        logger.warning("Unable to parse QTI item XML during text-entry normalisation")
        return raw_data
    root = tree.getroot()

    # An all-blank answer list would leave an empty, schema-invalid mapping; an
    # already-empty mapping is invalid too, and filling it would publish a dropped item.
    declarations = [
        declaration
        for declaration in _multiple_cardinality_text_entry_declarations(root)
        if _answer_keys(declaration) and not _has_empty_mapping(declaration)
    ]
    if not declarations:
        return raw_data
    reason = _unsafe_to_rewrite_reason(tree)
    if reason:
        logger.warning(
            "Skipping text-entry normalisation of %s: %s",
            root.get("identifier"),
            reason,
        )
        return raw_data

    for declaration in declarations:
        _convert_to_single_answer(declaration)

    for processing in _children(root, "qti-response-processing"):
        if processing.get("template") in _MATCH_CORRECT_TEMPLATES:
            processing.set("template", _MAP_RESPONSE_TEMPLATE)

    return etree.tostring(root, xml_declaration=True, encoding="UTF-8").decode("utf-8")
