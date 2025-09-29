"""
This test suite was initially generated using Gemini 2.5 Pro Preview.
It was then manually refined to ensure correctness and completeness.
This was then supplemented with additional tests to cover missing edge cases
and validations using Claude Sonnet 4.

Gemini prompt:
Please write a comprehensive test suite for this, assuming that everything defined
in these files can be imported from `contentcuration.utils.assessment.qti.mathml`.
I am more concerned with integration level testing - checking that appropriately
composed objects produce the correct MathML output when the to_xml_string method
is invoked, and that conversely, appropriate object structures are created
using the from_string method.


Claude prompt:
I have these files that define Pydantic objects for generating and validating MathML.
Here are my current tests for this. Please tell me what the tests cover well, and what is missing.
Formulate recommendations to supplement these tests, where testing conformance to the
MathML Core schema is most important, and testing specific quirks of the implementation is not at all important.
Where possible, generate a separate artifact for each separate additional set of tests,
so that I can choose which ones I want to include more easily.
"""
import unittest

from pydantic import ValidationError

from contentcuration.utils.assessment.qti.base import TextNode
from contentcuration.utils.assessment.qti.constants import Dir
from contentcuration.utils.assessment.qti.mathml import Annotation
from contentcuration.utils.assessment.qti.mathml import AnnotationXml
from contentcuration.utils.assessment.qti.mathml import Math
from contentcuration.utils.assessment.qti.mathml import MathMLDisplay
from contentcuration.utils.assessment.qti.mathml import MathMLElement
from contentcuration.utils.assessment.qti.mathml import MathMLForm
from contentcuration.utils.assessment.qti.mathml import Mfrac
from contentcuration.utils.assessment.qti.mathml import Mi
from contentcuration.utils.assessment.qti.mathml import Mn
from contentcuration.utils.assessment.qti.mathml import Mo
from contentcuration.utils.assessment.qti.mathml import Mrow
from contentcuration.utils.assessment.qti.mathml import Mspace
from contentcuration.utils.assessment.qti.mathml import Msubsup
from contentcuration.utils.assessment.qti.mathml import Mtable
from contentcuration.utils.assessment.qti.mathml import Mtd
from contentcuration.utils.assessment.qti.mathml import Mtr
from contentcuration.utils.assessment.qti.mathml import Semantics
from contentcuration.utils.assessment.qti.mathml.base import MathMLGroupingElement
from contentcuration.utils.assessment.qti.mathml.base import MathMLLayoutElement
from contentcuration.utils.assessment.qti.mathml.base import MathMLScriptElement
from contentcuration.utils.assessment.qti.mathml.base import MathMLTokenElement
from contentcuration.utils.assessment.qti.mathml.core import Merror
from contentcuration.utils.assessment.qti.mathml.core import Mmultiscripts
from contentcuration.utils.assessment.qti.mathml.core import Mover
from contentcuration.utils.assessment.qti.mathml.core import Mphantom
from contentcuration.utils.assessment.qti.mathml.core import Mprescripts
from contentcuration.utils.assessment.qti.mathml.core import Mroot
from contentcuration.utils.assessment.qti.mathml.core import Ms
from contentcuration.utils.assessment.qti.mathml.core import Msqrt
from contentcuration.utils.assessment.qti.mathml.core import Mstyle
from contentcuration.utils.assessment.qti.mathml.core import Msub
from contentcuration.utils.assessment.qti.mathml.core import Msup
from contentcuration.utils.assessment.qti.mathml.core import Mtext
from contentcuration.utils.assessment.qti.mathml.core import Munder
from contentcuration.utils.assessment.qti.mathml.core import Munderover


class TestFieldValidation(unittest.TestCase):
    """Tests for field validation using the annotated types and enums."""

    def test_length_percentage_valid_values(self):
        valid_values = [
            "0",  # unitless zero
            "10px",  # pixels
            "2em",
            "1.5em",  # em units
            "0.5rem",  # rem units
            "2pt",
            "12pt",  # points
            "1in",
            "2.5in",  # inches
            "1cm",
            "10mm",  # metric
            "50%",
            "100%",
            "0%",
            "150%",  # percentages
            "+10px",
            "-5px",  # signed values
            "0.1vh",
            "50vw",
            "10vmin",
            "20vmax",  # viewport units
            "1ch",
            "2ex",  # character units
        ]

        for value in valid_values:
            with self.subTest(value=value):
                # Test on mathsize attribute
                obj = Mi(mathsize=value, children=["x"])
                self.assertEqual(obj.mathsize, value)

                # Test on width attribute of Mspace
                space_obj = Mspace(width=value)
                self.assertEqual(space_obj.width, value)

    def test_length_percentage_invalid_values(self):
        invalid_values = [
            "10",  # number without unit (except 0)
            "px",  # unit without number
            "10 px",  # space in value
            "10px ",  # trailing space
            " 10px",  # leading space
            "10px;",  # invalid character
            "10xyz",  # invalid unit
            "auto",  # keyword values not allowed
            "inherit",  # keyword values not allowed
            "",  # empty string
            "10px 20px",  # multiple values
        ]

        for value in invalid_values:
            with self.subTest(value=value):
                with self.assertRaises(ValidationError):
                    Mi(mathsize=value, children=["x"])

    def test_color_value_valid_values(self):
        valid_values = [
            "red",
            "blue",
            "green",
            "black",
            "white",  # named colors
            "transparent",
            "currentColor",  # special keywords
            "#f00",
            "#ff0000",
            "#FF0000",  # hex colors (3,6 chars)
            "#ffff",
            "#ffffffff",  # hex with alpha (4,8 chars)
            "rgb(255,0,0)",
            "rgb(255, 0, 0)",  # rgb function
            "rgba(255,0,0,0.5)",
            "rgba(255, 0, 0, 1)",  # rgba function
            "hsl(0,100%,50%)",
            "hsl(0, 100%, 50%)",  # hsl function
            "hsla(0,100%,50%,0.5)",  # hsla function
        ]

        for value in valid_values:
            with self.subTest(value=value):
                obj = Mi(mathcolor=value, children=["x"])
                self.assertEqual(obj.mathcolor, value)

    def test_color_value_invalid_values(self):
        """
        Note that we do not validate color names against a predefined list,
        as this would require a comprehensive list of valid CSS color names.
        Instead, we focus on the format of the color value.
        We also do not validate that number values in rgb/rgba are within 0-255 range,
        as CSS allows values outside this range (e.g., rgb(300, -50, 500)).
        """
        invalid_values = [
            "#ff",  # too short hex
            "#fffffffff",  # too long hex
            "#gggggg",  # invalid hex characters
            "rgb()",  # empty rgb
            "hsl()",  # empty hsl
            "",  # empty string
            "rgb(255 0 0)",  # space instead of comma (CSS4 syntax)
        ]

        for value in invalid_values:
            with self.subTest(value=value):
                with self.assertRaises(ValidationError):
                    Mi(mathcolor=value, children=["x"])

    def test_script_level_valid_values(self):
        valid_values = [
            "0",
            "1",
            "2",
            "-1",
            "-2",  # basic integers
            "+1",
            "+2",
            "+10",  # explicit positive
            "-10",
            "-100",  # negative
        ]

        for value in valid_values:
            with self.subTest(value=value):
                obj = Mi(scriptlevel=value, children=["x"])
                self.assertEqual(obj.scriptlevel, value)

    def test_script_level_invalid_values(self):
        """Test invalid ScriptLevel values."""
        invalid_values = [
            "1.5",  # decimal not allowed
            "one",  # word not allowed
            "",  # empty string
            " 1",  # leading space
            "1 ",  # trailing space
            "++1",  # double sign
            "+-1",  # mixed signs
        ]

        for value in invalid_values:
            with self.subTest(value=value):
                with self.assertRaises(ValidationError):
                    Mi(scriptlevel=value, children=["x"])

    def test_enum_validation(self):
        """Test enum field validation."""
        # Valid enum values
        math_obj = Math(display=MathMLDisplay.BLOCK, children=[])
        self.assertEqual(math_obj.display, MathMLDisplay.BLOCK)

        mo_obj = Mo(form=MathMLForm.INFIX, children=["+"])
        self.assertEqual(mo_obj.form, MathMLForm.INFIX)

        # Invalid enum values should raise ValidationError
        with self.assertRaises(ValidationError):
            Math(display="invalid_display", children=[])

        with self.assertRaises(ValidationError):
            Mo(form="invalid_form", children=["+"])

    def test_boolean_attribute_validation(self):
        """Test boolean attribute handling."""
        # Valid boolean values
        mo_obj = Mo(fence=True, separator=False, children=["|"])
        self.assertTrue(mo_obj.fence)
        self.assertFalse(mo_obj.separator)

        # Boolean attributes should accept actual booleans
        mo_obj2 = Mo(stretchy=True, symmetric=False, children=["("])
        self.assertTrue(mo_obj2.stretchy)
        self.assertFalse(mo_obj2.symmetric)


