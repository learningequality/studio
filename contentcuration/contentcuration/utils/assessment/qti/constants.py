from enum import Enum


# QTI Constants for Outcome Declarations


class Cardinality(Enum):
    MULTIPLE = "multiple"
    SINGLE = "single"
    ORDERED = "ordered"
    RECORD = "record"


class BaseType(Enum):
    BOOLEAN = "boolean"
    DIRECTED_PAIR = "directedPair"
    DURATION = "duration"
    FILE = "file"
    FLOAT = "float"
    IDENTIFIER = "identifier"
    INTEGER = "integer"
    PAIR = "pair"
    POINT = "point"
    STRING = "string"
    URI = "uri"


class View(Enum):
    AUTHOR = "author"
    CANDIDATE = "candidate"
    PROCTOR = "proctor"
    SCORER = "scorer"
    TEST_CONSTRUCTOR = "testConstructor"
    TUTOR = "tutor"


class ExternalScored(Enum):
    EXTERNAL_MACHINE = "externalMachine"
    HUMAN = "human"


class ShowHide(Enum):
    SHOW = "show"
    HIDE = "hide"


class Dir(Enum):
    LTR = "ltr"
    RTL = "rtl"
    AUTO = "auto"


class Format(Enum):
    PLAIN = "plain"
    PREFORMATTED = "preformatted"
    XHTML = "xhtml"


class Orientation(Enum):
    HORIZONTAL = "horizontal"
    VERTICAL = "vertical"


class ResourceType(Enum):
    """Enumeration for QTI resource types"""

    ASSESSMENT_TEST = "imsqti_test_xmlv3p0"
    ASSESSMENT_ITEM = "imsqti_item_xmlv3p0"
    RESPONSE_TEMPLATE = "imsqti_rptemplate_xmlv3p0"


# Inline style properties an item may carry. Kolibri's SafeHTML rebuilds every style
# attribute from this same list before rendering an item (its ALLOWED_STYLE_PROPS, in
# kolibri-common/components/SafeHTML/index.js, which the qti_viewer renders through),
# dropping whatever is not on it — so a declaration outside this list never reaches the
# learner. Hand-synced with that list and with the ricecooker/le_utils KPUB ingest
# allowlist (learningequality/ricecooker#685); no shared package carries it yet.
ALLOWED_STYLE_PROPERTIES = frozenset(
    {
        "text-align",
        "color",
        "background-color",
        "text-decoration",
    }
)
