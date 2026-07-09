import json
from typing import Optional

from le_utils.constants import exercises
from lxml import etree

from contentcuration.utils.assessment.qti.convert import (
    convert_legacy_assessment_item_to_qti,
)
from contentcuration.utils.assessment.qti.convert import LegacyAssessmentItem
from contentcuration.utils.assessment.qti.convert import QTIConversionResult
from contentcuration.utils.assessment.qti.validation import parse_qti_xml


CONTENT_STORAGE_PREFIX = exercises.CONTENT_STORAGE_FORMAT.format("")

_PERSEUS_CUSTOM_INTERACTION_XPATH = etree.XPath(
    "//*[local-name()='qti-custom-interaction' and @data-type='perseus']"
)


def strip_content_storage_placeholder(text):
    return text.replace(CONTENT_STORAGE_PREFIX, "")


def convert_legacy_question_to_qti(question_data: dict) -> QTIConversionResult:
    answers = json.loads(question_data.get("answers") or "[]")
    for answer in answers:
        if isinstance(answer.get("answer"), str):
            answer["answer"] = strip_content_storage_placeholder(answer["answer"])

    hints = json.loads(question_data.get("hints") or "[]")
    for hint in hints:
        if isinstance(hint.get("hint"), str):
            hint["hint"] = strip_content_storage_placeholder(hint["hint"])

    item = LegacyAssessmentItem(
        type=question_data["type"],
        question=strip_content_storage_placeholder(question_data.get("question") or ""),
        answers=answers,
        hints=hints,
        randomize=question_data.get("randomize") or False,
        assessment_id=question_data["assessment_id"],
        title=question_data.get("assessment_id"),
        language=question_data.get("language") or "en",
    )
    return convert_legacy_assessment_item_to_qti(item)


def find_perseus_custom_interaction_path(raw_data) -> Optional[str]:
    if isinstance(raw_data, str):
        raw_data = raw_data.encode("utf-8")
    try:
        doc = parse_qti_xml(raw_data)
    except etree.XMLSyntaxError:
        return None
    matches = _PERSEUS_CUSTOM_INTERACTION_XPATH(doc)
    if not matches:
        return None
    return matches[0].get("data-perseus-path")
