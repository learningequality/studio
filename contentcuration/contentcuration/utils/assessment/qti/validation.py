import threading
from dataclasses import dataclass
from dataclasses import field
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from typing import List
from typing import Union

from lxml import etree


SCHEMA_DIR = Path(__file__).parent / "schema" / "xsd"
ITEM_SCHEMA_PATH = SCHEMA_DIR / "imsqti_itemv3p0p1_v1p0.xsd"

# lxml's XMLSchema.validate() writes results to the schema object's shared
# error_log, so concurrent validate() calls on the same cached schema instance
# (reused across items per the module's design) can read each other's errors.
# Serialize validate + error_log read to keep results correctly attributed.
_VALIDATION_LOCK = threading.Lock()


@lru_cache(maxsize=1)
def _compiled_schema() -> etree.XMLSchema:
    schema_doc = etree.parse(str(ITEM_SCHEMA_PATH))
    return etree.XMLSchema(schema_doc)


@dataclass(frozen=True)
class QTIValidationError:
    message: str
    line: int
    column: int


@dataclass(frozen=True)
class QTIValidationResult:
    is_valid: bool
    errors: List[QTIValidationError] = field(default_factory=list)


def _secure_parser() -> etree.XMLParser:
    # resolve_entities=False + load_dtd=False blocks XXE/entity-expansion attacks;
    # no_network=True blocks remote schemaLocation/entity fetches. QTI reaches this
    # validator from ricecooker uploads and direct sync-API writes, not just the
    # editor, so the input here is untrusted.
    #
    # Unlike the compiled schema (expensive to build, so cached), a fresh
    # XMLParser is cheap to construct. lxml serializes each parser instance's
    # use internally, so a single cached instance would needlessly serialize
    # concurrent parses across threads — build a new one per call instead.
    return etree.XMLParser(
        resolve_entities=False, no_network=True, load_dtd=False, huge_tree=False
    )


def validate_qti_item(xml: Union[str, bytes]) -> QTIValidationResult:
    if isinstance(xml, str):
        xml = xml.encode("utf-8")

    try:
        doc = etree.parse(BytesIO(xml), parser=_secure_parser())
    except etree.XMLSyntaxError as exc:
        return QTIValidationResult(
            is_valid=False,
            errors=[
                QTIValidationError(
                    message=exc.msg, line=exc.lineno or 0, column=exc.offset or 0
                )
            ],
        )

    schema = _compiled_schema()
    with _VALIDATION_LOCK:
        is_valid = schema.validate(doc)
        errors = [
            QTIValidationError(message=err.message, line=err.line, column=err.column)
            for err in schema.error_log
        ]
    return QTIValidationResult(is_valid=is_valid, errors=errors)