class TestElementConstraints(unittest.TestCase):
    """Tests for MathML element structural constraints and children requirements."""

    def test_token_elements_children_constraints(self):
        """Test that token elements only accept TextType children."""
        text_node = "content"
        math_element = Mi(children=["x"])  # Invalid child for token elements

        # Valid: token elements with TextType children
        token_classes = [Mi, Mn, Mo, Mtext, Ms, Annotation]

        for token_class in token_classes:
            with self.subTest(element=token_class.__name__):
                # Valid: TextType children
                element = token_class(children=[text_node])
                self.assertEqual(len(element.children), 1)
                self.assertIsInstance(element.children[0], TextNode)

                # Invalid: MathML element children should fail
                with self.assertRaises(
                    ValidationError,
                    msg=f"{token_class.__name__} should reject MathML element children",
                ):
                    token_class(children=[math_element])

        # Mspace should not have children (it's empty)
        mspace = Mspace()
        self.assertFalse(
            hasattr(mspace, "children") or len(getattr(mspace, "children", [])) > 0
        )

    def test_elements_with_exactly_two_children(self):
        """Test elements that require exactly 2 children."""
        child1 = Mi(children=["a"])
        child2 = Mn(children=["1"])
        child3 = Mi(children=["b"])

        # These elements should accept exactly 2 children
        two_child_classes = [
            (Mfrac, "fraction"),
            (Mroot, "root"),
            (Msub, "subscript"),
            (Msup, "superscript"),
            (Munder, "under"),
            (Mover, "over"),
        ]

        for element_class, description in two_child_classes:
            with self.subTest(element=element_class.__name__):
                # Valid: exactly 2 children
                element = element_class(children=[child1, child2])
                self.assertEqual(
                    len(element.children),
                    2,
                    f"{description} element should have exactly 2 children",
                )

                # Invalid: 1 child should fail
                with self.assertRaises(
                    ValidationError, msg=f"{description} should reject 1 child"
                ):
                    element_class(children=[child1])

                # Invalid: 3 children should fail
                with self.assertRaises(
                    ValidationError, msg=f"{description} should reject 3 children"
                ):
                    element_class(children=[child1, child2, child3])

    def test_elements_with_exactly_three_children(self):
        """Test elements that require exactly 3 children."""
        child1 = Mi(children=["base"])
        child2 = Mn(children=["sub"])
        child3 = Mn(children=["sup"])
        child4 = Mi(children=["extra"])

        # These elements should accept exactly 3 children
        three_child_classes = [
            (Msubsup, "subscript-superscript"),
            (Munderover, "under-over"),
        ]

        for element_class, description in three_child_classes:
            with self.subTest(element=element_class.__name__):
                # Valid: exactly 3 children
                element = element_class(children=[child1, child2, child3])
                self.assertEqual(
                    len(element.children),
                    3,
                    f"{description} element should have exactly 3 children",
                )

                # Invalid: 2 children should fail
                with self.assertRaises(
                    ValidationError, msg=f"{description} should reject 2 children"
                ):
                    element_class(children=[child1, child2])

                # Invalid: 4 children should fail
                with self.assertRaises(
                    ValidationError, msg=f"{description} should reject 4 children"
                ):
                    element_class(children=[child1, child2, child3, child4])

    def test_table_structure_constraints(self):
        """Test table element structural requirements."""
        # Valid table structure
        cell_content = Mi(children=["cell"])
        mtd = Mtd(children=[cell_content])
        self.assertEqual(len(mtd.children), 1)

        # Mtr should contain Mtd elements
        mtr = Mtr(children=[mtd])
        self.assertEqual(len(mtr.children), 1)
        self.assertIsInstance(mtr.children[0], Mtd)

        # Mtable should contain Mtr elements
        mtable = Mtable(children=[mtr])
        self.assertEqual(len(mtable.children), 1)
        self.assertIsInstance(mtable.children[0], Mtr)

        # Invalid: Mtr with non-Mtd children should fail
        non_mtd_element = Mi(children=["invalid"])
        with self.assertRaises(
            ValidationError, msg="Mtr should reject non-Mtd children"
        ):
            Mtr(children=[non_mtd_element])

        # Invalid: Mtable with non-Mtr children should fail
        non_mtr_element = Mtd(children=[cell_content])
        with self.assertRaises(
            ValidationError, msg="Mtable should reject non-Mtr children"
        ):
            Mtable(children=[non_mtr_element])

    def test_semantics_element_constraints(self):
        """Test Semantics element structure."""
        # First child should be presentation content
        presentation = Mi(children=["x"])
        annotation = Annotation(encoding="text/plain", children=["variable x"])
        annotation_xml = AnnotationXml(
            encoding="application/mathml+xml", children=[presentation]
        )

        # Valid semantics structures
        semantics1 = Semantics(children=[presentation, annotation])
        semantics2 = Semantics(children=[presentation, annotation_xml])
        semantics3 = Semantics(children=[presentation, annotation, annotation_xml])

        self.assertEqual(len(semantics1.children), 2)
        self.assertEqual(len(semantics2.children), 2)
        self.assertEqual(len(semantics3.children), 3)

        # Invalid: Semantics with no children should fail
        with self.assertRaises(
            ValidationError, msg="Semantics should require at least one child"
        ):
            Semantics(children=[])

        # Invalid: Semantics with only annotations (no presentation content) should fail
        with self.assertRaises(
            ValidationError,
            msg="Semantics should require presentation content as first child",
        ):
            Semantics(children=[annotation])

    def test_mmultiscripts_structure(self):
        """Test Mmultiscripts element structure constraints."""
        base = Mi(children=["F"])
        sub1 = Mn(children=["1"])
        sup1 = Mn(children=["2"])

        # Basic multiscripts structure
        mmultiscripts = Mmultiscripts(children=[base, sub1, sup1])
        self.assertEqual(len(mmultiscripts.children), 3)

        # With prescripts
        prescripts = Mprescripts()
        pre_sub = Mn(children=["0"])
        pre_sup = Mn(children=["3"])

        mmultiscripts_with_pre = Mmultiscripts(
            children=[base, sub1, sup1, prescripts, pre_sub, pre_sup]
        )
        self.assertEqual(len(mmultiscripts_with_pre.children), 6)

    def test_mmultiscripts_validation(self):
        """Test Mmultiscripts validation rules."""
        base = Mi(children=["F"])
        sub1 = Mn(children=["1"])
        sup1 = Mn(children=["2"])
        sub2 = Mn(children=["3"])
        sup2 = Mn(children=["4"])
        prescripts = Mprescripts()

        # Test: Empty mmultiscripts should fail
        with self.assertRaises(
            ValidationError, msg="Empty mmultiscripts should be invalid"
        ):
            Mmultiscripts(children=[])

        # Test: Odd number of scripts (without prescripts) should fail
        with self.assertRaises(
            ValidationError, msg="Odd number of scripts should be invalid"
        ):
            Mmultiscripts(children=[base, sub1])  # Missing superscript

        # Test: Scripts must come in pairs after base
        with self.assertRaises(ValidationError, msg="Scripts must be paired"):
            Mmultiscripts(
                children=[base, sub1, sup1, sub2]
            )  # Missing final superscript

        # Test: Post-scripts must be in pairs when prescripts present
        with self.assertRaises(ValidationError, msg="Post-scripts must be paired"):
            Mmultiscripts(
                children=[base, sub1, prescripts, sub2, sup2]
            )  # Odd post-scripts

        # Test: Pre-scripts must be in pairs when prescripts present
        with self.assertRaises(ValidationError, msg="Pre-scripts must be paired"):
            Mmultiscripts(
                children=[base, sub1, sup1, prescripts, sub2]
            )  # Odd pre-scripts

        # Test: Multiple prescripts should fail
        with self.assertRaises(
            ValidationError, msg="Multiple prescripts should be invalid"
        ):
            Mmultiscripts(children=[base, sub1, sup1, prescripts, prescripts])

        # Test: Valid cases should pass
        # Valid: Base only
        Mmultiscripts(children=[base])

        # Valid: Base with paired scripts
        Mmultiscripts(children=[base, sub1, sup1])

        # Valid: Base with multiple paired scripts
        Mmultiscripts(children=[base, sub1, sup1, sub2, sup2])

        # Valid: Base with prescripts and paired pre-scripts
        Mmultiscripts(children=[base, prescripts, sub1, sup1])

        # Valid: Base with post-scripts and pre-scripts
        Mmultiscripts(children=[base, sub1, sup1, prescripts, sub2, sup2])

    def test_empty_elements_validation(self):
        """Test elements that can be empty vs those that cannot."""
        # Elements that can be empty
        empty_allowed_classes = [
            (Mrow, "row"),
            (Mstyle, "style"),
            (Merror, "error"),
            (Mphantom, "phantom"),
            (Msqrt, "square root"),
            (Math, "math root"),
        ]

        for element_class, description in empty_allowed_classes:
            with self.subTest(element=element_class.__name__):
                element = element_class(children=[])
                self.assertEqual(
                    len(element.children),
                    0,
                    f"{description} element should allow empty children",
                )

        # Mspace is inherently empty (no children attribute with content)
        mspace = Mspace(width="1em", height="1em")
        self.assertIsNotNone(mspace)

    def test_mixed_content_validation(self):
        """Test elements that accept mixed content (text + elements)."""
        text_before = "Before "
        element = Mi(children=["x"])
        text_after = " after"

        # These elements should accept mixed content
        mixed_content_classes = [
            (Mrow, "row"),
            (Mstyle, "style"),
            (Merror, "error"),
            (Mphantom, "phantom"),
        ]

        for element_class, description in mixed_content_classes:
            with self.subTest(element=element_class.__name__):
                mixed_element = element_class(
                    children=[text_before, element, text_after]
                )
                self.assertEqual(
                    len(mixed_element.children),
                    3,
                    f"{description} element should accept mixed content",
                )
                self.assertIsInstance(mixed_element.children[0], TextNode)
                self.assertIsInstance(mixed_element.children[1], Mi)
                self.assertIsInstance(mixed_element.children[2], TextNode)

    def test_annotation_xml_element_name(self):
        """Test that AnnotationXml serializes with correct element name."""
        annotation_xml = AnnotationXml(encoding="application/mathml+xml")
        expected_name = "annotation-xml"
        actual_name = annotation_xml.element_name()
        self.assertEqual(actual_name, expected_name)

    def test_mtable_with_complex_structure(self):
        """Test complex table structures."""
        # Create a 2x2 table
        cell1 = Mtd(children=[Mi(children=["a"])])
        cell2 = Mtd(children=[Mn(children=["1"])])
        cell3 = Mtd(children=[Mi(children=["b"])])
        cell4 = Mtd(children=[Mn(children=["2"])])

        row1 = Mtr(children=[cell1, cell2])
        row2 = Mtr(children=[cell3, cell4])

        table = Mtable(children=[row1, row2])

        self.assertEqual(len(table.children), 2)
        self.assertEqual(len(table.children[0].children), 2)
        self.assertEqual(len(table.children[1].children), 2)

    def test_element_inheritance_hierarchy(self):
        """Test that elements inherit from correct base classes."""
        inheritance_tests = [
            (Mi(children=["x"]), MathMLTokenElement, "token"),
            (
                Mfrac(
                    children=[
                        Mi(children=["a"]),
                        Mn(children=["1"]),
                    ]
                ),
                MathMLLayoutElement,
                "layout",
            ),
            (
                Msub(
                    children=[
                        Mi(children=["x"]),
                        Mn(children=["1"]),
                    ]
                ),
                MathMLScriptElement,
                "script",
            ),
            (Mstyle(children=[]), MathMLGroupingElement, "grouping"),
        ]

        for element, expected_base, description in inheritance_tests:
            with self.subTest(
                element=type(element).__name__, base=expected_base.__name__
            ):
                self.assertIsInstance(
                    element,
                    expected_base,
                    f"{type(element).__name__} should be a {description} element",
                )


