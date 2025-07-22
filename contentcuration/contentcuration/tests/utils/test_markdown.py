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
            "<semantics><mrow><msubsup><mo>∑</mo><mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow><mrow>"
            "<mi>n</mi></mrow></msubsup><msub><mi>x</mi><mi>i</mi></msub><mo>=</mo><mi>y</mi></mrow>"
            '<annotation encoding="application/x-tex">\sum_{i=1}^{n} x_i = y</annotation></semantics>'  # noqa W605
            "</math>"
            "<p>Back to text with more inline: "
            '<math display="inline"><semantics><mrow><msup><mi>z</mi><mn>2</mn></msup></mrow>'
            '<annotation encoding="application/x-tex">z^2</annotation></semantics></math>'
            "</p>\n"
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
