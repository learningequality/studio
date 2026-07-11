from le_utils.constants import exercises

from contentcuration.utils.assessment.markdown import render_markdown
from contentcuration.utils.assessment.qti.html_to_markdown import html_to_markdown
from contentcuration.utils.assessment.qti.ingest import (
    strip_content_storage_placeholder,
)
from contentcuration.utils.assessment.qti.validation import parse_qti_xml


def _elements(fragment):
    doc = parse_qti_xml("<div>{}</div>".format(fragment).encode("utf-8"))
    return list(doc.getroot())


def _markdown_from_html(html):
    return html_to_markdown(_elements(html))


def test_plain_paragraph():
    assert html_to_markdown(_elements("<p>Hello world</p>")) == "Hello world"


def test_two_paragraphs_join_with_blank_line():
    result = html_to_markdown(_elements("<p>First</p><p>Second</p>"))
    assert result == "First\n\nSecond"


def test_mathml_annotation_becomes_double_dollar_latex():
    fragment = (
        "<p><math><semantics><mrow><mi>x</mi></mrow>"
        '<annotation encoding="application/x-tex">x^2</annotation>'
        "</semantics></math></p>"
    )
    assert "$$x^2$$" in html_to_markdown(_elements(fragment))


def test_image_gets_content_storage_prefix():
    result = html_to_markdown(_elements('<p><img alt="d" src="abc123.png"/></p>'))
    expected = "![d]({})".format(exercises.CONTENT_STORAGE_FORMAT.format("abc123.png"))
    assert expected in result


def test_interaction_is_dropped_from_prompt():
    fragment = "<p>Fill <qti-text-entry-interaction/> in</p>"
    assert html_to_markdown(_elements(fragment)) == "Fill  in"


def test_empty_input_returns_empty_string():
    assert html_to_markdown(_elements("")) == ""
    assert html_to_markdown(_elements("<p>   </p>")) == ""


def test_headings():
    assert _markdown_from_html("<h1>One</h1>") == "# One"
    assert _markdown_from_html("<h3>Three</h3>") == "### Three"


def test_inline_emphasis_styles():
    assert _markdown_from_html("<p><strong>b</strong></p>") == "**b**"
    assert _markdown_from_html("<p><em>i</em></p>") == "*i*"
    assert _markdown_from_html("<p><s>gone</s></p>") == "~~gone~~"
    assert _markdown_from_html("<p><code>x = 1</code></p>") == "`x = 1`"


def test_link():
    result = _markdown_from_html('<p><a href="https://example.com">text</a></p>')
    assert result == "[text](https://example.com)"


def test_unordered_list_with_nesting():
    html = "<ul><li>one<ul><li>a</li><li>b</li></ul></li><li>two</li></ul>"
    assert _markdown_from_html(html) == "- one\n  - a\n  - b\n- two"


def test_ordered_list():
    html = "<ol><li>first</li><li>second</li></ol>"
    assert _markdown_from_html(html) == "1. first\n2. second"


def test_blockquote():
    assert _markdown_from_html("<blockquote><p>quoted</p></blockquote>") == "> quoted"


def test_fenced_code_block_with_language():
    html = '<pre><code class="language-python">x = 1\n</code></pre>'
    assert _markdown_from_html(html) == "```python\nx = 1\n```"


def test_horizontal_rule():
    assert _markdown_from_html("<p>a</p><hr/><p>b</p>") == "a\n\n---\n\nb"


def test_table():
    html = (
        "<table><thead><tr><th>A</th><th>B</th></tr></thead>"
        "<tbody><tr><td>1</td><td>2</td></tr></tbody></table>"
    )
    assert _markdown_from_html(html) == "| A | B |\n| --- | --- |\n| 1 | 2 |"


# A single canonical chunk exercising the full range of ``gfm-like`` formatting
# (plus ``$$…$$`` math and an image) that ``render_markdown`` accepts. The image
# carries the Perseus content-storage placeholder, exercising the one asymmetric
# transform: the forward ingest path strips the placeholder before building QTI
# HTML, and the img rule re-adds it on the way back.
CANONICAL_MARKDOWN = "\n\n".join(
    [
        "# Heading level 1",
        "## Heading level 2",
        (
            "A paragraph with **bold**, *italic*, ~~strikethrough~~, `inline code`, "
            "a [link](https://example.com), and math $$x^2 + y^2$$ inline."
        ),
        "![alt text]({})".format(exercises.CONTENT_STORAGE_FORMAT.format("abc123.png")),
        "> A blockquote paragraph.",
        "- First bullet\n- Second bullet\n  - Nested bullet\n- Third bullet",
        "1. First numbered\n2. Second numbered",
        "```python\nx = 1\ny = 2\n```",
        "| Column A | Column B |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |",
        "First line  \nsecond line after a hard break.",
        "---",
        "$$a^2 + b^2 = c^2$$",
    ]
)


def test_block_math_separates_from_following_block():
    """Display math is a top-level ``<math display="block">`` sibling in the
    forward HTML; it must keep the blank line before the next block rather than
    gluing the following paragraph onto the math line."""
    md = "Given the equation:\n\n$$E = mc^2$$\n\nExplain what it means."
    assert _markdown_from_html(render_markdown(md)) == md


def test_round_trips_losslessly_with_render_markdown():
    """markdown -> HTML -> markdown is identity through the real forward path.

    The forward transform mirrors the ingest pipeline: strip the content-storage
    placeholder (``ingest.py``) before ``render_markdown`` builds the QTI HTML,
    which is why images round-trip losslessly in production.
    """
    html = render_markdown(strip_content_storage_placeholder(CANONICAL_MARKDOWN))
    assert _markdown_from_html(html) == CANONICAL_MARKDOWN