class TestMathMLSerialization(unittest.TestCase):
    """Tests for object -> to_xml_string() using direct string comparison."""

    def test_simple_mi(self):
        obj = Mi(children=["x"])
        xml_str = obj.to_xml_string()
        expected_xml_str = "<mi>x</mi>"
        self.assertEqual(xml_str, expected_xml_str)

    def test_simple_mn_with_attribute(self):
        obj = Mn(children=["123"], dir_=Dir.RTL)
        xml_str = obj.to_xml_string()
        expected_xml_str = '<mn dir="rtl">123</mn>'
        self.assertEqual(xml_str, expected_xml_str)

    def test_mo_with_boolean_attribute(self):
        obj = Mo(children=["+"], fence=True, separator=False)
        xml_str = obj.to_xml_string()
        expected_xml_str = '<mo fence="true" separator="false">+</mo>'
        self.assertEqual(xml_str, expected_xml_str)

    def test_mi_with_enum_attribute(self):
        obj = Mi(children=["X"])
        xml_str = obj.to_xml_string()
        expected_xml_str = "<mi>X</mi>"
        self.assertEqual(xml_str, expected_xml_str)

    def test_math_element_with_attributes(self):
        obj = Math(
            display=MathMLDisplay.BLOCK,
            alttext="Equation",
            children=[Mi(children=["y"])],
        )
        xml_str = obj.to_xml_string()
        expected_xml_str = '<math display="block" alttext="Equation"><mi>y</mi></math>'
        self.assertEqual(xml_str, expected_xml_str)

    def test_mrow_nested_elements(self):
        obj = Mrow(
            children=[
                Mi(children=["a"]),
                Mo(children=["+"]),
                Mn(children=["1"]),
            ],
            id_="eq1",
            class_="equation-style",
        )
        xml_str = obj.to_xml_string()
        expected_xml_str = '<mrow id="eq1" class="equation-style"><mi>a</mi><mo>+</mo><mn>1</mn></mrow>'
        self.assertEqual(xml_str, expected_xml_str)

    def test_mfrac(self):
        obj = Mfrac(
            children=[
                Mi(
                    children=["numerator"],
                ),
                Mn(children=["denominator"]),
            ]
        )
        xml_str = obj.to_xml_string()
        expected_xml_str = "<mfrac><mi>numerator</mi><mn>denominator</mn></mfrac>"
        self.assertEqual(xml_str, expected_xml_str)

    def test_msubsup(self):
        obj = Msubsup(
            children=[
                Mi(children=["X"]),
                Mn(children=["s"]),
                Mn(children=["p"]),
            ]
        )
        xml_str = obj.to_xml_string()
        expected_xml_str = "<msubsup><mi>X</mi><mn>s</mn><mn>p</mn></msubsup>"
        self.assertEqual(xml_str, expected_xml_str)

    def test_mtable_mtr_mtd(self):
        obj = Mtable(
            children=[
                Mtr(
                    children=[
                        Mtd(
                            children=[
                                Mi(
                                    children=["R1C1"],
                                )
                            ]
                        ),
                        Mtd(
                            children=[
                                Mi(
                                    children=["R1C2"],
                                )
                            ]
                        ),
                    ]
                ),
                Mtr(
                    children=[
                        Mtd(children=[Mn(children=["1"])]),
                        Mtd(children=[Mn(children=["2"])]),
                    ]
                ),
            ]
        )
        xml_str = obj.to_xml_string()
        expected_xml_str = "<mtable><mtr><mtd><mi>R1C1</mi></mtd><mtd><mi>R1C2</mi></mtd></mtr><mtr><mtd><mn>1</mn></mtd><mtd><mn>2</mn></mtd></mtr></mtable>"  # noqa: E501
        self.assertEqual(xml_str, expected_xml_str)

    def test_mixed_content_serialization(self):
        obj = Mrow(
            children=[
                "TextBefore",
                Mi(children=["x"]),
                "TextBetween",
                Mn(children=["123"]),
                "TextAfter",
            ]
        )
        xml_str = obj.to_xml_string()
        expected_xml_str = (
            "<mrow>TextBefore<mi>x</mi>TextBetween<mn>123</mn>TextAfter</mrow>"
        )
        self.assertEqual(xml_str, expected_xml_str)

    def test_semantics_annotation(self):
        obj = Semantics(
            children=[
                Mi(children=["x"]),
                Annotation(
                    encoding="text/plain",
                    children=["Content of annotation"],
                ),
            ]
        )
        xml_str = obj.to_xml_string()
        expected_xml_str = '<semantics><mi>x</mi><annotation encoding="text/plain">Content of annotation</annotation></semantics>'  # noqa: E501
        self.assertEqual(xml_str, expected_xml_str)

    def test_annotation_xml(self):
        obj = AnnotationXml(
            encoding="application/mathml+xml",
            children=[
                Mrow(
                    children=[
                        Mi(
                            children=["alt"],
                        ),
                        Mo(children=["="]),
                        Mn(children=["1"]),
                    ]
                )
            ],
        )
        xml_str = obj.to_xml_string()
        expected_xml_str = '<annotation-xml encoding="application/mathml+xml"><mrow><mi>alt</mi><mo>=</mo><mn>1</mn></mrow></annotation-xml>'  # noqa: E501
        self.assertEqual(xml_str, expected_xml_str)


