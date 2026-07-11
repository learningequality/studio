"""Native QTI item XML → structured legacy Perseus data.

Reverse of the forward ``convert``/``ingest`` pipeline for the subset of QTI
interactions Perseus can express: single/multiple ``qti-choice-interaction``
and inline ``qti-text-entry-interaction``. Everything else is *not* expressible
and derivation returns ``None`` so the node publishes QTI only.

All parse/derive failures log + return ``None``/``False`` — a single malformed
item must never abort the channel publish.
"""
import json
import logging
from dataclasses import dataclass
from typing import List
from typing import Optional

from le_utils.constants import exercises
from lxml import etree

from contentcuration.utils.assessment.qti.catalog import KOLIBRI_HINT_SUPPORT
from contentcuration.utils.assessment.qti.html_to_markdown import html_to_markdown
from contentcuration.utils.assessment.qti.validation import parse_qti_xml

logger = logging.getLogger(__name__)


@dataclass
class DerivedAssessmentItem:
    """Legacy-shaped proxy consumed by ``PerseusExerciseGenerator``.

    Carries every field ``base.process_assessment_item`` and
    ``perseus.create_assessment_item`` read off a Django ``AssessmentItem``.
    """

    type: str
    question: str
    answers: str
    hints: str
    assessment_id: str
    randomize: bool = False
    raw_data: str = "{}"


def _local(el) -> str:
    return etree.QName(el).localname


def _first_descendant(root, localname):
    for el in root.iter():
        if _local(el) == localname:
            return el
    return None


def _interaction_elements(item_body) -> List[etree._Element]:
    return [el for el in item_body.iter() if _local(el).endswith("-interaction")]


def _response_declaration(root, identifier):
    """The ``qti-response-declaration`` an interaction links to via its
    ``response-identifier``. Keyed off the interaction's own identifier (not a
    hardcoded ``RESPONSE``) so an item authored with a different identifier
    resolves correctly, and a genuine mismatch resolves to ``None``.
    """
    if identifier is None:
        return None
    for el in root.iter():
        if (
            _local(el) == "qti-response-declaration"
            and el.get("identifier") == identifier
        ):
            return el
    return None


def _derivable_interaction(root, item_body):
    """Return ``(deriver, interaction, declaration)`` when the item is
    Perseus-expressible, else ``None``.

    Requires exactly one interaction, that it be a ``qti-choice-interaction`` or
    ``qti-text-entry-interaction``, *and* that its ``response-identifier``
    resolves to a response declaration; a mismatch yields ``None`` so the node
    degrades to QTI-only rather than deriving zero correct answers.
    """
    interactions = _interaction_elements(item_body)
    if len(interactions) != 1:
        return None
    interaction = interactions[0]
    deriver = _INTERACTION_DERIVERS.get(_local(interaction))
    if deriver is None:
        return None
    declaration = _response_declaration(root, interaction.get("response-identifier"))
    if declaration is None:
        return None
    return deriver, interaction, declaration


def _correct_values(declaration) -> List[str]:
    correct_responses = _children_by_localname(declaration, "qti-correct-response")
    if not correct_responses:
        return []
    return [
        value.text or ""
        for value in _children_by_localname(correct_responses[0], "qti-value")
    ]


def _children_by_localname(el, localname):
    return [child for child in el if _local(child) == localname]


def _derive_hints(root) -> List[dict]:
    hints = []
    order = 0
    for card in root.iter():
        if _local(card) != "qti-card" or card.get("support") != KOLIBRI_HINT_SUPPORT:
            continue
        html_content = _children_by_localname(card, "qti-html-content")
        text = html_to_markdown(html_content[:1])
        if not text:
            logger.warning("Skipping hint card with no derivable text")
            continue
        hints.append({"hint": text, "order": order})
        order += 1
    return hints


def _derive_choice(interaction, item_body, declaration):
    prompt = _children_by_localname(interaction, "qti-prompt")
    question = html_to_markdown(prompt[:1])
    correct = set(_correct_values(declaration))
    answers = [
        {
            "answer": html_to_markdown([choice]),
            "correct": choice.get("identifier") in correct,
            "order": order,
        }
        for order, choice in enumerate(
            _children_by_localname(interaction, "qti-simple-choice")
        )
    ]
    item_type = (
        exercises.MULTIPLE_SELECTION
        if declaration.get("cardinality") == "multiple"
        else exercises.SINGLE_SELECTION
    )
    return item_type, question, answers


def _derive_text(interaction, item_body, declaration):
    question = html_to_markdown([item_body])
    answers = [
        {"answer": value, "correct": True, "order": order}
        for order, value in enumerate(_correct_values(declaration))
    ]
    return exercises.INPUT_QUESTION, question, answers


# Interaction localname -> deriver(interaction, item_body, declaration). Defined
# below the derivers so the table can reference them directly.
_INTERACTION_DERIVERS = {
    "qti-choice-interaction": _derive_choice,
    "qti-text-entry-interaction": _derive_text,
}


def _parse(raw_data):
    """Parse untrusted XML; return the item-body element or ``None``."""
    try:
        root = parse_qti_xml(raw_data.encode("utf-8")).getroot()
    except etree.XMLSyntaxError:
        logger.warning("Unable to parse QTI item XML during Perseus derivation")
        return None, None
    item_body = _first_descendant(root, "qti-item-body")
    return root, item_body


def is_perseus_derivable(raw_data: str) -> bool:
    """True iff the item has exactly one Perseus-expressible interaction whose
    response-identifier resolves to a response declaration."""
    root, item_body = _parse(raw_data)
    if item_body is None:
        return False
    return _derivable_interaction(root, item_body) is not None


def derive_perseus_item(assessment_item) -> Optional[DerivedAssessmentItem]:
    """Django ``AssessmentItem`` → ``DerivedAssessmentItem`` proxy, or ``None``.

    Returns ``None`` (with a warning) when the item is unparseable or its
    interaction is not Perseus-expressible.

    The proxy's ``assessment_id`` is the QTI item's root ``identifier`` — the
    same id the QTI archive records for the item in the manifest, and hence in
    ``AssessmentMetaData.assessment_item_ids`` for these dual-published nodes —
    so older Kolibri resolves the derived Perseus item JSON by that id.
    """
    root, item_body = _parse(assessment_item.raw_data)
    if item_body is None:
        # A syntax error is already logged by _parse (root is None); this covers
        # the "parsed, but no item body" case, which would otherwise be silent.
        if root is not None:
            logger.warning(
                "QTI item %s has no item body; skipping derivation",
                assessment_item.assessment_id,
            )
        return None

    derivable = _derivable_interaction(root, item_body)
    if derivable is None:
        logger.warning(
            "QTI item %s is not Perseus-expressible; skipping derivation",
            assessment_item.assessment_id,
        )
        return None

    identifier = root.get("identifier")
    if not identifier:
        logger.warning(
            "QTI item %s is missing a root identifier; skipping derivation",
            assessment_item.assessment_id,
        )
        return None

    deriver, interaction, declaration = derivable
    item_type, question, answers = deriver(interaction, item_body, declaration)

    return DerivedAssessmentItem(
        type=item_type,
        question=question,
        answers=json.dumps(answers),
        hints=json.dumps(_derive_hints(root)),
        assessment_id=identifier,
        randomize=assessment_item.randomize,
    )
