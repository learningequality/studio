import re
import xml.etree.ElementTree as ET

from latex2mathml.converter import convert
from markdown_it import MarkdownIt
from markdown_it.renderer import RendererProtocol
from markdown_it.rules_block import StateBlock
from markdown_it.rules_inline import StateInline
from markdown_it.token import Token
from markdown_it.utils import EnvType
from markdown_it.utils import OptionsDict

from contentcuration.utils.assessment.qti.mathml.core import Annotation
from contentcuration.utils.assessment.qti.mathml.core import Semantics


# Regex patterns for $$ delimited math
INLINE_PATTERN = re.compile(r"^\$\$([\s\S]+?)\$\$")
BLOCK_PATTERN = re.compile(r"^\$\$([\s\S]+?)\$\$", re.M)

# Perseus extends the CommonMark image with a trailing size and alignment:
#   ![alt](<checksum>.<ext> =550x364 align=center)
# Neither suffix is valid CommonMark, so the whole construct fails to parse as an
# image and markdown-it emits it as literal text. Mirrors IMAGE_REGEX in the
# editor's TipTapEditor/utils/markdown.js, which reads the same syntax.
SIZED_IMAGE_PATTERN = re.compile(
    r"^!\[(?P<alt>[^\]]*)\]\("
    r"(?P<src>[^\s=)]+)"
    r"(?:\s*=\s*(?P<width>[0-9.]+)x(?P<height>[0-9.]+))?"
    r"(?:\s+align=(?P<align>\w+))?"
    r"\)"
)


def sized_image_func(state: StateInline, silent: bool) -> bool:
    """Parse a Perseus image with a size and/or alignment suffix."""
    if not state.src.startswith("![", state.pos):
        return False

    match = SIZED_IMAGE_PATTERN.match(state.src[state.pos :])
    # Without a suffix this is an ordinary CommonMark image; leave it to the
    # built-in rule, which handles reference links and nested labels too.
    if not match or not (match["width"] or match["align"]):
        return False

    if not silent:
        token = state.push("sized_image", "img", 0)
        # A QTI item references media by bare "<checksum>.<ext>" filename, which
        # publishing rewrites to the package's images/ directory. Legacy markdown
        # writes it under the content-storage placeholder, stripped by the time we
        # get here, so drop any remaining directory the same way the editor does.
        token.attrs = {
            "src": match["src"].rsplit("/", 1)[-1],
            "alt": match["alt"],
        }
        if match["width"]:
            # Perseus allows fractional sizes; HTML's width/height are integers,
            # as is the Img model these end up in.
            token.attrs["width"] = str(round(float(match["width"])))
            token.attrs["height"] = str(round(float(match["height"])))
        # An align suffix is consumed but dropped: QTI's Img has no attribute to
        # carry it, and the reverse conversion does not emit one either.

    state.pos += match.end()
    return True


def math_inline_func(state: StateInline, silent: bool) -> bool:
    """Parse inline math: $$expression$$"""
    if not state.src.startswith("$$", state.pos):
        return False

    match = INLINE_PATTERN.match(state.src[state.pos :])
    if not match:
        return False

    if not silent:
        token = state.push("math_inline", "math", 0)
        token.content = match.group(1)
        token.markup = "$$"

    state.pos += match.end()
    return True


def math_block_func(
    state: StateBlock, begLine: int, endLine: int, silent: bool
) -> bool:
    """Parse block math: $$expression$$"""
    begin = state.bMarks[begLine] + state.tShift[begLine]

    if not state.src.startswith("$$", begin):
        return False

    match = BLOCK_PATTERN.match(state.src[begin:])
    if not match:
        return False

    if not silent:
        token = state.push("math_block", "math", 0)
        token.block = True
        token.content = match.group(1)
        token.markup = "$$"

    # Advance to next line after the math block
    endpos = begin + match.end() - 1
    line = begLine
    while line < endLine:
        if endpos >= state.bMarks[line] and endpos <= state.eMarks[line]:
            state.line = line + 1
            break
        line += 1

    return True


def _convert(latex, inline=True):
    # Remove the namespace declaration for cleaner output
    markup = convert(latex, display="inline" if inline else "block").replace(
        ' xmlns="http://www.w3.org/1998/Math/MathML"', ""
    )
    # By default latex2mathml encodes operators that don't need to be encoded
    # so we parse it with ElementTree and turn it back into a string here for consistency.
    math_element = ET.fromstring(markup)

    # Create LaTeX annotation
    latex_annotation_element = Annotation(
        encoding="application/x-tex", children=[latex]
    ).to_element()

    semantics_element = Semantics().to_element()
    for child in math_element:
        math_element.remove(child)
        semantics_element.append(child)
    semantics_element.append(latex_annotation_element)
    math_element.append(semantics_element)

    return ET.tostring(math_element, encoding="unicode")


def render_math_inline(
    self: RendererProtocol,
    tokens: list[Token],
    idx: int,
    options: OptionsDict,
    env: EnvType,
) -> str:
    """Render inline math to MathML"""
    return _convert(tokens[idx].content)


def render_math_block(
    self: RendererProtocol,
    tokens: list[Token],
    idx: int,
    options: OptionsDict,
    env: EnvType,
) -> str:
    """Render block math to MathML"""
    return _convert(tokens[idx].content, inline=False)


def texmath_to_mathml_plugin(md: MarkdownIt) -> None:
    """Simple plugin for parsing TeX math with $$ delimiters.

    Converts inline and block math expressions to MathML using latex2mathml.
    """
    # Register parsing rules
    md.inline.ruler.before("escape", "math_inline", math_inline_func)
    md.block.ruler.before("fence", "math_block", math_block_func)

    # Register renderers
    md.add_render_rule("math_inline", render_math_inline)
    md.add_render_rule("math_block", render_math_block)


def sized_image_plugin(md: MarkdownIt) -> None:
    """Plugin for Perseus images carrying a size and/or alignment suffix.

    The token renders through the renderer's generic path, which emits the tag and
    its attributes, so no render rule of its own is needed.
    """
    md.inline.ruler.before("image", "sized_image", sized_image_func)


md = (
    MarkdownIt("gfm-like")
    .disable("linkify")
    .use(texmath_to_mathml_plugin)
    .use(sized_image_plugin)
)


def render_markdown(markdown):
    return md.render(markdown)
