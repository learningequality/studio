import base64
from typing import Any
from typing import Dict
from typing import List
from typing import Tuple

from le_utils.constants import exercises
from le_utils.constants import format_presets

from contentcuration.utils.assessment.base import ExerciseArchiveGenerator
from contentcuration.utils.assessment.markdown import render_markdown
from contentcuration.utils.assessment.qti.assessment_item import AssessmentItem
from contentcuration.utils.assessment.qti.assessment_item import CorrectResponse
from contentcuration.utils.assessment.qti.assessment_item import ItemBody
from contentcuration.utils.assessment.qti.assessment_item import OutcomeDeclaration
from contentcuration.utils.assessment.qti.assessment_item import ResponseDeclaration
from contentcuration.utils.assessment.qti.assessment_item import ResponseProcessing
from contentcuration.utils.assessment.qti.assessment_item import Value
from contentcuration.utils.assessment.qti.base import ElementTreeBase
from contentcuration.utils.assessment.qti.constants import BaseType
from contentcuration.utils.assessment.qti.constants import Cardinality
from contentcuration.utils.assessment.qti.constants import Orientation
from contentcuration.utils.assessment.qti.constants import ResourceType
from contentcuration.utils.assessment.qti.constants import ShowHide
from contentcuration.utils.assessment.qti.html import Div
from contentcuration.utils.assessment.qti.html import FlowContentList
from contentcuration.utils.assessment.qti.html import P
from contentcuration.utils.assessment.qti.imsmanifest import File as ManifestFile
from contentcuration.utils.assessment.qti.imsmanifest import Manifest
from contentcuration.utils.assessment.qti.imsmanifest import Metadata
from contentcuration.utils.assessment.qti.imsmanifest import Resource
from contentcuration.utils.assessment.qti.imsmanifest import Resources
from contentcuration.utils.assessment.qti.interaction_types.simple import (
    ChoiceInteraction,
)
from contentcuration.utils.assessment.qti.interaction_types.simple import SimpleChoice
from contentcuration.utils.assessment.qti.interaction_types.text_based import (
    TextEntryInteraction,
)
from contentcuration.utils.assessment.qti.prompt import Prompt


choice_interactions = {
    exercises.MULTIPLE_SELECTION,
    exercises.SINGLE_SELECTION,
    "true_false",
}
text_entry_interactions = {exercises.INPUT_QUESTION, exercises.FREE_RESPONSE}


def hex_to_qti_id(hex_string):
    """
    Encode a 32 digit hex to a 22 character base64 encoded id and a K prefix.
    """
    bytes_data = bytes.fromhex(hex_string)
    return f"K{base64.urlsafe_b64encode(bytes_data).decode('ascii').rstrip('=')}"