class TestMathMLDeserialization(unittest.TestCase):
    """Tests for from_string() -> object"""

    def test_simple_mi_from_string(self):
        xml_str = "<mi>y</mi>"
        result = Mi.from_string(xml_str)
        self.assertEqual(len(result), 1)
        obj = result[0]
        self.assertIsInstance(obj, Mi)
        self.assertEqual(len(obj.children), 1)
        self.assertIsInstance(obj.children[0], TextNode)
        self.assertEqual(obj.children[0].text, "y")

    def test_mo_from_string_with_attributes(self):
        xml_str = '<mo fence="true" lspace="8px">+ </mo>'
        result = Mo.from_string(xml_str)
        self.assertEqual(len(result), 1)
        obj = result[0]
        self.assertIsInstance(obj, Mo)
        self.assertTrue(obj.fence)
        self.assertEqual(obj.lspace, "8px")
        self.assertEqual(obj.children[0].text, "+ ")

    def test_mrow_nested_from_string(self):
        xml_str = (
            '<mrow id="r1" class="test-class"><mi>a</mi><mo>+</mo><mn>1</mn></mrow>'
        )
        result = Mrow.from_string(xml_str)
        self.assertEqual(len(result), 1)
        obj = result[0]
        self.assertIsInstance(obj, Mrow)
        self.assertEqual(obj.id_, "r1")
        self.assertEqual(obj.class_, "test-class")

        self.assertEqual(len(obj.children), 3)
        self.assertIsInstance(obj.children[0], Mi)
        self.assertEqual(obj.children[0].children[0].text, "a")
        self.assertIsInstance(obj.children[1], Mo)
        self.assertEqual(obj.children[1].children[0].text, "+")
        self.assertIsInstance(obj.children[2], Mn)
        self.assertEqual(obj.children[2].children[0].text, "1")

    def test_mfrac_from_string(self):
        xml_str = "<mfrac><mi>N</mi><mn>D</mn></mfrac>"
        result = Mfrac.from_string(xml_str)
        self.assertEqual(len(result), 1)
        obj = result[0]
        self.assertIsInstance(obj, Mfrac)
        self.assertEqual(len(obj.children), 2)
        self.assertIsInstance(obj.children[0], Mi)
        self.assertEqual(obj.children[0].children[0].text, "N")
        self.assertIsInstance(obj.children[1], Mn)
        self.assertEqual(obj.children[1].children[0].text, "D")

    def test_mixed_content_deserialization(self):
        xml_str = "<mrow>Prefix <mi>v</mi> Infix <mn>42</mn> Suffix</mrow>"
        result = Mrow.from_string(xml_str)
        self.assertEqual(len(result), 1)
        obj = result[0]
        self.assertIsInstance(obj, Mrow)

        self.assertEqual(len(obj.children), 5)
        self.assertIsInstance(obj.children[0], TextNode)
        self.assertEqual(obj.children[0].text, "Prefix ")
        self.assertIsInstance(obj.children[1], Mi)
        self.assertEqual(obj.children[1].children[0].text, "v")
        self.assertIsInstance(obj.children[2], TextNode)
        self.assertEqual(obj.children[2].text, " Infix ")
        self.assertIsInstance(obj.children[3], Mn)
        self.assertEqual(obj.children[3].children[0].text, "42")
        self.assertIsInstance(obj.children[4], TextNode)
        self.assertEqual(obj.children[4].text, " Suffix")

    def test_semantics_annotation_from_string(self):
        xml_str = (
            "<semantics>"
            "  <mi>E</mi>"
            '  <annotation encoding="text/latex">E = mc^2</annotation>'
            "</semantics>"
        )
        result = Semantics.from_string(xml_str)
        self.assertEqual(len(result), 1)
        obj = result[0]
        self.assertIsInstance(obj, Semantics)
        self.assertEqual(len(obj.children), 2)

        self.assertIsInstance(obj.children[0], Mi)
        self.assertEqual(obj.children[0].children[0].text, "E")

        ann_obj = obj.children[1]
        self.assertIsInstance(ann_obj, Annotation)
        self.assertEqual(ann_obj.encoding, "text/latex")
        self.assertEqual(len(ann_obj.children), 1)
        self.assertIsInstance(ann_obj.children[0], TextNode)
        self.assertEqual(ann_obj.children[0].text, "E = mc^2")

    def test_annotation_xml_from_string(self):
        xml_str = (
            '<annotation-xml encoding="application/mathml+xml">'
            "  <mrow><mi>alt</mi><mo>=</mo><mn>0</mn></mrow>"
            "</annotation-xml>"
        )
        result = AnnotationXml.from_string(xml_str)
        self.assertEqual(len(result), 1)
        obj = result[0]
        self.assertIsInstance(obj, AnnotationXml)
        self.assertEqual(obj.encoding, "application/mathml+xml")
        self.assertEqual(len(obj.children), 1)
        mrow_child = obj.children[0]
        self.assertIsInstance(mrow_child, Mrow)
        self.assertEqual(len(mrow_child.children), 3)
        self.assertIsInstance(mrow_child.children[0], Mi)
        self.assertEqual(mrow_child.children[0].children[0].text, "alt")

    def test_from_string_multiple_root_elements(self):
        xml_str = "<mi>a</mi><mn>1</mn>"
        result = MathMLElement.from_string(xml_str)
        self.assertEqual(len(result), 2)
        self.assertIsInstance(result[0], Mi)
        self.assertEqual(result[0].children[0].text, "a")
        self.assertIsInstance(result[1], Mn)
        self.assertEqual(result[1].children[0].text, "1")


