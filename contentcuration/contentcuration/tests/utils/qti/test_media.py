from contentcuration.tests.utils.qti.test_validation import VALID_CHOICE_ITEM
from contentcuration.utils.assessment.qti.media import get_qti_media_references
from contentcuration.utils.assessment.qti.media import rewrite_qti_media_paths
from contentcuration.utils.assessment.qti.media import set_qti_item_language
from contentcuration.utils.assessment.qti.validation import validate_qti_item

CHECKSUM_A = "a" * 32
CHECKSUM_B = "b" * 32


def test_extracts_checksum_from_src_href_data():
    xml = (
        f'<item><img src="{CHECKSUM_A}.png"/>'
        f'<a href="{CHECKSUM_B}.pdf">x</a>'
        f'<object data="{CHECKSUM_A}.png"></object></item>'
    )
    assert get_qti_media_references(xml) == {f"{CHECKSUM_A}.png", f"{CHECKSUM_B}.pdf"}


def test_extracts_checksums_from_srcset():
    xml = f'<item><img srcset="{CHECKSUM_A}.png 1x, {CHECKSUM_B}.png 2x"/></item>'
    assert get_qti_media_references(xml) == {f"{CHECKSUM_A}.png", f"{CHECKSUM_B}.png"}


def test_ignores_non_checksum_values():
    xml = '<item><img src="https://example.com/x.png"/><a href="notachecksum.png">x</a></item>'
    assert get_qti_media_references(xml) == set()


def test_returns_empty_set_for_malformed_xml():
    assert get_qti_media_references("<item><unclosed>") == set()


def test_accepts_bytes():
    xml = f'<item><img src="{CHECKSUM_A}.png"/></item>'.encode("utf-8")
    assert get_qti_media_references(xml) == {f"{CHECKSUM_A}.png"}


def test_rewrite_leaves_input_untouched_with_no_mapping():
    xml = f'<item><img src="{CHECKSUM_A}.png" /></item>'
    assert rewrite_qti_media_paths(xml, {}) == xml


def test_rewrite_remaps_src_href_data_and_preserves_formatting():
    xml = (
        f'<item><img src="{CHECKSUM_A}.png" alt="diagram" />'
        f'<a href="{CHECKSUM_B}.pdf">x</a>'
        f'<object data="{CHECKSUM_A}.png"></object></item>'
    )
    result = rewrite_qti_media_paths(
        xml,
        {
            f"{CHECKSUM_A}.png": f"images/{CHECKSUM_A}.png",
            f"{CHECKSUM_B}.pdf": f"images/{CHECKSUM_B}.pdf",
        },
    )
    assert result == (
        f'<item><img src="images/{CHECKSUM_A}.png" alt="diagram" />'
        f'<a href="images/{CHECKSUM_B}.pdf">x</a>'
        f'<object data="images/{CHECKSUM_A}.png"></object></item>'
    )


def test_rewrite_remaps_srcset_entries_preserving_descriptors():
    xml = f'<item><img srcset="{CHECKSUM_A}.png 1x, {CHECKSUM_B}.png 2x"/></item>'
    result = rewrite_qti_media_paths(
        xml,
        {
            f"{CHECKSUM_A}.png": f"images/{CHECKSUM_A}.png",
            f"{CHECKSUM_B}.png": f"images/{CHECKSUM_B}.png",
        },
    )
    assert result == (
        f'<item><img srcset="images/{CHECKSUM_A}.png 1x, images/{CHECKSUM_B}.png 2x"/></item>'
    )


def test_rewrite_ignores_values_not_in_mapping():
    xml = f'<item><img src="{CHECKSUM_A}.png"/><a href="{CHECKSUM_B}.pdf">x</a></item>'
    result = rewrite_qti_media_paths(
        xml, {f"{CHECKSUM_A}.png": f"images/{CHECKSUM_A}.png"}
    )
    assert result == (
        f'<item><img src="images/{CHECKSUM_A}.png"/><a href="{CHECKSUM_B}.pdf">x</a></item>'
    )


ITEM_WITHOUT_LANGUAGE = (
    '<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" '
    'identifier="i" title="t" adaptive="false" time-dependent="false">'
    "<qti-item-body><p>Body</p></qti-item-body>"
    "</qti-assessment-item>"
)


def test_set_language_adds_it_when_the_item_has_none():
    result = set_qti_item_language(ITEM_WITHOUT_LANGUAGE, "es")
    assert 'xml:lang="es"' in result
    assert "<qti-item-body><p>Body</p></qti-item-body>" in result


def test_set_language_replaces_a_language_the_item_already_had():
    already = ITEM_WITHOUT_LANGUAGE.replace('title="t"', 'title="t" xml:lang="en"')
    result = set_qti_item_language(already, "sw")
    # Rewritten where it stands, so the value is the only thing that differs.
    assert result == already.replace('xml:lang="en"', 'xml:lang="sw"')


def test_set_language_leaves_an_item_already_declaring_it_byte_for_byte():
    already = ITEM_WITHOUT_LANGUAGE.replace('title="t"', 'title="t" xml:lang="sw"')
    assert set_qti_item_language(already, "sw") == already


def test_set_language_leaves_the_item_alone_without_a_language_to_set():
    assert set_qti_item_language(ITEM_WITHOUT_LANGUAGE, "") == ITEM_WITHOUT_LANGUAGE
    assert set_qti_item_language(ITEM_WITHOUT_LANGUAGE, None) == ITEM_WITHOUT_LANGUAGE


def test_set_language_only_touches_the_root():
    nested = ITEM_WITHOUT_LANGUAGE.replace("<p>Body</p>", '<p xml:lang="fr">Body</p>')
    result = set_qti_item_language(nested, "es")
    assert '<p xml:lang="fr">Body</p>' in result
    assert result.count('xml:lang="es"') == 1


def test_set_language_keeps_the_item_schema_valid():
    result = set_qti_item_language(VALID_CHOICE_ITEM, "es")
    validation = validate_qti_item(result)
    assert validation.is_valid, validation.errors
