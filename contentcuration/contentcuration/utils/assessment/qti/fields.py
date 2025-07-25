import re
from typing import Annotated
from urllib.parse import urlparse

from langcodes import Language as LangCodesLanguage
from pydantic import BeforeValidator
from pydantic import Field


def validate_bcp47_language(value: str) -> str:
    """Validate and normalize BCP47 language tag."""
    if not isinstance(value, str):
        raise ValueError(f"BCP47 language tag must be a string, got {type(value)}")

    if not value:
        raise ValueError("BCP47 language tag cannot be empty")

    try:
        # Validate and normalize using langcodes
        return LangCodesLanguage.get(value).to_tag()
    except ValueError as e:
        raise ValueError("Invalid BCP47 language tag") from e


BCP47Language = Annotated[str, BeforeValidator(validate_bcp47_language)]

data_uri_pattern = r"data:(?:([-\w]+/[-+\w.]+)(?:(;[-\w]+=[-\w]+)*))?(;base64)?,(.*)"

data_uri_regex = re.compile(rf"^{data_uri_pattern}$")


def validate_data_uri(value: str) -> str:
    """
    Validate data URI format according to RFC 2397.
    Format: data:[<mediatype>][;base64],<data>
    """

    match = data_uri_regex.match(value)
    if not match:
        raise ValueError(f"Invalid data URI format: {value}")

    return value


def validate_local_href_path(value: str) -> str:
    """
    Validate that a path is relative (no scheme) and suitable for offline bundling.
    Allows: relative/path.jpg, ../path.jpg, ./file.png, #fragment, data:...
    Rejects: http://..., https://..., ftp://..., etc.
    """
    parsed = urlparse(value)
    # Allow data URLs (for embedded content)
    if parsed.scheme == "data":
        return validate_data_uri(value)

    # Reject absolute URLs
    if parsed.scheme or parsed.netloc or parsed.path.startswith("/"):
        raise ValueError(f"Absolute URLs not allowed in bundled content: {value}")

    return value


def validate_local_src_path(value: str) -> str:
    """
    Validate local src paths - stricter than href, should be actual file paths.
    """
    value = validate_local_href_path(value)

    parsed = urlparse(value)
    if not parsed.path:
        raise ValueError(f"Invalid local src path: {value}")

    # Allow relative paths
    return value


# Regex pattern for complete srcset validation
# Matches: (data URI OR regular path) + one or more descriptors (2x, 100w, etc.)
# Separated by commas with optional whitespace
entry_pattern = rf"({data_uri_pattern}|[^\s,]+)(?:\s+\d*\.?\d+[xwh])+"
# Pattern for complete srcset: one or more entries separated by commas
srcset_pattern = rf"^{entry_pattern}(?:\s*,\s*{entry_pattern})*$"


def validate_local_srcset(value: str) -> str:
    if not value.strip():
        return value

    if not re.match(srcset_pattern, value.strip()):
        raise ValueError(f"Invalid srcset format: {value}")

    entries = re.findall(entry_pattern, value)

    for entry in entries:
        url = entry[0]
        # Only need to validate the URL - descriptors already confirmed valid
        validate_local_src_path(url.strip())

    return value


# Custom types for HTML attributes
LocalHrefPath = Annotated[str, BeforeValidator(validate_local_href_path)]
LocalSrcPath = Annotated[str, BeforeValidator(validate_local_src_path)]
LocalSrcSet = Annotated[str, BeforeValidator(validate_local_srcset)]


QTIIdentifier = Annotated[
    str,
    Field(
        pattern=r"^[a-zA-Z_][a-zA-Z0-9_\-]{0,31}$",
        min_length=1,
        max_length=32,
        description="QTI XML identifier: must start with letter or underscore, "
        "contain only letters, digits, underscores, and hyphens, "
        "no colons, max 32 characters",
    ),
]
