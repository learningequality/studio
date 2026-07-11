import json
import re
import zipfile

from django.core.files.storage import default_storage as storage
from django.template.loader import render_to_string
from le_utils.constants import exercises
from le_utils.constants import file_formats
from le_utils.constants import format_presets

from contentcuration import models
from contentcuration.utils.assessment.base import ExerciseArchiveGenerator
from contentcuration.utils.assessment.qti.perseus_derive import derive_perseus_item
from contentcuration.utils.parser import extract_value


_DOUBLE_DOLLAR_RE = re.compile(r"\$\$(.+?)\$\$", flags=re.DOTALL)


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

    def _write_raw_perseus_image_files(self, assessment_item):
        # For raw perseus JSON questions, the files must be
        # specified in advance.

        # Files have been prefetched when the assessment item was
        # queried, so take advantage of that.
        files = sorted(assessment_item.files.all(), key=lambda x: x.checksum)
        image_files = filter(
            lambda x: x.preset_id == format_presets.EXERCISE_IMAGE, files
        )
        graphie_files = filter(
            lambda x: x.preset_id == format_presets.EXERCISE_GRAPHIE, files
        )
        images_path = self.get_image_file_path()
        for image in image_files:
            image_name = "{}/{}.{}".format(
                images_path, image.checksum, image.file_format_id
            )
            with storage.open(
                models.generate_object_storage_name(image.checksum, str(image)),
                "rb",
            ) as content:
                self.add_file_to_write(image_name, content.read())

        for image in graphie_files:
            svg_name = "{}/{}.svg".format(images_path, image.original_filename)
            json_name = "{}/{}-data.json".format(images_path, image.original_filename)
            with storage.open(
                models.generate_object_storage_name(image.checksum, str(image)),
                "rb",
            ) as content:
                content = content.read()
                # in Python 3, delimiter needs to be in bytes format
                content = content.split(exercises.GRAPHIE_DELIMITER.encode("ascii"))
                if len(content) != 2:
                    raise ValueError(
                        f"Graphie file '{image.original_filename}' "
                        f"missing delimiter {exercises.GRAPHIE_DELIMITER!r}"
                    )
                self.add_file_to_write(svg_name, content[0])
                self.add_file_to_write(json_name, content[1])

    def _process_formulas(self, content):
        return _DOUBLE_DOLLAR_RE.sub(r"$\1$", content)

    def _process_content(self, content):
        content = self._process_formulas(content)
        return super()._process_content(content)

    def process_assessment_item(self, assessment_item):
        if assessment_item.type == exercises.QTI:
            derived = self._derived_items().get(assessment_item.assessment_id)
            if derived is None:
                # derive_perseus_item already logs why it could not derive.
                return
            return super().process_assessment_item(derived)
        if assessment_item.type == exercises.PERSEUS_QUESTION:
            self._write_raw_perseus_image_files(assessment_item)
        return super().process_assessment_item(assessment_item)

    def _process_input_answers(self, processed_data):
        """Extract input answer processing logic"""
        non_empty_answers = []
        for answer in processed_data["answers"]:
            answer["answer"] = extract_value(answer["answer"])
            if answer["answer"] or answer["answer"] == 0:
                non_empty_answers.append(answer)

        return {**processed_data, "answers": non_empty_answers}

    def create_assessment_item(self, assessment_item, processed_data):
        template = self.TEMPLATE_MAP.get(assessment_item.type)
        if not template:
            raise TypeError(
                f"Unrecognized question type on item {assessment_item.assessment_id}: {assessment_item.type}"
            )

        # Handle input question special case
        if assessment_item.type == exercises.INPUT_QUESTION:
            processed_data = self._process_input_answers(processed_data)

        filename = f"{assessment_item.assessment_id}.json"
        content = render_to_string(template, processed_data).encode("utf-8", "ignore")
        return filename, content

    def get_image_file_path(self):
        return "images"

    def get_image_ref_prefix(self):
        return f"${exercises.IMG_PLACEHOLDER}/images"

    def _exercise_data_for_archive(self):
        """``exercise.json`` must list the same item ids and types as the item
        JSON files written into this archive. Native QTI items are written by
        their derived proxy's ``assessment_id`` (the QTI root identifier) and
        carry a legacy Perseus ``type``, so rewrite ``all_assessment_items`` /
        ``assessment_mapping`` to match. Otherwise ``restore_channel``'s
        ``extract_assessment_items`` opens ``{hex}.json`` and raises
        ``FileNotFoundError``, and ``generate_assessment_item`` receives a
        ``qti`` type it cannot map.
        """
        derived = self._derived_items()
        if not derived:
            return self.exercise_data

        original_mapping = self.exercise_data.get("assessment_mapping", {})
        new_ids = []
        new_mapping = {}
        for assessment_id in self.exercise_data.get("all_assessment_items", []):
            if assessment_id in derived:
                proxy = derived[assessment_id]
                if proxy is None:
                    # Not Perseus-expressible: no item JSON is written, so drop
                    # it rather than leave a dangling reference in exercise.json.
                    continue
                new_ids.append(proxy.assessment_id)
                new_mapping[proxy.assessment_id] = proxy.type
            else:
                new_ids.append(assessment_id)
                if assessment_id in original_mapping:
                    new_mapping[assessment_id] = original_mapping[assessment_id]
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
