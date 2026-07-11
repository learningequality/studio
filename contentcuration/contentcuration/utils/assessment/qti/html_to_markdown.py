"""Reverse of ``render_markdown``: QTI flow-content (HTML5/MathML) → Perseus markdown.

``render_markdown`` (``markdown.py``) renders ``gfm-like`` markdown (CommonMark +
tables + strikethrough, ``linkify`` disabled) plus ``$$…$$`` math to HTML. This
module is its inverse over that same flavour: given the HTML5/MathML flow content
found in a native QTI item, it reconstructs the Perseus markdown it came from.

The two utilities are designed to round-trip: for markdown that is valid for this
flavour, ``html_to_markdown(parse(render_markdown(md)))`` reproduces ``md``. The
one deliberate exception is images — a QTI ``raw_data`` ``<img>`` carries a bare
``<checksum>.<ext>`` ``src``, which is re-prefixed with the Perseus content-storage
placeholder here (see ``test_html_to_markdown`` for the round-trip coverage).

This module has no knowledge of QTI items — it operates on a sequence of sibling
lxml elements.
"""
import logging
from typing import Iterable

from le_utils.constants import exercises
from lxml import etree

logger = logging.getLogger(__name__)

CONTENT_STORAGE_PREFIX = exercises.CONTENT_STORAGE_FORMAT.format("")


def _localname(el):
    return etree.QName(el).localname


def _element_children(el):
    """Child elements only — skips comments/processing instructions and text."""
    return [child for child in el if isinstance(child.tag, str)]


def _render_inline(el):
    """Render an element's inline content: its text, children, and each child's tail."""
    parts = []
    if el.text:
        parts.append(el.text)
    for child in el:
        parts.append(_render_element(child))
        if child.tail:
            parts.append(child.tail)
    return "".join(parts)


def _render_math(el):
    # ``render_markdown`` emits display math as a top-level ``<math
    # display="block">`` sibling (not wrapped in a paragraph), so it must carry
    # its own trailing block separator like the other block renderers; otherwise
    # the following block is glued onto the math line. Inline math
    # (``display="inline"``) stays inline within its paragraph.
    suffix = "\n\n" if el.get("display") == "block" else ""
    for annotation in el.iter():
        if (
            _localname(annotation) == "annotation"
            and annotation.get("encoding") == "application/x-tex"
        ):
            return "$${}$${}".format(annotation.text or "", suffix)
    logger.warning("MathML element without an application/x-tex annotation; dropping")
    return ""


def _render_img(el):
    src = el.get("src", "")
    if not src:
        return ""
    return "![{}]({}{})".format(el.get("alt", ""), CONTENT_STORAGE_PREFIX, src)


def _render_heading(el):
    level = int(_localname(el)[1])
    return "{} {}\n\n".format("#" * level, _render_inline(el).strip())


def _render_code_block(el):
    """``<pre><code class="language-x">…</code></pre>`` → a fenced code block."""
    code = next((c for c in _element_children(el) if _localname(c) == "code"), None)
    language = ""
    text = ""
    if code is not None:
        text = code.text or ""
        css_class = code.get("class", "")
        if css_class.startswith("language-"):
            language = css_class[len("language-") :]
    if not text.endswith("\n"):
        text += "\n"
    return "```{}\n{}```\n\n".format(language, text)


def _render_blockquote(el):
    inner = "".join(_render_element(child) for child in _element_children(el)).strip()
    lines = [("> " + line) if line else ">" for line in inner.split("\n")]
    return "\n".join(lines) + "\n\n"


def _list_lines(el):
    """Flatten a ``<ul>``/``<ol>`` into markdown lines, indenting nested lists."""
    ordered = _localname(el) == "ol"
    lines = []
    items = (c for c in _element_children(el) if _localname(c) == "li")
    for index, li in enumerate(items, start=1):
        marker = "{}. ".format(index) if ordered else "- "
        # Split the item's own inline content from any nested lists it contains.
        inline_parts = []
        nested_lists = []
        if li.text:
            inline_parts.append(li.text)
        for child in li:
            if _localname(child) in ("ul", "ol"):
                nested_lists.append(child)
            elif isinstance(child.tag, str):
                inline_parts.append(_render_element(child))
            if child.tail:
                inline_parts.append(child.tail)
        lines.append(marker + "".join(inline_parts).strip())
        indent = " " * len(marker)
        for nested_list in nested_lists:
            lines.extend(indent + line for line in _list_lines(nested_list))
    return lines


def _render_list(el):
    return "\n".join(_list_lines(el)) + "\n\n"


def _render_table(el):
    rows = []
    for section in _element_children(el):
        for tr in _element_children(section):
            if _localname(tr) != "tr":
                continue
            rows.append(
                [
                    _render_inline(cell).strip()
                    for cell in _element_children(tr)
                    if _localname(cell) in ("th", "td")
                ]
            )
    if not rows:
        return ""
    width = max(len(row) for row in rows)
    padded = [row + [""] * (width - len(row)) for row in rows]
    out = ["| " + " | ".join(padded[0]) + " |"]
    out.append("| " + " | ".join(["---"] * width) + " |")
    for row in padded[1:]:
        out.append("| " + " | ".join(row) + " |")
    return "\n".join(out) + "\n\n"


# localname -> (prefix, suffix) for inline elements that wrap their content.
_INLINE_WRAPPERS = {
    "strong": ("**", "**"),
    "b": ("**", "**"),
    "em": ("*", "*"),
    "i": ("*", "*"),
    "s": ("~~", "~~"),
    "del": ("~~", "~~"),
    "strike": ("~~", "~~"),
}

# localname -> handler(el) -> markdown, for elements with dedicated rendering.
# ``render_markdown`` emits a hard break as ``<br />\n``; the trailing newline
# lives in the element's tail, so two spaces here reconstruct the break.
_ELEMENT_RENDERERS = {
    "math": _render_math,
    "img": _render_img,
    "a": lambda el: "[{}]({})".format(_render_inline(el), el.get("href", "")),
    "code": lambda el: "`{}`".format(el.text or ""),
    "br": lambda el: "  ",
    "hr": lambda el: "---\n\n",
    "pre": _render_code_block,
    "blockquote": _render_blockquote,
    "ul": _render_list,
    "ol": _render_list,
    "table": _render_table,
    "p": lambda el: "{}\n\n".format(_render_inline(el)),
    "div": lambda el: "{}\n\n".format(_render_inline(el)),
    **{"h{}".format(level): _render_heading for level in range(1, 7)},
}


def _render_element(el):
    if not isinstance(el.tag, str):
        # Comment / processing instruction — nothing to render.
        return ""

    localname = _localname(el)

    if localname.endswith("-interaction"):
        return ""
    if localname in _INLINE_WRAPPERS:
        prefix, suffix = _INLINE_WRAPPERS[localname]
        return "{}{}{}".format(prefix, _render_inline(el), suffix)
    renderer = _ELEMENT_RENDERERS.get(localname)
    if renderer is not None:
        return renderer(el)
    # Unknown element (e.g. inline HTML passthrough): unwrap, keeping its content.
    return _render_inline(el)


def html_to_markdown(elements: Iterable[etree._Element]) -> str:
    return "".join(_render_element(el) for el in elements).strip()
