from enum import Enum
from typing import Annotated

from pydantic import Field


LengthPercentage = Annotated[
    str,
    Field(
        # Accepts:
        # - Length values: 10px, 2em, 1.5rem, 0.5in, 2pt, etc.
        # - Percentage values: 50%, 100%, 0%, etc.
        # - Zero: 0 (unitless zero is valid)
        # Previously different attributes allowed for a range of values,
        # but these seem to be deprecated.
        pattern=r"^([+-]?0|[+-]?(?:\d+\.?\d*|\d*\.\d+)(?:px|pt|pc|in|cm|mm|Q|em|ex|ch|rem|lh|rlh|vw|vh|vi|vb|vmin|vmax|mu|%))$",
        description="CSS length-percentage value (e.g., '10px', '2em', '50%', '0')",
        examples=["10px", "2em", "50%", "0"],
    ),
]

# Number patterns
number = r"\d+(?:\.\d+)?"
percentage = rf"{number}%"
number_or_percent = rf"{number}%?"

# Color function patterns
hex_color = r"#[0-9a-fA-F]{3,8}"
named_color = r"[a-zA-Z]+"
rgb_pattern = rf"rgb\(\s*{number_or_percent}\s*,\s*{number_or_percent}\s*,\s*{number_or_percent}\s*\)"
rgba_pattern = rf"rgba\(\s*{number_or_percent}\s*,\s*{number_or_percent}\s*,\s*{number_or_percent}\s*,\s*{number_or_percent}\s*\)"
hsl_pattern = rf"hsl\(\s*{number}\s*,\s*{percentage}\s*,\s*{percentage}\s*\)"
hsla_pattern = rf"hsla\(\s*{number}\s*,\s*{percentage}\s*,\s*{percentage}\s*,\s*{number_or_percent}\s*\)"

# Final regex
color_regex = rf"^(?:{hex_color}|{named_color}|{rgb_pattern}|{rgba_pattern}|{hsl_pattern}|{hsla_pattern})$"


ColorValue = Annotated[
    str,
    Field(
        pattern=color_regex,
        description="CSS color value (hex, named color, rgb(), rgba(), hsl(), hsla())",
        examples=["red", "#ff0000", "#f00", "rgb(255,0,0)", "rgba(255,0,0,0.5)"],
    ),
]

ScriptLevel = Annotated[
    str,
    Field(
        pattern=r"^[+-]?\d+$",
        description="Script level value (integer, optionally with +/- prefix)",
        examples=["0", "1", "+2", "-1"],
    ),
]


class MathMLDisplay(Enum):
    BLOCK = "block"
    INLINE = "inline"


class MathMLForm(Enum):
    PREFIX = "prefix"
    INFIX = "infix"
    POSTFIX = "postfix"
