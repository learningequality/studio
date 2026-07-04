from contentcuration.utils.assessment.qti.media import get_qti_media_references
from contentcuration.utils.assessment.qti.media import rewrite_qti_media_paths

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
