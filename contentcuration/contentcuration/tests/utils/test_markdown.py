import unittest

from contentcuration.utils.assessment.markdown import render_markdown
from contentcuration.utils.assessment.qti import ElementTreeBase


class TexMathTestMixin:
    """Mixin providing test methods for TexMath plugin tests"""

    def _assert_conversion(self, markdown_text: str, expected: str):
        """Override in subclasses to define assertion behavior"""
        raise NotImplementedError("Subclasses must implement _assert_conversion")

    def test_markdown_with_inline_math(self):
        """Test conversion of markdown with inline math to HTML + MathML"""

        markdown_text = (
            "What is the answer to this *question*? $$x\cdot y=z^2$$"  # noqa W605
        )
        expected = (
            "<p>What is the answer to this <em>question</em>? "
            '<math display="inline">'
            "<semantics><mrow><mi>x</mi><mi>·</mi><mi>y</mi><mo>=</mo><msup><mi>z</mi><mn>2</mn></msup></mrow>"
            '<annotation encoding="application/x-tex">x\cdot y=z^2</annotation></semantics>'  # noqa W605
            "</math></p>\n"
        )

        self._assert_conversion(markdown_text, expected)

    def test_block_math(self):
        """Test conversion of block math"""

        markdown_text = (
            "Here's an equation:\n\n$$E = mc^2$$\n\nThat's Einstein's formula."
        )
        expected = (
            "<p>Here's an equation:</p>\n"
            '<math display="block">'
            "<semantics><mrow><mi>E</mi><mo>=</mo><mi>m</mi><msup><mi>c</mi><mn>2</mn></msup></mrow>"
            '<annotation encoding="application/x-tex">E = mc^2</annotation></semantics>'
            "</math>"
            "<p>That's Einstein's formula.</p>\n"
        )

        self._assert_conversion(markdown_text, expected)

    def test_multiline_block_math(self):
        """
        Ensure a $$ … $$ block spanning multiple lines is converted to MathML
        and the literal $$ delimiters are removed. This currently fails with
        the buggy BLOCK_PATTERN because it stops after the first '$'.
        """
        markdown_text = (
            "$$\n"
            "\\begin{aligned}\n"
            "a = b + c \\\\\n"
            "$5 = d + e\n"
            "\\end{aligned}\n"
            "$$"
        )
        expected = (
            '<math display="block">'
            "<semantics><mrow><mrow><mi>a</mi><mo>=</mo><mi>b</mi><mo>+</mo><mi>c</mi>"
            '<mspace linebreak="newline" /><mi>$</mi><mn>5</mn><mo>=</mo><mi>d</mi><mo>+</mo><mi>e</mi></mrow></mrow>'
            '<annotation encoding="application/x-tex">\n\\begin{aligned}\na = b + c \\\\\n$5 = d + e\n\\end{aligned}\n</annotation></semantics>'
            "</math>"
        )

        self._assert_conversion(markdown_text, expected)

    def test_inline_math_with_dollar_inside(self):
        """
        Ensure a $$ … $$ inline that contains an internal '$' (e.g. inside
        \\text{}) is parsed correctly. With the old BLOCK_PATTERN the first '$'
        prematurely terminates the match so the delimiters remain.
        """
        markdown_text = "Test this $$\\text{Cost = 1.00 $USD$}$$"
        expected = (
            "<p>Test this "
            '<math display="inline">'
            "<semantics><mrow><mtext>Cost = 1.00 $USD$</mtext></mrow>"
            '<annotation encoding="application/x-tex">\\text{Cost = 1.00 $USD$}</annotation></semantics>'
            "</math></p>\n"
        )

        self._assert_conversion(markdown_text, expected)

    def test_multiple_math_expressions(self):
        """Test multiple math expressions in one document"""

        markdown_text = "First: $$a + b$$, then $$c \\times d$$, finally $$e^f$$."
        expected = (
            "<p>First: "
            '<math display="inline"><semantics><mrow><mi>a</mi><mo>+</mo><mi>b</mi></mrow>'
            '<annotation encoding="application/x-tex">a + b</annotation></semantics></math>'
            ", then "
            '<math display="inline"><semantics><mrow><mi>c</mi><mi>×</mi><mi>d</mi></mrow>'
            '<annotation encoding="application/x-tex">c \\times d</annotation></semantics></math>'
            ", finally "
            '<math display="inline"><semantics><mrow><msup><mi>e</mi><mi>f</mi></msup></mrow>'
            '<annotation encoding="application/x-tex">e^f</annotation></semantics></math>'
            ".</p>\n"
        )

        self._assert_conversion(markdown_text, expected)

    def test_mixed_inline_and_block(self):
        """Test document with both inline and block math"""

        markdown_text = (
            "This is inline math: $$a = b$$\n\n"
            "And this is block math:\n\n"
            "$$\\sum_{i=1}^{n} x_i = y$$\n\n"
            "Back to text with more inline: $$z^2$$"
        )
        expected = (
            "<p>This is inline math: "
            '<math display="inline"><semantics><mrow><mi>a</mi><mo>=</mo><mi>b</mi></mrow>'
            '<annotation encoding="application/x-tex">a = b</annotation></semantics></math>'
            "</p>\n"
            "<p>And this is block math:</p>\n"
            '<math display="block">'
            "<semantics><mrow><munderover><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mrow>"
            "<mi>n</mi></mrow></munderover><msub><mi>x</mi><mi>i</mi></msub><mo>=</mo><mi>y</mi></mrow>"
            '<annotation encoding="application/x-tex">\sum_{i=1}^{n} x_i = y</annotation></semantics>'  # noqa W605
            "</math>"
            "<p>Back to text with more inline: "
            '<math display="inline"><semantics><mrow><msup><mi>z</mi><mn>2</mn></msup></mrow>'
            '<annotation encoding="application/x-tex">z^2</annotation></semantics></math>'
            "</p>\n"
        )

        self._assert_conversion(markdown_text, expected)

    def test_block_sum_uses_munderover(self):
        """Block-mode \\sum with sub+superscript must use <munderover>, not <msubsup>"""

        markdown_text = "$$\\sum_{i=1}^{n} x_i$$"
        expected = (
            '<math display="block">'
            "<semantics><mrow><munderover><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mrow>"
            "<mi>n</mi></mrow></munderover><msub><mi>x</mi><mi>i</mi></msub></mrow>"
            '<annotation encoding="application/x-tex">\\sum_{i=1}^{n} x_i</annotation></semantics>'
            "</math>"
        )

        self._assert_conversion(markdown_text, expected)

    def test_inline_sum_uses_msubsup(self):
        """Inline-mode \\sum with sub+superscript must use <msubsup>, not <munderover>"""

        markdown_text = "The sum $$\\sum_{i=1}^{n} x_i$$ is finite."
        expected = (
            "<p>The sum "
            '<math display="inline"><semantics><mrow><msubsup><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mrow>'
            "<mi>n</mi></mrow></msubsup><msub><mi>x</mi><mi>i</mi></msub></mrow>"
            '<annotation encoding="application/x-tex">\\sum_{i=1}^{n} x_i</annotation></semantics></math>'
            " is finite.</p>\n"
        )

        self._assert_conversion(markdown_text, expected)

    def test_block_prod_uses_munderover(self):
        """Block-mode \\prod with sub+superscript must use <munderover>"""

        markdown_text = "$$\\prod_{k=0}^{n} a_k$$"
        expected = (
            '<math display="block">'
            "<semantics><mrow><munderover><mo>∏</mo><mrow><mi>k</mi><mo>=</mo><mn>0</mn></mrow><mrow>"
            "<mi>n</mi></mrow></munderover><msub><mi>a</mi><mi>k</mi></msub></mrow>"
            '<annotation encoding="application/x-tex">\\prod_{k=0}^{n} a_k</annotation></semantics>'
            "</math>"
        )

        self._assert_conversion(markdown_text, expected)

    def test_block_int_unaffected(self):
        """Block-mode \\int should still use <msubsup> (not affected by munderover fix)"""

        markdown_text = "$$\\int_{a}^{b} f(x) dx$$"
        expected = (
            '<math display="block">'
            "<semantics><mrow><msubsup><mo>∫</mo><mrow><mi>a</mi></mrow><mrow>"
            '<mi>b</mi></mrow></msubsup><mi>f</mi><mo stretchy="false">(</mo><mi>x</mi><mo stretchy="false">)</mo><mi>d</mi><mi>x</mi></mrow>'
            '<annotation encoding="application/x-tex">\\int_{a}^{b} f(x) dx</annotation></semantics>'
            "</math>"
        )

        self._assert_conversion(markdown_text, expected)

    def test_no_math_content(self):
        """Test that regular markdown without math still works"""

        markdown_text = "This is just *regular* markdown with **bold** text."
        expected = "<p>This is just <em>regular</em> markdown with <strong>bold</strong> text.</p>\n"

        self._assert_conversion(markdown_text, expected)

    def test_simple_inline_math(self):
        """Test simple inline math expression"""

        markdown_text = "The variable $$x$$ is unknown."
        expected = (
            "<p>The variable "
            '<math display="inline"><semantics><mrow><mi>x</mi></mrow>'
            '<annotation encoding="application/x-tex">x</annotation></semantics></math>'
            " is unknown.</p>\n"
        )

        self._assert_conversion(markdown_text, expected)

    def test_simple_block_math(self):
        """Test simple block math expression"""

        markdown_text = "$$y = mx + b$$"
        expected = (
            '<math display="block">'
            "<semantics><mrow><mi>y</mi><mo>=</mo><mi>m</mi><mi>x</mi><mo>+</mo><mi>b</mi></mrow>"
            '<annotation encoding="application/x-tex">y = mx + b</annotation></semantics>'
            "</math>"
        )

        self._assert_conversion(markdown_text, expected)

    def test_mo_accented(self):
        """Regression test for missed experimental property on mo tags"""

        markdown_text = "$$a_b+\\overrightarrow{abc}+\\overleftarrow{abc}\\div\\surd\\overline{abc}$$"
        expected = (
            '<math display="block">'
            "<semantics><mrow><msub><mi>a</mi><mi>b</mi></msub><mo>+</mo><mover><mrow><mi>a</mi><mi>b</mi><mi>c</mi></mrow><mo>→</mo></mover><mo>+</mo>"
            '<mover><mrow><mi>a</mi><mi>b</mi><mi>c</mi></mrow><mo>←</mo></mover><mi>÷</mi><mo stretchy="false">√</mo><mover><mrow><mi>a</mi><mi>b</mi>'
            '<mi>c</mi></mrow><mo accent="true">―</mo></mover></mrow>'
            '<annotation encoding="application/x-tex">a_b+\\overrightarrow{abc}+\\overleftarrow{abc}\\div\\surd\\overline{abc}</annotation></semantics>'
            "</math>"
        )

        self._assert_conversion(markdown_text, expected)


