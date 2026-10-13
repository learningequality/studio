from contentcuration.tests.utils.qti.test_validation import VALID_CHOICE_ITEM
from contentcuration.utils.assessment.qti.media import get_qti_media_references
from contentcuration.utils.assessment.qti.media import rewrite_qti_media_paths
from contentcuration.utils.assessment.qti.media import rewrite_qti_sized_image_paths
from contentcuration.utils.assessment.qti.media import set_qti_item_language
from contentcuration.utils.assessment.qti.media import strip_studio_attributes
from contentcuration.utils.assessment.qti.media import XML_LANG_ATTRIBUTE
from contentcuration.utils.assessment.qti.validation import parse_qti_xml
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


def _root(xml):
    return parse_qti_xml(xml.encode("utf-8")).getroot()


def _attribute_values(xml, attribute):
    return [
        element.get(attribute)
        for element in _root(xml).iter()
        if attribute in element.attrib
    ]


def test_rewrite_leaves_input_untouched_with_no_mapping():
    xml = f'<item><img src="{CHECKSUM_A}.png" /></item>'
    assert rewrite_qti_media_paths(xml, {}) == xml


def test_rewrite_remaps_src_href_data():
    xml = (
        f'<item><img src="{CHECKSUM_A}.png" alt="diagram" />'
        f'<a href="{CHECKSUM_B}.pdf">x</a>'
        f'<object data="{CHECKSUM_A}.png"></object></item>'
    )
    result = _root(
        rewrite_qti_media_paths(
            xml,
            {
                f"{CHECKSUM_A}.png": f"images/{CHECKSUM_A}.png",
                f"{CHECKSUM_B}.pdf": f"images/{CHECKSUM_B}.pdf",
            },
        )
    )
    img, a, obj = result
    assert img.attrib == {"src": f"images/{CHECKSUM_A}.png", "alt": "diagram"}
    assert a.get("href") == f"images/{CHECKSUM_B}.pdf"
    assert a.text == "x"
    assert obj.get("data") == f"images/{CHECKSUM_A}.png"


def test_rewrite_remaps_srcset_entries_preserving_descriptors():
    xml = f'<item><img srcset="{CHECKSUM_A}.png 1x, {CHECKSUM_B}.png 2x"/></item>'
    result = rewrite_qti_media_paths(
        xml,
        {
            f"{CHECKSUM_A}.png": f"images/{CHECKSUM_A}.png",
            f"{CHECKSUM_B}.png": f"images/{CHECKSUM_B}.png",
        },
    )
    assert _attribute_values(result, "srcset") == [
        f"images/{CHECKSUM_A}.png 1x, images/{CHECKSUM_B}.png 2x"
    ]


def test_rewrite_ignores_values_not_in_mapping():
    xml = f'<item><img src="{CHECKSUM_A}.png"/><a href="{CHECKSUM_B}.pdf">x</a></item>'
    result = rewrite_qti_media_paths(
        xml, {f"{CHECKSUM_A}.png": f"images/{CHECKSUM_A}.png"}
    )
    assert _attribute_values(result, "src") == [f"images/{CHECKSUM_A}.png"]
    assert _attribute_values(result, "href") == [f"{CHECKSUM_B}.pdf"]


def test_rewrite_remaps_a_src_written_with_a_character_reference():
    xml = f'<item><img src="&#x{ord(CHECKSUM_A[0]):x};{CHECKSUM_A[1:]}.png"/></item>'
    result = rewrite_qti_media_paths(
        xml, {f"{CHECKSUM_A}.png": f"images/{CHECKSUM_A}.png"}
    )
    assert _attribute_values(result, "src") == [f"images/{CHECKSUM_A}.png"]


def test_rewrite_remaps_a_src_written_as_an_entity():
    declaration, _, item = VALID_CHOICE_ITEM.partition("?>")
    xml = (
        f'{declaration}?><!DOCTYPE qti-assessment-item [<!ENTITY e "{CHECKSUM_A}.png">]>'
        + item.replace("<qti-prompt>", '<qti-prompt><img src="&e;" alt="x"/>')
    )
    result = rewrite_qti_media_paths(
        xml, {f"{CHECKSUM_A}.png": f"images/{CHECKSUM_A}.png"}
    )
    assert _attribute_values(result, "src") == [f"images/{CHECKSUM_A}.png"]
    assert "&e;" not in result


def _path_for_size(filename, width, height):
    return f"images/{width}x{height}-{filename}"


def test_sized_rewrite_points_each_sized_img_at_its_size():
    xml = (
        f'<item>\n  <img alt="a > b" src="{CHECKSUM_A}.png" width="200" height="150"/>'
        f"<img height='75' src='{CHECKSUM_A}.png' width='100' />"
        f'<img src="{CHECKSUM_B}.png" width="200" height="150"></img></item>'
    )
    assert _attribute_values(
        rewrite_qti_sized_image_paths(xml, _path_for_size), "src"
    ) == [
        f"images/200x150-{CHECKSUM_A}.png",
        f"images/100x75-{CHECKSUM_A}.png",
        f"images/200x150-{CHECKSUM_B}.png",
    ]


def test_sized_rewrite_points_a_namespaced_img_at_its_size():
    result = rewrite_qti_sized_image_paths(
        VALID_CHOICE_ITEM.replace(
            "<qti-item-body>",
            f'<qti-item-body><p><img src="{CHECKSUM_A}.png" alt="" width="200" height="150"/></p>',
        ),
        _path_for_size,
    )
    assert _attribute_values(result, "src") == [f"images/200x150-{CHECKSUM_A}.png"]


