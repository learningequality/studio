import json
import logging
import os
from dataclasses import dataclass
from typing import Any
from typing import Dict
from typing import List
from typing import Optional
from typing import Tuple

from le_utils.constants import exercises
from le_utils.constants import format_presets
from lxml import etree

from contentcuration.utils.assessment.base import ExerciseArchiveGenerator
from contentcuration.utils.assessment.qti.constants import ResourceType
from contentcuration.utils.assessment.qti.convert import (
    build_perseus_custom_interaction_item,
)
from contentcuration.utils.assessment.qti.convert import (
    convert_legacy_assessment_item_to_qti,
)
from contentcuration.utils.assessment.qti.convert import hex_to_qti_id
from contentcuration.utils.assessment.qti.convert import is_answerless_input
from contentcuration.utils.assessment.qti.convert import LegacyAssessmentItem
from contentcuration.utils.assessment.qti.imsmanifest import File as ManifestFile
from contentcuration.utils.assessment.qti.imsmanifest import Manifest
from contentcuration.utils.assessment.qti.imsmanifest import Metadata
from contentcuration.utils.assessment.qti.imsmanifest import Resource
from contentcuration.utils.assessment.qti.imsmanifest import Resources
from contentcuration.utils.assessment.qti.media import get_qti_media_references
from contentcuration.utils.assessment.qti.media import rewrite_qti_media_paths
from contentcuration.utils.assessment.qti.media import rewrite_qti_sized_image_paths
from contentcuration.utils.assessment.qti.media import set_qti_item_language
from contentcuration.utils.assessment.qti.media import strip_studio_attributes
from contentcuration.utils.assessment.qti.perseus_derive import (
    is_answerless_numeric_entry,
)
from contentcuration.utils.assessment.qti.validation import parse_qti_xml
from contentcuration.utils.assessment.qti.validation import validate_qti_item


@dataclass
class QTIResource:
    identifier: str
    filepath: str
    file_dependencies: List[str]


