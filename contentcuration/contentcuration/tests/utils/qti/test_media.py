from contentcuration.utils.assessment.qti.media import get_qti_media_references

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