def test_sized_rewrite_leaves_imgs_without_a_pixel_size_or_checksum_src():
    xml = (
        f'<item><img src="{CHECKSUM_A}.png"/>'
        f'<img src="{CHECKSUM_A}.png" width="200"/>'
        f'<img src="{CHECKSUM_A}.png" width="50%" height="150"/>'
        f'<img srcset="{CHECKSUM_A}.png 1x" width="200" height="150"/>'
        f'<img permanentSrc="{CHECKSUM_A}.png" width="200" height="150"/>'
        f'<img data-src="{CHECKSUM_A}.png" width="200" height="150"/>'
        f'<img alt=\'src="{CHECKSUM_A}.png"\' width="200" height="150"/>'
        '<img src="https://example.com/x.png" width="200" height="150"/>'
        f'<object data="{CHECKSUM_A}.png" width="200" height="150"></object></item>'
    )
    result = _root(rewrite_qti_sized_image_paths(xml, _path_for_size))
    assert [element.attrib for element in result] == [
        element.attrib for element in _root(xml)
    ]


def test_sized_rewrite_leaves_imgs_in_comments_and_cdata():
    sized_img = f'<img src="{CHECKSUM_A}.png" width="200" height="150"/>'
    for hidden in (f"<!-- {sized_img}\n-->", f"<![CDATA[{sized_img}]]>"):
        xml = (
            f"<item>{hidden}"
            f'<img src="{CHECKSUM_A}.png" width="100" height="75"/></item>'
        )
        result = rewrite_qti_sized_image_paths(xml, _path_for_size)
        assert sized_img in result.replace("&lt;", "<").replace("&gt;", ">")
        assert _attribute_values(result, "src") == [f"images/100x75-{CHECKSUM_A}.png"]


ITEM_WITHOUT_LANGUAGE = (
    '<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" '
    'identifier="i" title="t" adaptive="false" time-dependent="false">'
    "<qti-item-body><p>Body</p></qti-item-body>"
    "</qti-assessment-item>"
)


def _language(xml):
    return _root(xml).get(XML_LANG_ATTRIBUTE)


def test_set_language_adds_it_when_the_item_has_none():
    result = set_qti_item_language(ITEM_WITHOUT_LANGUAGE, "es")
    assert _language(result) == "es"
    assert "<qti-item-body><p>Body</p></qti-item-body>" in result


def test_set_language_replaces_a_language_the_item_already_had():
    already = ITEM_WITHOUT_LANGUAGE.replace('title="t"', 'title="t" xml:lang="en"')
    assert _language(set_qti_item_language(already, "sw")) == "sw"


def test_set_language_finds_the_language_after_a_greater_than_in_an_attribute():
    already = ITEM_WITHOUT_LANGUAGE.replace(
        'title="t"', "title=\"a > b\" xml:lang='en'"
    )
    root = _root(set_qti_item_language(already, "sw"))
    assert root.get(XML_LANG_ATTRIBUTE) == "sw"
    assert root.get("title") == "a > b"


def test_set_language_ignores_language_text_inside_another_attribute_value():
    tricky = ITEM_WITHOUT_LANGUAGE.replace('title="t"', "title=\"see xml:lang='x'\"")
    root = _root(set_qti_item_language(tricky, "sw"))
    assert root.get(XML_LANG_ATTRIBUTE) == "sw"
    assert root.get("title") == "see xml:lang='x'"


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


def test_set_language_sets_it_on_a_namespace_prefixed_root():
    prefixed = (
        ITEM_WITHOUT_LANGUAGE.replace("<qti-", "<q:qti-")
        .replace("</qti-", "</q:qti-")
        .replace("xmlns=", "xmlns:q=")
    )
    assert _language(set_qti_item_language(prefixed, "es")) == "es"


def test_set_language_skips_a_comment_quoting_the_root_tag_after_the_declaration():
    declaration, _, root = VALID_CHOICE_ITEM.partition("?>")
    comment = '<!-- <qti-assessment-item foo="1"> -->'
    result = set_qti_item_language(f"{declaration}?>{comment}{root}", "fr")
    assert comment in result
    assert _language(result) == "fr"
    validation = validate_qti_item(result)
    assert validation.is_valid, validation.errors


def test_strip_studio_attributes_removes_every_one_and_nothing_else():
    marked = ITEM_WITHOUT_LANGUAGE.replace(
        "<p>Body</p>",
        '<p data-studio-prompt="" class="q">Question</p>'
        '<p><qti-inline-choice-interaction response-identifier="r" '
        "data-studio-sentinel='' shuffle=\"false\">"
        '<qti-inline-choice identifier="c"/></qti-inline-choice-interaction></p>',
    )
    result = _root(strip_studio_attributes(marked))
    expected = _root(
        marked.replace(' data-studio-prompt=""', "").replace(
            " data-studio-sentinel=''", ""
        )
    )
    assert [(e.tag, e.attrib, e.text) for e in result.iter()] == [
        (e.tag, e.attrib, e.text) for e in expected.iter()
    ]


def test_strip_studio_attributes_ignores_lookalikes_in_values_and_text():
    tricky = ITEM_WITHOUT_LANGUAGE.replace(
        "<p>Body</p>",
        '<p title="a > b data-studio-prompt=\'\'" data-other="1">data-studio-prompt=""</p>',
    )
    paragraph = _root(strip_studio_attributes(tricky)).find(".//{*}p")
    assert paragraph.attrib == {
        "title": "a > b data-studio-prompt=''",
        "data-other": "1",
    }
    assert paragraph.text == 'data-studio-prompt=""'