class TestTexMathPlugin(TexMathTestMixin, unittest.TestCase):
    """Test direct markdown conversion: markdown → HTML+MathML"""

    def _assert_conversion(self, markdown_text: str, expected: str):
        """Test direct markdown to HTML+MathML conversion"""
        result = render_markdown(markdown_text)
        self.assertEqual(result, expected)


class TestTexMathPluginRoundtrip(TexMathTestMixin, unittest.TestCase):
    """Test full roundtrip: markdown → HTML+MathML → Pydantic → string"""

    maxDiff = None

    def _assert_conversion(self, markdown_text: str, expected: str):
        """Test full roundtrip conversion via Pydantic objects"""
        result = render_markdown(markdown_text)

        # Parse to Pydantic objects and back to string
        parsed = ElementTreeBase.from_string(result)
        roundtrip_result = (
            "".join(e.to_xml_string().strip() for e in parsed)
            if isinstance(parsed, list)
            else parsed.to_xml_string().strip()
        )
        self.assertEqual(
            roundtrip_result.replace("\n", "").strip(),
            expected.replace("\n", "").strip(),
        )


class SizedImageTests(unittest.TestCase):
    """Perseus images, whose size and alignment suffixes are not valid CommonMark."""

    def test_size_suffix_becomes_width_and_height(self):
        self.assertEqual(
            render_markdown("![Test](83ab37e959e03fec7be3e1bf834cb169.jpg =550x364)"),
            '<p><img src="83ab37e959e03fec7be3e1bf834cb169.jpg" alt="Test"'
            ' width="550" height="364" /></p>\n',
        )

    def test_image_without_alt_text(self):
        self.assertEqual(
            render_markdown("![](cs.png =12x34)"),
            '<p><img src="cs.png" alt="" width="12" height="34" /></p>\n',
        )

    def test_align_suffix_is_consumed_but_dropped(self):
        # Consumed so the image parses at all; dropped because QTI's Img has no
        # attribute to carry it.
        self.assertEqual(
            render_markdown("![a](cs.png align=center)"),
            '<p><img src="cs.png" alt="a" /></p>\n',
        )

    def test_size_and_align_together(self):
        self.assertEqual(
            render_markdown("![a](cs.png =12x34 align=right)"),
            '<p><img src="cs.png" alt="a" width="12" height="34" /></p>\n',
        )

    def test_fractional_size_is_rounded(self):
        self.assertEqual(
            render_markdown("![a](cs.png =229.5x287.2)"),
            '<p><img src="cs.png" alt="a" width="230" height="287" /></p>\n',
        )

    def test_src_is_reduced_to_the_bare_filename(self):
        self.assertEqual(
            render_markdown("![a](images/cs.png =12x34)"),
            '<p><img src="cs.png" alt="a" width="12" height="34" /></p>\n',
        )

    def test_image_keeps_its_surrounding_text(self):
        self.assertEqual(
            render_markdown("before ![a](cs.png =1x2) after"),
            '<p>before <img src="cs.png" alt="a" width="1" height="2" /> after</p>\n',
        )

    def test_alt_text_is_escaped(self):
        self.assertEqual(
            render_markdown('![<script>"](cs.png =1x2)'),
            '<p><img src="cs.png" alt="&lt;script&gt;&quot;"'
            ' width="1" height="2" /></p>\n',
        )

    def test_suffixless_image_still_goes_through_the_builtin_rule(self):
        self.assertEqual(
            render_markdown("![a](cs.png)"), '<p><img src="cs.png" alt="a" /></p>\n'
        )

    def test_sized_image_survives_the_model_layer(self):
        # The converter builds its item body by parsing this HTML into the QTI
        # models, which take an integer width and reject an absolute src.
        paragraph = ElementTreeBase.from_string(
            render_markdown("![a](cs.png =229.5x287 align=center)")
        )[0]
        img = paragraph.children[0]
        self.assertEqual(img.src, "cs.png")
        self.assertEqual(img.alt, "a")
        self.assertEqual((img.width, img.height), (230, 287))