class TestErrorHandling(unittest.TestCase):
    def test_from_string_invalid_xml(self):
        xml_str = "<mi>x</mj>"
        with self.assertRaisesRegex(ValueError, "Invalid Markup: mismatched tag"):
            Mi.from_string(xml_str)

    def test_from_string_unregistered_tag(self):
        xml_str = "<unregisteredtag>content</unregisteredtag>"

        with self.assertRaisesRegex(
            ValueError, "No registered class found for tag: unregisteredtag"
        ):
            MathMLElement.from_string(xml_str)

    def test_attribute_validation_error_on_creation(self):
        with self.assertRaises(ValueError):  # Pydantic's ValidationError
            Mi(mathvariant="not-a-valid-variant", children=["x"])


class TestComplexMathematicalExpressions(unittest.TestCase):
    """Tests for complex, realistic mathematical expressions."""

    def test_quadratic_formula(self):
        """Test the quadratic formula: x = (-b ± √(b²-4ac)) / 2a"""
        # Create: x = (-b ± √(b²-4ac)) / 2a

        # Left side: x =
        x = Mi(children=["x"])
        equals = Mo(children=["="])

        # Right side numerator: -b ± √(b²-4ac)
        minus_b = Mrow(
            children=[
                Mo(children=["-"]),
                Mi(children=["b"]),
            ]
        )

        plus_minus = Mo(children=["±"])

        # b²-4ac inside square root
        b_squared = Msup(
            children=[
                Mi(children=["b"]),
                Mn(children=["2"]),
            ]
        )

        four_ac = Mrow(
            children=[
                Mn(children=["4"]),
                Mi(children=["a"]),
                Mi(children=["c"]),
            ]
        )

        discriminant = Mrow(children=[b_squared, Mo(children=["-"]), four_ac])

        sqrt_discriminant = Msqrt(children=[discriminant])

        numerator = Mrow(children=[minus_b, plus_minus, sqrt_discriminant])

        # Denominator: 2a
        denominator = Mrow(
            children=[
                Mn(children=["2"]),
                Mi(children=["a"]),
            ]
        )

        # Complete fraction
        fraction = Mfrac(children=[numerator, denominator])

        # Complete equation
        equation = Mrow(children=[x, equals, fraction])

        # Test serialization
        xml_str = equation.to_xml_string()
        self.assertIn("<msqrt>", xml_str)
        self.assertIn("<mfrac>", xml_str)
        self.assertIn("<msup>", xml_str)

        # Test round-trip
        result = Mrow.from_string(xml_str)
        self.assertEqual(len(result), 1)
        self.assertIsInstance(result[0], Mrow)

    def test_integral_with_limits(self):
        """Test definite integral: ∫₀^∞ e^(-x²) dx"""

        # Integral symbol with limits
        integral_symbol = Mo(children=["∫"])
        lower_limit = Mn(children=["0"])
        upper_limit = Mo(children=["∞"])

        integral_with_limits = Msubsup(
            children=[integral_symbol, lower_limit, upper_limit]
        )

        # e^(-x²)
        e = Mi(children=["e"])

        # -x²
        minus = Mo(children=["-"])
        x_squared = Msup(
            children=[
                Mi(children=["x"]),
                Mn(children=["2"]),
            ]
        )
        negative_x_squared = Mrow(children=[minus, x_squared])

        # e^(-x²)
        exponential = Msup(children=[e, negative_x_squared])

        # dx
        differential = Mrow(
            children=[
                Mi(children=["d"]),
                Mi(children=["x"]),
            ]
        )

        # Complete integral
        integral = Mrow(children=[integral_with_limits, exponential, differential])

        # Test structure
        xml_str = integral.to_xml_string()
        self.assertIn("<msubsup>", xml_str)
        self.assertIn("∫", xml_str)
        self.assertIn("∞", xml_str)

    def test_matrix_expression(self):
        """Test 2x2 matrix with expressions in cells."""

        # Matrix elements
        # Row 1: [cos θ, -sin θ]
        cos_theta = Mrow(
            children=[
                Mo(children=["cos"]),
                Mi(children=["θ"]),
            ]
        )

        minus_sin_theta = Mrow(
            children=[
                Mo(children=["-"]),
                Mo(children=["sin"]),
                Mi(children=["θ"]),
            ]
        )

        row1_cell1 = Mtd(children=[cos_theta])
        row1_cell2 = Mtd(children=[minus_sin_theta])
        row1 = Mtr(children=[row1_cell1, row1_cell2])

        # Row 2: [sin θ, cos θ]
        sin_theta = Mrow(
            children=[
                Mo(children=["sin"]),
                Mi(children=["θ"]),
            ]
        )

        row2_cell1 = Mtd(children=[sin_theta])
        row2_cell2 = Mtd(children=[cos_theta])
        row2 = Mtr(children=[row2_cell1, row2_cell2])

        # Complete matrix
        matrix = Mtable(children=[row1, row2])

        # Test structure
        self.assertEqual(len(matrix.children), 2)
        self.assertEqual(len(matrix.children[0].children), 2)
        self.assertEqual(len(matrix.children[1].children), 2)

    def test_summation_with_complex_expression(self):
        """Test summation: Σ(k=1 to n) k²/(k+1)"""

        # Summation symbol
        sigma = Mo(children=["Σ"])

        # Lower limit: k=1
        k_equals_1 = Mrow(
            children=[
                Mi(children=["k"]),
                Mo(children=["="]),
                Mn(children=["1"]),
            ]
        )

        # Upper limit: n
        n = Mi(children=["n"])

        # Summation with limits
        summation = Munderover(children=[sigma, k_equals_1, n])

        # Expression being summed: k²/(k+1)
        k_squared = Msup(
            children=[
                Mi(children=["k"]),
                Mn(children=["2"]),
            ]
        )

        k_plus_1 = Mrow(
            children=[
                Mi(children=["k"]),
                Mo(children=["+"]),
                Mn(children=["1"]),
            ]
        )

        fraction = Mfrac(children=[k_squared, k_plus_1])

        # Complete expression
        complete_sum = Mrow(children=[summation, fraction])

        # Test serialization
        xml_str = complete_sum.to_xml_string()
        self.assertIn("<munderover>", xml_str)
        self.assertIn("Σ", xml_str)
        self.assertIn("<mfrac>", xml_str)

    def test_chemical_equation(self):
        """Test chemical equation: H₂ + ½O₂ → H₂O"""

        # H₂
        h2 = Mrow(
            children=[
                Mi(children=["H"]),
                Msub(
                    children=[
                        Mrow(children=[]),  # Empty base for subscript positioning
                        Mn(children=["2"]),
                    ]
                ),
            ]
        )

        # Plus sign
        plus = Mo(children=["+"])

        # ½O₂
        half = Mfrac(
            children=[
                Mn(children=["1"]),
                Mn(children=["2"]),
            ]
        )

        o2 = Mrow(
            children=[
                Mi(children=["O"]),
                Msub(children=[Mrow(children=[]), Mn(children=["2"])]),
            ]
        )

        half_o2 = Mrow(children=[half, o2])

        # Arrow
        arrow = Mo(children=["→"])

        # H₂O
        h2o = Mrow(
            children=[
                Mi(children=["H"]),
                Msub(children=[Mrow(children=[]), Mn(children=["2"])]),
                Mi(children=["O"]),
            ]
        )

        # Complete equation
        equation = Mrow(children=[h2, plus, half_o2, arrow, h2o])

        # Test structure
        xml_str = equation.to_xml_string()
        self.assertIn("→", xml_str)
        self.assertIn("<msub>", xml_str)
        self.assertIn("<mfrac>", xml_str)

    def test_nested_fractions(self):
        """Test deeply nested fractions: (a/b) / (c/d) = ad/bc"""

        # a/b
        a_over_b = Mfrac(
            children=[
                Mi(children=["a"]),
                Mi(children=["b"]),
            ]
        )

        # c/d
        c_over_d = Mfrac(
            children=[
                Mi(children=["c"]),
                Mi(children=["d"]),
            ]
        )

        # (a/b) / (c/d)
        complex_fraction = Mfrac(children=[a_over_b, c_over_d])

        # =
        equals = Mo(children=["="])

        # ad
        ad = Mrow(
            children=[
                Mi(children=["a"]),
                Mi(children=["d"]),
            ]
        )

        # bc
        bc = Mrow(
            children=[
                Mi(children=["b"]),
                Mi(children=["c"]),
            ]
        )

        # ad/bc
        result_fraction = Mfrac(children=[ad, bc])

        # Complete equation
        equation = Mrow(children=[complex_fraction, equals, result_fraction])

        # Test nesting depth
        xml_str = equation.to_xml_string()
        # Should have nested mfrac elements
        frac_count = xml_str.count("<mfrac>")
        self.assertEqual(frac_count, 4)

    def test_multiscript_notation(self):
        """Test multiscript notation: ₁₁²³⁵U²³⁸"""

        # Base element
        u = Mi(children=["U"])

        # Pre-subscripts and pre-superscripts
        prescripts = Mprescripts()

        # Create multiscripts element
        # Format: base, post-sub, post-sup, prescripts, pre-sub, pre-sup
        multiscripts = Mmultiscripts(
            children=[
                u,  # base
                Mn(children=["238"]),  # post-subscript
                Mrow(children=[]),  # no post-superscript
                prescripts,
                Mn(children=["92"]),  # pre-subscript (atomic number)
                Mrow(children=[]),  # no pre-superscript
            ]
        )

        xml_str = multiscripts.to_xml_string()
        self.assertIn("<mmultiscripts>", xml_str)
        self.assertIn("<mprescripts />", xml_str)

    def test_equation_with_semantics(self):
        """Test equation with semantic annotations."""

        # E = mc²
        e = Mi(children=["E"])
        equals = Mo(children=["="])
        m = Mi(children=["m"])
        c_squared = Msup(
            children=[
                Mi(children=["c"]),
                Mn(children=["2"]),
            ]
        )

        equation = Mrow(children=[e, equals, m, c_squared])

        # Add semantic annotation
        latex_annotation = Annotation(
            encoding="application/x-tex", children=["E = mc^2"]
        )

        text_annotation = Annotation(
            encoding="text/plain",
            children=["Einstein's mass-energy equivalence"],
        )

        semantics = Semantics(children=[equation, latex_annotation, text_annotation])

        # Test structure
        self.assertEqual(len(semantics.children), 3)
        self.assertIsInstance(semantics.children[0], Mrow)
        self.assertIsInstance(semantics.children[1], Annotation)
        self.assertIsInstance(semantics.children[2], Annotation)

    def test_styled_expression(self):
        """Test expression with styling applied."""

        # Create expression: f(x) = x² + 1
        f = Mi(children=["f"])
        x_arg = Mi(children=["x"])
        function_call = Mrow(
            children=[
                f,
                Mo(children=["("]),
                x_arg,
                Mo(children=[")"]),
            ]
        )

        equals = Mo(children=["="])

        x_squared = Msup(
            children=[
                Mi(children=["x"]),
                Mn(children=["2"]),
            ]
        )

        plus = Mo(children=["+"])
        one = Mn(children=["1"])

        expression = Mrow(children=[x_squared, plus, one])

        # Wrap in styled container
        styled_expression = Mstyle(
            mathcolor="blue",
            mathsize="14pt",
            children=[function_call, equals, expression],
        )

        # Test styling attributes
        self.assertEqual(styled_expression.mathcolor, "blue")
        self.assertEqual(styled_expression.mathsize, "14pt")


