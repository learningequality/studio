import copy
import json
import logging
import re
import zipfile

from django.template.loader import render_to_string
from django.utils.functional import cached_property
from le_utils.constants import content_kinds
from le_utils.constants import exercises
from le_utils.constants import file_formats
from le_utils.constants import format_presets

from contentcuration.utils.assessment.base import ExerciseArchiveGenerator
from contentcuration.utils.assessment.qti.convert import format_number
from contentcuration.utils.assessment.qti.convert import hex_to_qti_id
from contentcuration.utils.assessment.qti.convert import is_answerless_input
from contentcuration.utils.assessment.qti.perseus_derive import derive_perseus_item


logger = logging.getLogger(__name__)

_DOUBLE_DOLLAR_RE = re.compile(r"\$\$(.+?)\$\$", flags=re.DOTALL)


def _perseus_input_value(answer):
    """The number a Perseus numeric-input renders for a legacy input answer, or None."""
    number = format_number(str(answer).strip())
    return float(number) if number else None


def answerless_input_ids(ccnode):
    """Input questions an exercise's Perseus archive leaves out, judged from
    stored answers, as exercise.json is written before any item is processed."""
    return {
        item.assessment_id
        for item in ccnode.assessment_items.filter(type=exercises.INPUT_QUESTION)
        if is_answerless_input(item.type, json.loads(item.answers))
    }


class PerseusExerciseGenerator(ExerciseArchiveGenerator):
    """
    Exercise zip generator for Perseus format exercises.
    """

    ZIP_DATE_TIME = (2013, 3, 14, 1, 59, 26)
    ZIP_COMPRESS_TYPE = zipfile.ZIP_STORED
    ZIP_COMMENT = "Perseus file generated during export process".encode()

    file_format = file_formats.PERSEUS
    preset = format_presets.EXERCISE

    TEMPLATE_MAP = {
        exercises.MULTIPLE_SELECTION: "perseus/multiple_selection.json",
        exercises.SINGLE_SELECTION: "perseus/multiple_selection.json",
        exercises.INPUT_QUESTION: "perseus/input_question.json",
        exercises.PERSEUS_QUESTION: "perseus/perseus_question.json",
        "true_false": "perseus/multiple_selection.json",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Derived proxies for native QTI items, keyed by source assessment_id.
        # Computed once and reused by both exercise.json and item processing.
        self._derived_cache = None

    def _derived_items(self):
        """Derived Perseus proxies for the node's native QTI items, keyed by the
        source (hex) ``assessment_id``. A ``None`` value marks an item that could
        not be derived (already logged) and so is skipped from the archive."""
        if self._derived_cache is None:
            self._derived_cache = {
                item.assessment_id: derive_perseus_item(item)
                for item in self.ccnode.assessment_items.all()
                if item.type == exercises.QTI
            }
        return self._derived_cache

    @cached_property
    def _answerless_input_ids(self):
        """Units keep them: their pre/post test lists every id."""
        if self.ccnode.kind_id != content_kinds.EXERCISE:
            return set()
        answerless_ids = answerless_input_ids(self.ccnode)
        for assessment_id in answerless_ids:
            logger.warning(
                f"Input question {assessment_id} on node {self.ccnode.pk} "
                f"has no correct answer and will be excluded from the Perseus archive"
            )
        return answerless_ids

    def _process_formulas(self, content):
        return _DOUBLE_DOLLAR_RE.sub(r"$\1$", content)

    def _process_content(self, content):
        content = self._process_formulas(content)
        return super()._process_content(content)

    def process_assessment_item(self, assessment_item):
        if assessment_item.assessment_id in self._answerless_input_ids:
            return
        if assessment_item.type == exercises.QTI:
            derived = self._derived_items().get(assessment_item.assessment_id)
            if derived is None:
                # derive_perseus_item already logs why it could not derive.
                return
            return super().process_assessment_item(derived)
        if assessment_item.type == exercises.PERSEUS_QUESTION:
            self._write_raw_perseus_assets(assessment_item, self.get_image_file_path())
        if self._derived_items():
            # Dual-published: AssessmentMetaData records the QTI manifest id.
            assessment_item = copy.copy(assessment_item)
            assessment_item.assessment_id = hex_to_qti_id(assessment_item.assessment_id)
        return super().process_assessment_item(assessment_item)

    def _process_answers(self, assessment_item):
        answers = super()._process_answers(assessment_item)
        if assessment_item.type != exercises.INPUT_QUESTION:
            return answers
        # The template marks every rendered answer correct.
        values = map(_perseus_input_value, accepted_answers(answers))
        return [{"answer": value} for value in values if value is not None]

    def create_assessment_item(self, assessment_item, processed_data):
        template = self.TEMPLATE_MAP.get(assessment_item.type)
        if not template:
            raise TypeError(
                f"Unrecognized question type on item {assessment_item.assessment_id}: {assessment_item.type}"
            )

        filename = f"{assessment_item.assessment_id}.json"
        content = render_to_string(template, processed_data).encode("utf-8", "ignore")
        return filename, content

    def get_image_file_path(self):
        return "images"

    def get_image_ref_prefix(self):
        return f"${exercises.IMG_PLACEHOLDER}/images"

    def _exercise_data_for_archive(self):
        """``exercise.json`` must list the same item ids and types as the item
        JSON files written into this archive. When the node has native QTI
        items, every item is written by its QTI manifest id, and native items
        carry their derived proxy's legacy Perseus ``type``. On a mismatch,
        ``restore_channel``'s ``extract_assessment_items`` opens ``{hex}.json``
        and raises ``FileNotFoundError``, and ``generate_assessment_item``
        receives a ``qti`` type it cannot map.
        """
        assessment_ids = [
            assessment_id
            for assessment_id in self.exercise_data.get("all_assessment_items", [])
            if assessment_id not in self._answerless_input_ids
        ]
        original_mapping = self.exercise_data.get("assessment_mapping", {})
        derived = self._derived_items()
        new_ids = []
        new_mapping = {}
        for assessment_id in assessment_ids:
            if assessment_id in derived:
                proxy = derived[assessment_id]
                if proxy is None:
                    # Not Perseus-expressible: no item JSON is written, so drop
                    # it rather than leave a dangling reference in exercise.json.
                    continue
                new_ids.append(proxy.assessment_id)
                new_mapping[proxy.assessment_id] = proxy.type
            else:
                item_id = hex_to_qti_id(assessment_id) if derived else assessment_id
                new_ids.append(item_id)
                if assessment_id in original_mapping:
                    new_mapping[item_id] = original_mapping[assessment_id]
        return {
            **self.exercise_data,
            "all_assessment_items": new_ids,
            "assessment_mapping": new_mapping,
        }

    def handle_before_assessment_items(self):
        exercise_context = {
            "exercise": json.dumps(
                self._exercise_data_for_archive(), sort_keys=True, indent=4
            )
        }
        exercise_result = render_to_string(
            "perseus/exercise.json", exercise_context
        ).encode("utf-8")
        self.add_file_to_write("exercise.json", exercise_result)