class QTIExerciseGenerator(ExerciseArchiveGenerator):
    """
    Exercise zip generator for QTI format exercises.
    Creates IMS Content Package with QTI 3.0 assessment items.
    """

    file_format = "zip"
    KEEP_IMAGE_SIZES = True
    preset = format_presets.QTI_ZIP

    PERSEUS_IMAGE_DIR = "perseus/images"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.qti_resources: List[QTIResource] = []

    def get_image_file_path(self) -> str:
        """Get the file path for QTI assessment items."""
        return "items/images"

    def get_image_ref_prefix(self):
        """
        Because we put items in a subdirectory, we need to prefix the image paths
        with the relative path to the images directory.
        """
        return "images"

    def _qti_item_filepath(self, assessment_id):
        return f"items/{assessment_id}.xml"

    def _node_language(self):
        return (
            self.ccnode.language.lang_code
            if self.ccnode.language
            else self.default_language
        )

    def _next_item_title(self):
        return f"{self.ccnode.title} {len(self.qti_resources) + 1}"

    def _add_resource(self, resource: QTIResource) -> None:
        if any(r.identifier == resource.identifier for r in self.qti_resources):
            raise ValueError(
                f"Duplicate QTI item identifier '{resource.identifier}' on node {self.ccnode.pk}"
            )
        self.qti_resources.append(resource)

    def _warn_answerless(self, assessment_item):
        logging.warning(
            f"QTI item {assessment_item.assessment_id} on node {self.ccnode.pk} "
            f"has no correct answer and will be excluded from the package"
        )

    def _skip_answerless_input(self, assessment_item, answers) -> bool:
        # Conversion makes an input question with no accepted answer an
        # answerless float entry.
        is_answerless = is_answerless_input(assessment_item.type, answers)
        if is_answerless:
            self._warn_answerless(assessment_item)
        return is_answerless

    def _create_native_qti_item(self, assessment_item) -> Optional[Tuple[str, bytes]]:
        result = validate_qti_item(assessment_item.raw_data)
        if not result.is_valid:
            error_messages = "; ".join(
                f"line {e.line}, column {e.column}: {e.message}" for e in result.errors
            )
            logging.error(
                f"QTI item {assessment_item.assessment_id} on node {self.ccnode.pk} "
                f"failed schema validation and will be excluded from the package: "
                f"{error_messages}"
            )
            return None

        if is_answerless_numeric_entry(assessment_item.raw_data):
            self._warn_answerless(assessment_item)
            return None

        identifier = parse_qti_xml(assessment_item.raw_data).getroot().get("identifier")
        if not identifier:
            raise ValueError(
                f"QTI item {assessment_item.assessment_id} is missing a root identifier attribute"
            )

        filepath = f"items/{identifier}.xml"
        item_xml, file_dependencies = self._write_qti_media_files(assessment_item)
        # The other two paths through this generator build their items here and stamp the
        # node's language as they go; this one is handed raw_data, so it stamps it too.
        # Otherwise one package declares a language for some items and not others,
        # depending only on which editor wrote them.
        item_xml = set_qti_item_language(item_xml, self._node_language())
        item_xml = strip_studio_attributes(item_xml)

        self._add_resource(
            QTIResource(
                identifier=identifier,
                filepath=filepath,
                file_dependencies=file_dependencies,
            )
        )

        return filepath, item_xml.encode("utf-8")

    def _write_qti_media_files(self, assessment_item) -> Tuple[str, List[str]]:
        raw_data = assessment_item.raw_data
        filenames = get_qti_media_references(raw_data)
        if not filenames:
            return raw_data, []

        # assessment_item.files is prefetched by ExerciseArchiveGenerator.create_exercise_archive
        files_by_name = {
            f"{f.checksum}.{f.file_format_id}": f for f in assessment_item.files.all()
        }
        missing = filenames - files_by_name.keys()
        if missing:
            logging.error(
                f"QTI item {assessment_item.assessment_id} on node {self.ccnode.pk} "
                f"references media files with no matching File record linked to "
                f"the item, so they will be omitted from the package: "
                f"{', '.join(sorted(missing))}"
            )

        resized_paths = set()

        def _resized_path(filename, width, height):
            file_obj = files_by_name.get(filename)
            if file_obj is None:
                return None
            resized = self._process_single_image(
                filename,
                file_obj.checksum,
                f".{file_obj.file_format_id}",
                width,
                height,
                self.get_image_file_path(),
            )
            path = f"{self.get_image_ref_prefix()}/{resized}"
            resized_paths.add(path)
            return path

        item_xml = rewrite_qti_sized_image_paths(raw_data, _resized_path)

        # Media files can't stay bare in items/ alongside the item XML - they're
        # written to items/images/ (matching the legacy generator's layout) and
        # the item XML's references are remapped to the images/ prefix that
        # resolves to that directory relative to the item file. Resized paths
        # already carry that prefix, so only references to originals remain.
        references = get_qti_media_references(item_xml) if resized_paths else filenames
        path_by_filename = {}
        for filename in sorted(references - missing):
            file_obj = files_by_name[filename]
            self._add_original_image(
                file_obj.checksum, filename, self.get_image_file_path()
            )
            path_by_filename[filename] = f"{self.get_image_ref_prefix()}/{filename}"

        item_xml = rewrite_qti_media_paths(item_xml, path_by_filename)
        return item_xml, sorted(resized_paths | set(path_by_filename.values()))

    def process_assessment_item(self, assessment_item):
        if assessment_item.type == exercises.PERSEUS_QUESTION:
            return self._create_perseus_custom_interaction(assessment_item)
        # Checked before processing, which writes the item's images to the
        # package, and again after, which can blank an image-only answer.
        if self._skip_answerless_input(
            assessment_item, json.loads(assessment_item.answers)
        ):
            return None
        return super().process_assessment_item(assessment_item)

    def _process_answers(self, assessment_item):
        # The base drops every falsy answer, including a JSON 0; conversion
        # drops the blank and false input answers itself.
        if assessment_item.type != exercises.INPUT_QUESTION:
            return super()._process_answers(assessment_item)
        answers = json.loads(assessment_item.answers)
        for answer in answers:
            if isinstance(answer.get("answer"), str):
                answer["answer"], answer["images"] = self._process_content(
                    answer["answer"]
                )
        return self._sort_by_order(answers, "answers")

    def _create_perseus_custom_interaction(self, assessment_item) -> None:
        """Embed a raw Perseus question as a ``qti-custom-interaction``.

        Writes the Perseus JSON (with its content-storage references rewritten to
        the packaged asset paths) and its image/graphie assets into the package,
        and declares them as dependencies of the wrapper item's manifest resource.
        """
        asset_paths = self._write_raw_perseus_assets(
            assessment_item, self.PERSEUS_IMAGE_DIR
        )
        perseus_json = self._rewrite_content_storage_refs(
            assessment_item.raw_data, self.PERSEUS_IMAGE_DIR
        )
        perseus_path = f"perseus/{assessment_item.assessment_id}.json"
        self.add_file_to_write(perseus_path, perseus_json.encode("utf-8"))

        result = build_perseus_custom_interaction_item(
            assessment_item.assessment_id,
            perseus_path,
            self._next_item_title(),
            self._node_language(),
        )

        item_path = self._qti_item_filepath(result.identifier)
        self.add_file_to_write(item_path, result.xml.encode("utf-8"))
        self._add_resource(
            QTIResource(
                identifier=result.identifier,
                filepath=item_path,
                file_dependencies=[perseus_path, *asset_paths],
            )
        )

    def create_assessment_item(
        self, assessment_item, processed_data: Dict[str, Any]
    ) -> Optional[Tuple[str, bytes]]:
        """Create QTI assessment item XML."""

        if assessment_item.type == exercises.QTI:
            return self._create_native_qti_item(assessment_item)

        if self._skip_answerless_input(assessment_item, processed_data["answers"]):
            return None

        legacy_item = LegacyAssessmentItem(
            type=assessment_item.type,
            question=processed_data["question"],
            answers=processed_data.get("answers", []),
            hints=processed_data.get("hints", []),
            randomize=processed_data.get("randomize", False),
            assessment_id=assessment_item.assessment_id,
            title=self._next_item_title(),
            language=self._node_language(),
        )
        result = convert_legacy_assessment_item_to_qti(legacy_item)

        # Sized images come out of the conversion with a bare filename
        image_entries = processed_data.get("question_images", []) + [
            image
            for part in processed_data.get("answers", [])
            + processed_data.get("hints", [])
            for image in part.get("images", [])
        ]
        path_by_filename = {
            os.path.basename(image["name"]): image["name"] for image in image_entries
        }
        try:
            item_xml = rewrite_qti_media_paths(result.xml, path_by_filename)
        except etree.XMLSyntaxError as e:
            logging.error(
                f"QTI item {assessment_item.assessment_id} on node {self.ccnode.pk} "
                f"is not well-formed XML and will be excluded from the package: {e}"
            )
            return None
        file_dependencies = list(
            dict.fromkeys(path_by_filename.get(d, d) for d in result.file_dependencies)
        )

        filename = self._qti_item_filepath(result.identifier)
        self._add_resource(
            QTIResource(
                identifier=result.identifier,
                filepath=filename,
                file_dependencies=file_dependencies,
            )
        )
        return filename, item_xml.encode("utf-8")

    def _create_manifest_resources(self) -> List[Resource]:
        """Create manifest resources for all QTI items."""
        resources = []

        for qti_resource in self.qti_resources:
            files = [ManifestFile(href=qti_resource.filepath)]
            for dep in qti_resource.file_dependencies:
                files.append(ManifestFile(href=dep))

            resource = Resource(
                identifier=qti_resource.identifier,
                type_=ResourceType.ASSESSMENT_ITEM.value,
                href=qti_resource.filepath,
                files=files,
            )
            resources.append(resource)

        return resources

    def _create_imsmanifest(self) -> str:
        # Create resources
        resources = self._create_manifest_resources()

        # Create manifest
        manifest = Manifest(
            identifier=hex_to_qti_id(self.ccnode.content_id),
            version="1.0",
            metadata=Metadata(schema="QTI Package", schemaversion="3.0.0"),
            resources=Resources(resources=resources),
        )

        xml_content = manifest.to_xml_string()
        return f'<?xml version="1.0" encoding="UTF-8"?>\n{xml_content}'

    def handle_after_assessment_items(self):
        # Create and write the IMS manifest
        manifest_xml = self._create_imsmanifest()
        self.add_file_to_write("imsmanifest.xml", manifest_xml.encode("utf-8"))
        # Sort all paths to parallel the predictable zip generation logic in ricecooker
        # and the Kolibri Studio frontend.
        self.files_to_write = sorted(self.files_to_write)