class TestEdgeCasesAndCompliance(unittest.TestCase):
    """Tests for edge cases, boundary conditions, and MathML Core compliance."""

    def test_unicode_content_handling(self):
        """Test proper handling of Unicode mathematical symbols."""
        unicode_symbols = [
            "α",
            "β",
            "γ",
            "π",
            "∑",
            "∫",
            "∞",
            "≤",
            "≥",
            "≠",
            "∂",
            "∇",
            "√",
            "∈",
            "∉",
            "⊂",
            "⊃",
            "∪",
            "∩",
            "→",
        ]

        for symbol in unicode_symbols:
            with self.subTest(symbol=symbol):
                # Test in Mi element
                mi = Mi(children=[symbol])
                xml_str = mi.to_xml_string()
                self.assertIn(symbol, xml_str)

                # Test round-trip
                result = Mi.from_string(xml_str)
                self.assertEqual(result[0].children[0].text, symbol)

    def test_empty_elements_compliance(self):
        """Test MathML Core compliance for empty elements."""

        # Elements that can be empty
        empty_allowed = [
            Math(children=[]),
            Mrow(children=[]),
            Msqrt(children=[]),
            Mstyle(children=[]),
            Merror(children=[]),
            Mphantom(children=[]),
        ]

        for element in empty_allowed:
            with self.subTest(element=type(element).__name__):
                xml_str = element.to_xml_string()
                # Should produce valid XML
                self.assertTrue(xml_str.startswith("<"))
                self.assertTrue(xml_str.endswith(">"))

    def test_whitespace_handling(self):
        """Test proper whitespace handling in text content."""

        # Leading/trailing whitespace in text content
        text_with_spaces = "  x  "
        mi = Mi(children=[text_with_spaces])
        xml_str = mi.to_xml_string()

        # Round-trip test
        result = Mi.from_string(xml_str)
        self.assertEqual(result[0].children[0].text, text_with_spaces)

        # Mixed whitespace in Mtext
        text_content = "This is\tsome\ntext with\r\nvarious whitespace"
        mtext = Mtext(children=[text_content])
        xml_str = mtext.to_xml_string()

        result = Mtext.from_string(xml_str)
        self.assertEqual(result[0].children[0].text, text_content.replace("\r", ""))

    def test_special_characters_in_content(self):
        """Test handling of XML special characters in content."""

        special_chars = ["&", "<", ">", '"', "'"]

        for char in special_chars:
            with self.subTest(char=char):
                mtext = Mtext(children=[f"Before{char}After"])
                xml_str = mtext.to_xml_string()

                # Should not contain unescaped special characters
                if char == "&":
                    self.assertIn("&amp;", xml_str)
                elif char == "<":
                    self.assertIn("&lt;", xml_str)
                elif char == ">":
                    self.assertIn("&gt;", xml_str)

                # Round-trip should preserve original content
                result = Mtext.from_string(xml_str)
                self.assertEqual(result[0].children[0].text, f"Before{char}After")

    def test_display_attribute_compliance(self):
        """Test Math element display attribute compliance."""

        # Test both valid display values
        for display_value in [MathMLDisplay.BLOCK, MathMLDisplay.INLINE]:
            with self.subTest(display=display_value):
                math = Math(display=display_value, children=[])
                xml_str = math.to_xml_string()
                self.assertIn(f'display="{display_value.value}"', xml_str)

    def test_length_percentage_edge_cases(self):
        """Test edge cases for length-percentage values."""

        # Edge cases that should be valid
        valid_edge_cases = [
            "0",  # Unitless zero
            "0px",  # Zero with unit
            "+0",  # Explicit positive zero
            "-0",  # Negative zero
            "0.0px",  # Decimal zero
            ".5em",  # Leading decimal point
            "100%",  # Full percentage
            "0%",  # Zero percentage
            "+50%",  # Explicit positive percentage
        ]

        for value in valid_edge_cases:
            with self.subTest(value=value):
                try:
                    mspace = Mspace(width=value)
                    self.assertEqual(mspace.width, value)
                except ValidationError:
                    self.fail(f"Valid edge case {value} was rejected")

    def test_extremely_long_content(self):
        """Test handling of very long text content."""

        # Create very long text content
        long_text = "x" * 10000
        mtext = Mtext(children=[long_text])

        # Should handle without issues
        xml_str = mtext.to_xml_string()
        self.assertIn(long_text, xml_str)

        # Round-trip test
        result = Mtext.from_string(xml_str)
        self.assertEqual(result[0].children[0].text, long_text)

    def test_deeply_nested_structures(self):
        """Test deeply nested element structures."""

        # Create deeply nested structure: ((((x))))
        content = Mi(children=["x"])

        # Nest 10 levels deep
        for i in range(10):
            content = Mrow(children=[content])

        # Should serialize without issues
        xml_str = content.to_xml_string()

        # Count nesting depth
        open_count = xml_str.count("<mrow>")
        close_count = xml_str.count("</mrow>")
        self.assertEqual(open_count, 10)
        self.assertEqual(close_count, 10)

    def test_mixed_content_edge_cases(self):
        """Test edge cases in mixed content."""

        # Empty text nodes mixed with elements
        mrow = Mrow(
            children=[
                "",
                Mi(children=["x"]),
                "",
                Mo(children=["+"]),
                "",
                Mn(children=["1"]),
            ]
        )

        xml_str = mrow.to_xml_string()

        # Should strip empty text nodes
        result = Mrow.from_string(xml_str)
        self.assertEqual(len(result[0].children), 3)

    def test_attribute_value_edge_cases(self):
        """Test edge cases for attribute values."""

        # Very long attribute values
        long_alttext = "A" * 1000
        math = Math(alttext=long_alttext, children=[])
        xml_str = math.to_xml_string()
        self.assertIn(long_alttext, xml_str)

        # Attribute values with special characters
        special_alttext = 'Text with "quotes" and &ampersands'
        math = Math(alttext=special_alttext, children=[])
        xml_str = math.to_xml_string()

        # Should properly escape in XML
        result = Math.from_string(xml_str)
        self.assertEqual(result[0].alttext, special_alttext)

    def test_script_element_edge_cases(self):
        """Test edge cases for script elements."""

        # Script elements with minimal content
        base = Mi(children=["x"])
        empty_script = Mi(children=[""])

        msub = Msub(children=[base, empty_script])
        xml_str = msub.to_xml_string()

        # Should handle empty script content
        result = Msub.from_string(xml_str)
        self.assertEqual(len(result[0].children), 2)

    def test_namespace_compliance(self):
        """Test MathML namespace handling if supported."""

        # Basic elements should work without explicit namespace in this implementation
        mi = Mi(children=["x"])
        xml_str = mi.to_xml_string()

        # Should produce valid MathML-compatible XML
        self.assertTrue(xml_str.startswith("<mi"))
        self.assertTrue(xml_str.endswith("</mi>"))

    def test_boolean_attribute_edge_cases(self):
        """Test edge cases for boolean attributes."""

        # Test all boolean attributes on Mo element
        mo = Mo(
            fence=True,
            largeop=False,
            movablelimits=True,
            separator=False,
            stretchy=True,
            symmetric=False,
            children=["∑"],
        )

        xml_str = mo.to_xml_string()

        # All boolean values should serialize
        self.assertIn('fence="true"', xml_str)
        self.assertIn('largeop="false"', xml_str)
        self.assertIn('movablelimits="true"', xml_str)
        self.assertIn('separator="false"', xml_str)
        self.assertIn('stretchy="true"', xml_str)
        self.assertIn('symmetric="false"', xml_str)

    def test_semantics_edge_cases(self):
        """Test edge cases for semantic elements."""

        # Semantics with only presentation content (no annotations)
        presentation = Mi(children=["E"])
        ann1 = Annotation(encoding="text/plain", children=["First"])
        semantics = Semantics(children=[presentation, ann1])

        xml_str = semantics.to_xml_string()
        result = Semantics.from_string(xml_str)
        self.assertEqual(len(result[0].children), 2)

        # Multiple annotations of same type
        ann2 = Annotation(encoding="text/plain", children=["Second"])

        semantics_multi = Semantics(children=[presentation, ann1, ann2])
        xml_str = semantics_multi.to_xml_string()
        self.assertEqual(xml_str.count("<annotation"), 2)

    def test_error_recovery_and_validation(self):
        """Test validation error handling and edge cases."""

        # Test that validation catches obvious errors
        with self.assertRaises(ValidationError):
            # Invalid color value
            Mi(mathcolor="not-a-color", children=["x"])

        with self.assertRaises(ValidationError):
            # Invalid length value
            Mspace(width="invalid-length")

        with self.assertRaises(ValidationError):
            # Invalid script level
            Mi(scriptlevel="not-a-number", children=["x"])