class QTIExerciseGenerator(ExerciseArchiveGenerator):
    """
    Exercise zip generator for QTI format exercises.
    Creates IMS Content Package with QTI 3.0 assessment items.
    """

    file_format = "zip"
    preset = format_presets.QTI_ZIP

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.qti_items = []

    def get_image_file_path(self) -> str:
        """Get the file path for QTI assessment items."""
        return "items/images"

    def get_image_ref_prefix(self):
        """
        Because we put items in a subdirectory, we need to prefix the image paths
        with the relative path to the images directory.
        """
        return "images"

    def _create_html_content_from_text(self, text: str) -> FlowContentList:
        """Convert text content to QTI HTML flow content."""
        if not text.strip():
            return []
        markup = render_markdown(text)
        return ElementTreeBase.from_string(markup)

    def _create_choice_interaction_and_response(
        self, processed_data: Dict[str, Any]
    ) -> Tuple[ChoiceInteraction, ResponseDeclaration]:
        """Create a QTI choice interaction for multiple choice questions."""

        prompt = Prompt(
            children=self._create_html_content_from_text(processed_data["question"])
        )

        choices = []
        correct_values = []
        for i, answer in enumerate(processed_data.get("answers", [])):
            choice_id = f"choice_{i}"
            choice_content = self._create_html_content_from_text(
                answer.get("answer", "")
            )

            choice = SimpleChoice(
                identifier=choice_id,
                children=choice_content,
                show_hide=ShowHide.SHOW,
                fixed=False,
            )
            choices.append(choice)

            if answer.get("correct", False):
                correct_values.append(Value(value=choice_id))

        response_declaration = ResponseDeclaration(
            identifier="RESPONSE",
            cardinality=Cardinality.MULTIPLE
            if processed_data["multiple_select"]
            else Cardinality.SINGLE,
            base_type=BaseType.IDENTIFIER,
            correct_response=CorrectResponse(value=correct_values)
            if correct_values
            else None,
        )

        interaction = ChoiceInteraction(
            response_identifier="RESPONSE",
            prompt=prompt,
            answers=choices,
            shuffle=processed_data.get("randomize", False),
            max_choices=len(choices) if processed_data["multiple_select"] else 1,
            min_choices=0,
            orientation=Orientation.VERTICAL,
        )
        return interaction, response_declaration

    def _create_text_entry_interaction_and_response(
        self, processed_data: Dict[str, Any]
    ) -> Tuple[Div, ResponseDeclaration]:
        prompt = self._create_html_content_from_text(processed_data["question"])
        interaction_element = TextEntryInteraction(
            response_identifier="RESPONSE",
            expected_length=50,  # Default expected length
            placeholder_text="Enter your answer here",
        )
        # Text entry interaction is an inline element, so wrap it in a paragraph tag.
        interaction_element = P(children=[interaction_element])
        # prompt is already a list of elements, so just append the interaction to it.
        prompt.append(interaction_element)
        interaction = Div(children=prompt)

        correct_values = []
        values_float = []
        for answer in processed_data["answers"]:
            if answer["correct"]:
                correct_values.append(Value(value=str(answer["answer"])))
            try:
                float(answer["answer"])
                values_float.append(True)
            except ValueError:
                values_float.append(False)
        float_answer = bool(values_float) and all(values_float)

        response_declaration = ResponseDeclaration(
            identifier="RESPONSE",
            cardinality=Cardinality.MULTIPLE
            if len(correct_values) > 1
            else Cardinality.SINGLE,
            base_type=BaseType.FLOAT if float_answer else BaseType.STRING,
            correct_response=CorrectResponse(value=correct_values)
            if correct_values
            else None,
        )
        return interaction, response_declaration

    def _qti_item_filepath(self, assessment_id):
        return f"items/{assessment_id}.xml"

    def create_assessment_item(
        self, assessment_item, processed_data: Dict[str, Any]
    ) -> tuple[str, bytes]:
        """Create QTI assessment item XML."""

        # Skip Perseus questions as they can't be easily converted
        if assessment_item.type == exercises.PERSEUS_QUESTION:
            raise ValueError(
                f"Perseus questions are not supported in QTI format: {assessment_item.assessment_id}"
            )

        if assessment_item.type in choice_interactions:
            (
                interaction,
                response_declaration,
            ) = self._create_choice_interaction_and_response(processed_data)
        elif assessment_item.type in text_entry_interactions:
            (
                interaction,
                response_declaration,
            ) = self._create_text_entry_interaction_and_response(processed_data)
        else:
            raise ValueError(f"Unsupported question type: {assessment_item.type}")

        # Create item body with the interaction
        item_body = ItemBody(children=[interaction])

        # Create outcome declaration
        outcome_declaration = OutcomeDeclaration(
            identifier="SCORE", cardinality=Cardinality.SINGLE, base_type=BaseType.FLOAT
        )

        # Create response processing
        response_processing = ResponseProcessing(
            template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"
        )

        language = (
            self.ccnode.language.lang_code
            if self.ccnode.language
            else self.default_language
        )

        qti_item_id = hex_to_qti_id(assessment_item.assessment_id)

        # Create the assessment item
        qti_item = AssessmentItem(
            identifier=qti_item_id,
            title=f"{self.ccnode.title} {len(self.qti_items) + 1}",
            language=language,
            adaptive=False,
            time_dependent=False,
            response_declaration=[response_declaration],
            outcome_declaration=[outcome_declaration],
            item_body=item_body,
            response_processing=response_processing,
        )

        # Store for manifest creation
        self.qti_items.append(qti_item)

        # Generate XML content
        xml_content = qti_item.to_xml_string()

        # Add XML declaration and format nicely
        full_xml = f'<?xml version="1.0" encoding="UTF-8"?>\n{xml_content}'

        filename = self._qti_item_filepath(qti_item_id)
        return filename, full_xml.encode("utf-8")

    def _create_manifest_resources(self) -> List[Resource]:
        """Create manifest resources for all QTI items."""
        resources = []

        for qti_item in self.qti_items:
            # Get file dependencies (images, etc.)
            file_dependencies = qti_item.get_file_dependencies()

            # Create file entries
            qti_item_filepath = self._qti_item_filepath(qti_item.identifier)
            files = [ManifestFile(href=qti_item_filepath)]
            for dep in file_dependencies:
                files.append(ManifestFile(href=dep))

            resource = Resource(
                identifier=qti_item.identifier,
                type_=ResourceType.ASSESSMENT_ITEM.value,
                href=qti_item_filepath,
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
