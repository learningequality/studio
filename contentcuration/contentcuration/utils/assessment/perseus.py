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

    def handle_before_assessment_items(self):
        exercise_context = {
            "exercise": json.dumps(self.exercise_data, sort_keys=True, indent=4)
        }
        exercise_result = render_to_string(
            "perseus/exercise.json", exercise_context
        ).encode("utf-8")
        self.add_file_to_write("exercise.json", exercise_result)
