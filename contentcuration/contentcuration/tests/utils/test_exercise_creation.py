# flake8: noqa: E501
# Ignore line length issues in this file
# Black will autoformat where possible, so this is not too egregious
# but will allow our long strings where necessary.
import json
import os
import re
import zipfile
from io import BytesIO
from uuid import uuid4

from django.core.files.storage import default_storage as storage
from le_utils.constants import content_kinds
from le_utils.constants import exercises
from le_utils.constants import file_formats
from le_utils.constants import format_presets

from contentcuration.models import AssessmentItem
from contentcuration.models import ContentNode
from contentcuration.tests.base import StudioTestCase
from contentcuration.tests.testdata import fileobj_exercise_graphie
from contentcuration.tests.testdata import fileobj_exercise_image
from contentcuration.utils.assessment.perseus import PerseusExerciseGenerator
from contentcuration.utils.assessment.qti.archive import hex_to_qti_id
from contentcuration.utils.assessment.qti.archive import QTIExerciseGenerator


class TestPerseusExerciseCreation(StudioTestCase):
    """
    Tests for the create_perseus_exercise function which handles exercise file generation.

    These tests verify that the function correctly packages assessment items,
    images, and other resources into a valid Perseus exercise zip file.

    These tests were generated using Claude Sonnet 3.7 Extended thinking.
    All tests, bar the image resizing tests, were then heavily edited to better fit the test
    cases. The image resizing tests are committed here mostly unmodified.
    """

    def setUp(self):
        self.setUpBase()

        # Create an exercise node
        self.exercise_node = ContentNode.objects.create(
            title="Test Exercise",
            node_id="1234567890abcdef1234567890abcded",
            content_id="fedcba0987654321fedcba0987654321",
            kind_id=content_kinds.EXERCISE,
            parent=self.channel.main_tree,
            extra_fields=json.dumps(
                {
                    "randomize": True,
                    "options": {
                        "completion_criteria": {
                            "model": "mastery",
                            "threshold": {
                                "mastery_model": exercises.M_OF_N,
                                "m": 3,
                                "n": 5,
                            },
                        }
                    },
                }
            ),
        )

    def _create_assessment_item(
        self, item_type, question_text, answers, hints=None, assessment_id=None
    ):
        """Helper to create assessment items with the right structure"""
        if hints is None:
            hints = [{"hint": "This is a hint", "order": 1}]

        item = AssessmentItem.objects.create(
            contentnode=self.exercise_node,
            assessment_id=assessment_id or uuid4().hex,
            type=item_type,
            question=question_text,
            answers=json.dumps(answers),
            hints=json.dumps(hints),
            raw_data="{}",
            order=len(self.exercise_node.assessment_items.all()) + 1,
            randomize=True,
        )
        return item

    def _create_perseus_zip(self, exercise_data):
        generator = PerseusExerciseGenerator(
            self.exercise_node,
            exercise_data,
            self.channel.id,
            "en-US",
            user_id=self.user.id,
        )
        return generator.create_exercise_archive()

    def _validate_perseus_zip(self, exercise_file):
        """Helper to validate the structure of the Perseus zip file"""
        # Use Django's storage backend to read the file
        with storage.open(exercise_file.file_on_disk.name, "rb") as f:
            zip_data = f.read()

        zip_file = zipfile.ZipFile(BytesIO(zip_data))

        # Check that the exercise.json file exists and is valid JSON
        assert (
            "exercise.json" in zip_file.namelist()
        ), "exercise.json not found in zip file"
        exercise_data = json.loads(zip_file.read("exercise.json").decode("utf-8"))

        assert (
            "all_assessment_items" in exercise_data
        ), "all_assessment_items missing in exercise data"
        assert (
            "mastery_model" in exercise_data
        ), "mastery_model missing in exercise data"

        # Check that each assessment item has a corresponding JSON file
        for item_id in exercise_data["all_assessment_items"]:
            assert (
                f"{item_id}.json" in zip_file.namelist()
            ), f"JSON file for item {item_id} missing"
            try:
                item_json = json.loads(zip_file.read(f"{item_id}.json").decode("utf-8"))
            except json.JSONDecodeError:
                self.fail(f"Invalid JSON data for {item_id}")

            self.assertIn("question", item_json)
            self.assertIn("answerArea", item_json)
            self.assertIn("itemDataVersion", item_json)
            self.assertIn("hints", item_json)

        # Return the zip object and data for additional assertions
        return zip_file, exercise_data

    def test_basic_exercise_creation(self):
        """Test the basic creation of a Perseus exercise with a single question"""
        # Create a simple multiple choice question
        item = self._create_assessment_item(
            exercises.SINGLE_SELECTION,
            "What is 2+2?",
            [
                {"answer": "4", "correct": True, "order": 1},
                {"answer": "3", "correct": False, "order": 2},
                {"answer": "5", "correct": False, "order": 3},
            ],
            assessment_id="1234567890abcdef1234567890abcdef",
        )

        # Create the exercise data structure
        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 5,
            "m": 3,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.SINGLE_SELECTION},
        }

        # Call the function to create the Perseus exercise
        self._create_perseus_zip(exercise_data)

        # Verify that a file was created for the node
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.EXERCISE)
        self.assertIsNotNone(exercise_file)
        self.assertEqual(exercise_file.file_format_id, file_formats.PERSEUS)

        # Validate the contents of the zip file
        zip_file, parsed_data = self._validate_perseus_zip(exercise_file)

        # Verify specific content details
        self.assertEqual(parsed_data["all_assessment_items"], [item.assessment_id])
        self.assertEqual(parsed_data["m"], 3)
        self.assertEqual(parsed_data["n"], 5)
        self.assertTrue(parsed_data["randomize"])

        # Check that the assessment item file contains the expected content
        item_json = json.loads(
            zip_file.read(f"{item.assessment_id}.json").decode("utf-8")
        )
        self.assertIn("What is 2+2?", item_json["question"]["content"])
        answers = item_json["question"]["widgets"]["radio 1"]["options"]["choices"]
        self.assertEqual(len(answers), 3)
        self.assertTrue(
            any(ans["content"] == "4" and ans["correct"] for ans in answers)
        )

        # Hard code the generated checksum for the file for this test.
        # Only change this and the contents of this test if we have decided that
        # we are deliberately changing the archive generation algorithm for perseus files.
        self.assertEqual(exercise_file.checksum, "0ec7e964b466ebc76e81e175570e97f1")

    def test_multiple_images_index_mismatch_regression(self):
        """Regression test for index mismatch bug in process_image_strings method.

        When content is modified inside the re.finditer loop, subsequent matches
        point to invalid positions due to string length changes, resulting in
        malformed image processing.
        """
        # Create three image files - use mix of resized and non-resized images
        # to trigger different replacement lengths
        image1 = fileobj_exercise_image(size=(100, 100), color="red")
        image2 = fileobj_exercise_image(size=(200, 200), color="blue")
        image3 = fileobj_exercise_image(size=(300, 300), color="green")

        # Create URLs for all images
        image1_url = exercises.CONTENT_STORAGE_FORMAT.format(image1.filename())
        image2_url = exercises.CONTENT_STORAGE_FORMAT.format(image2.filename())
        image3_url = exercises.CONTENT_STORAGE_FORMAT.format(image3.filename())

        # Create question with multiple images - mix of resized and original
        # This should create different length replacements
        question_text = (
            f"First image (resized): ![img1]({image1_url} =50x50)\n"
            f"Second image (original): ![img2]({image2_url})\n"
            f"Third image (resized): ![img3]({image3_url} =70x70)"
        )

        item = self._create_assessment_item(
            exercises.SINGLE_SELECTION,
            question_text,
            [{"answer": "Answer", "correct": True, "order": 1}],
        )

        # Associate all images with the assessment item
        for img in [image1, image2, image3]:
            img.assessment_item = item
            img.save()

        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 1,
            "m": 1,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.SINGLE_SELECTION},
        }

        # Create the Perseus exercise
        self._create_perseus_zip(exercise_data)
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.EXERCISE)
        zip_file, _ = self._validate_perseus_zip(exercise_file)

        # Get the Perseus item JSON content
        item_json = json.loads(
            zip_file.read(f"{item.assessment_id}.json").decode("utf-8")
        )
        question_content = item_json["question"]["content"]

        # Extract all markdown image references using the same pattern as the code
        markdown_pattern = r"!\[([^\]]*)\]\(([^)]+)\)"
        matches = re.findall(markdown_pattern, question_content)

        # Check that we have exactly 3 well-formed image references
        # If the bug exists, we might get malformed content due to index mismatch
        self.assertEqual(
            len(matches),
            3,
            f"Expected 3 image references, found {len(matches)} in content: {question_content}",
        )

        # Verify each match has proper structure
        for i, (alt_text, _) in enumerate(matches):
            expected_alt = f"img{i+1}"
            self.assertEqual(
                alt_text,
                expected_alt,
                f"Image {i+1} alt text malformed: got '{alt_text}', expected '{expected_alt}'",
            )

        # Verify that width and height are properly included in the question images
        question_images = item_json["question"]["images"]

        self.assertEqual(
            len(question_images),
            2,
            f"Expected 2 image entries with dimensions, found {len(question_images)}: {list(question_images.keys())}",
        )

        # Verify that we have images with the expected dimensions
        for image_name, image_data in question_images.items():
            width, height = image_data["width"], image_data["height"]
            if width == 50 and height != 50:
                self.fail("Should find image with 50x50 dimensions")
            elif width == 70 and height != 70:
                self.fail("Should find image with 70x70 dimensions")

    def test_exercise_with_image(self):
        image_file = fileobj_exercise_image()

        # Create a question with image
        image_url = exercises.CONTENT_STORAGE_FORMAT.format(f"{image_file.filename()}")
        question_text = f"Identify the shape: ![shape]({image_url})"
        item = self._create_assessment_item(
            exercises.SINGLE_SELECTION,
            question_text,
            [
                {"answer": "Circle", "correct": True, "order": 1},
                {"answer": "Square", "correct": False, "order": 2},
            ],
        )

        # Associate the image with the assessment item
        image_file.assessment_item = item
        image_file.save()

        # Create the exercise data
        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 3,
            "m": 2,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.SINGLE_SELECTION},
        }

        # Create the Perseus exercise
        self._create_perseus_zip(exercise_data)

        # Verify that a file was created
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.EXERCISE)

        # Validate the zip file
        zip_file, _ = self._validate_perseus_zip(exercise_file)

        # Check that the image file was included in the zip
        image_path = f"images/{image_file.filename()}"
        self.assertIn(image_path, zip_file.namelist())

        # Check that the question references the correct image path
        item_json = json.loads(
            zip_file.read(f"{item.assessment_id}.json").decode("utf-8")
        )
        self.assertIn(
            f"${exercises.IMG_PLACEHOLDER}/{image_path}",
            item_json["question"]["content"],
        )

    def test_exercise_with_image_no_attached_file(self):
        """Identical to the previous test, but fails to attach the file object to the assessment item"""
        image_file = fileobj_exercise_image()

        # Create a question with image
        image_url = exercises.CONTENT_STORAGE_FORMAT.format(f"{image_file.filename()}")
        question_text = f"Identify the shape: ![shape]({image_url})"
        item = self._create_assessment_item(
            exercises.SINGLE_SELECTION,
            question_text,
            [
                {"answer": "Circle", "correct": True, "order": 1},
                {"answer": "Square", "correct": False, "order": 2},
            ],
        )

        # Create the exercise data
        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 3,
            "m": 2,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.SINGLE_SELECTION},
        }

        # Create the Perseus exercise
        self._create_perseus_zip(exercise_data)

        # Verify that a file was created
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.EXERCISE)

        # Validate the zip file
        zip_file, _ = self._validate_perseus_zip(exercise_file)

        # Check that the image file was included in the zip
        image_path = f"images/{image_file.filename()}"
        self.assertIn(image_path, zip_file.namelist())

        # Check that the question references the correct image path
        item_json = json.loads(
            zip_file.read(f"{item.assessment_id}.json").decode("utf-8")
        )
        self.assertIn(
            f"${exercises.IMG_PLACEHOLDER}/{image_path}",
            item_json["question"]["content"],
        )

    def test_exercise_with_image_deleted_file_object(self):
        """Identical to the previous test, but deletes the file object"""
        image_file = fileobj_exercise_image()

        # Create a question with image
        image_url = exercises.CONTENT_STORAGE_FORMAT.format(f"{image_file.filename()}")
        question_text = f"Identify the shape: ![shape]({image_url})"
        item = self._create_assessment_item(
            exercises.SINGLE_SELECTION,
            question_text,
            [
                {"answer": "Circle", "correct": True, "order": 1},
                {"answer": "Square", "correct": False, "order": 2},
            ],
        )

        # Create the exercise data
        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 3,
            "m": 2,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.SINGLE_SELECTION},
        }

        image_file.delete()

        # Create the Perseus exercise
        self._create_perseus_zip(exercise_data)

        # Verify that a file was created
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.EXERCISE)

        # Validate the zip file
        zip_file, _ = self._validate_perseus_zip(exercise_file)

        # Check that the image file was included in the zip
        image_path = f"images/{image_file.filename()}"
        self.assertIn(image_path, zip_file.namelist())

        # Check that the question references the correct image path
        item_json = json.loads(
            zip_file.read(f"{item.assessment_id}.json").decode("utf-8")
        )
        self.assertIn(
            f"${exercises.IMG_PLACEHOLDER}/{image_path}",
            item_json["question"]["content"],
        )

    def _create_perseus_item(self):
        with open(
            os.path.join(
                os.path.dirname(__file__), "perseus_question_new_bar_graphs.json"
            )
        ) as f:
            perseus_json = f.read()

        graphie_ids = [
            "d855aefe9a722f9a794b0883ebcdb8c37b4ba0c7",
            "95262ebaf42bdd1929e5d6d1e2853d3eb0a5cc74",
            "ab207c6f38c887130b68c078e6158a87aab60c45",
        ]

        graphie_files = []

        for graphie_id in graphie_ids:
            graphie_url = f"cdn.kastatic.org/ka-perseus-graphie/{graphie_id}"

            # Create a graphie file
            graphie_file = fileobj_exercise_graphie(original_filename=graphie_id)
            graphie_files.append(graphie_file)

            graphie_path = exercises.CONTENT_STORAGE_FORMAT.format(graphie_id)

            perseus_json = perseus_json.replace(graphie_url, graphie_path)

        item = AssessmentItem.objects.create(
            contentnode=self.exercise_node,
            assessment_id="fedcba0987654321fedcba0987654321",
            type=exercises.PERSEUS_QUESTION,
            raw_data=perseus_json,
            order=len(self.exercise_node.assessment_items.all()) + 1,
            randomize=True,
        )

        for graphie_file in graphie_files:
            graphie_file.assessment_item = item
            graphie_file.save()

        return item, graphie_files

    def test_exercise_with_graphie(self):
        """Test creating an exercise with graphie files (SVG+JSON pairs)"""

        item, graphie_files = self._create_perseus_item()

        # Create the exercise data
        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 3,
            "m": 2,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.PERSEUS_QUESTION},
        }

        # Create the Perseus exercise
        self._create_perseus_zip(exercise_data)

        # Verify that a file was created
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.EXERCISE)

        # Validate the zip file
        zip_file, _ = self._validate_perseus_zip(exercise_file)

        with zip_file.open(f"{item.assessment_id}.json") as f:
            processed_perseus_json = f.read().decode("utf-8")

        for graphie_file in graphie_files:
            filename = graphie_file.original_filename
            # Check that both SVG and JSON parts of the graphie were included
            svg_path = f"images/{filename}.svg"
            json_path = f"images/{filename}-data.json"
            self.assertIn(svg_path, zip_file.namelist())
            self.assertIn(json_path, zip_file.namelist())

            # Verify the content of the SVG and JSON files
            svg_content = zip_file.read(svg_path).decode("utf-8")
            json_content = zip_file.read(json_path).decode("utf-8")
            self.assertIn("<svg>", svg_content)
            self.assertIn("version", json_content)

            # The preceding $ here seems to have been unintended, as it was originally meant to be stripped out
            # of the URL using exercises.CONTENT_STORAGE_REGEX. However, this is not used for URL replacement,
            # and instead, we just do a replace using the CONTENT_STORAGE_PLACEHOLDER that does not have the preceding $
            # meaning that the resultant paths are preceded by $ and the IMG_PLACEHOLDER.
            self.assertIn(
                f"web+graphie://${exercises.IMG_PLACEHOLDER}/images/{filename}",
                processed_perseus_json,
            )

    def test_formula_processing(self):
        """Test that formulas are properly processed in exercises"""
        # Create a question with LaTeX formulas
        question_text = "Solve: $$\\frac{x}{2} = 3$$"
        item = self._create_assessment_item(
            exercises.INPUT_QUESTION,
            question_text,
            [{"answer": "6", "correct": True, "order": 1}],
        )

        # Create the exercise data
        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 1,
            "m": 1,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.INPUT_QUESTION},
        }

        # Create the Perseus exercise
        self._create_perseus_zip(exercise_data)

        # Verify that a file was created
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.EXERCISE)

        # Validate the zip file
        zip_file, _ = self._validate_perseus_zip(exercise_file)

        # Check that the formula was properly processed
        item_json = json.loads(
            zip_file.read(f"{item.assessment_id}.json").decode("utf-8")
        )
        self.assertIn("$\\frac{x}{2} = 3$", item_json["question"]["content"])

    def test_multiple_formula_processing(self):
        """Test that formulas are properly processed in exercises"""
        # Create a question with LaTeX formulas
        question_text = "Solve: $$\\frac{x}{2} = 3$$ or maybe $$\\frac{y}{2} = 7$$"
        item = self._create_assessment_item(
            exercises.INPUT_QUESTION,
            question_text,
            [{"answer": "6", "correct": True, "order": 1}],
        )

        # Create the exercise data
        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 1,
            "m": 1,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.INPUT_QUESTION},
        }

        # Create the Perseus exercise
        self._create_perseus_zip(exercise_data)

        # Verify that a file was created
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.EXERCISE)

        # Validate the zip file
        zip_file, _ = self._validate_perseus_zip(exercise_file)

        # Check that the formula was properly processed
        item_json = json.loads(
            zip_file.read(f"{item.assessment_id}.json").decode("utf-8")
        )
        self.assertIn(
            "Solve: $\\frac{x}{2} = 3$ or maybe $\\frac{y}{2} = 7$",
            item_json["question"]["content"],
        )

    def test_multiple_question_types(self):
        """Test creating an exercise with multiple question types"""
        # Create different types of questions

        image_file = fileobj_exercise_image()
        image_url = exercises.CONTENT_STORAGE_FORMAT.format(f"{image_file.filename()}")
        item1 = self._create_assessment_item(
            exercises.SINGLE_SELECTION,
            f"![2 + 2]({image_url})\nWhat is 2+2?",
            [
                {"answer": "4", "correct": True, "order": 1},
                {"answer": "5", "correct": False, "order": 2},
            ],
            assessment_id="1234567890abcdef1234567890abcdef",
        )

        image_file.assessment_item = item1
        image_file.save()

        item2 = self._create_assessment_item(
            exercises.MULTIPLE_SELECTION,
            "Select all prime numbers:",
            [
                {"answer": "2", "correct": True, "order": 1},
                {"answer": "3", "correct": True, "order": 2},
                {"answer": "4", "correct": False, "order": 3},
                {"answer": "5", "correct": True, "order": 4},
            ],
            assessment_id="2134567890abcdef1234567890abcdef",
        )

        item3 = self._create_assessment_item(
            exercises.INPUT_QUESTION,
            "What is the length in meters of the bar in the capital of France?",
            [{"answer": "1", "order": 1}],
            assessment_id="2314567890abcdef1234567890abcdef",
        )

        item4, _ = self._create_perseus_item()

        # Create the exercise data
        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 3,
            "m": 2,
            "all_assessment_items": [
                item1.assessment_id,
                item2.assessment_id,
                item3.assessment_id,
                item4.assessment_id,
            ],
            "assessment_mapping": {
                item1.assessment_id: exercises.SINGLE_SELECTION,
                item2.assessment_id: exercises.MULTIPLE_SELECTION,
                item3.assessment_id: exercises.INPUT_QUESTION,
                item4.assessment_id: exercises.PERSEUS_QUESTION,
            },
        }

        # Create the Perseus exercise
        self._create_perseus_zip(exercise_data)

        # Verify that a file was created
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.EXERCISE)

        # Validate the zip file
        zip_file, parsed_data = self._validate_perseus_zip(exercise_file)

        # Check that all question files are included
        self.assertIn(f"{item1.assessment_id}.json", zip_file.namelist())
        self.assertIn(f"{item2.assessment_id}.json", zip_file.namelist())
        self.assertIn(f"{item3.assessment_id}.json", zip_file.namelist())
        self.assertIn(f"{item4.assessment_id}.json", zip_file.namelist())

        # Verify the exercise data
        self.assertEqual(len(parsed_data["all_assessment_items"]), 4)
        self.assertEqual(
            parsed_data["assessment_mapping"][item1.assessment_id],
            exercises.SINGLE_SELECTION,
        )
        self.assertEqual(
            parsed_data["assessment_mapping"][item2.assessment_id],
            exercises.MULTIPLE_SELECTION,
        )
        self.assertEqual(
            parsed_data["assessment_mapping"][item3.assessment_id],
            exercises.INPUT_QUESTION,
        )
        self.assertEqual(
            parsed_data["assessment_mapping"][item4.assessment_id],
            exercises.PERSEUS_QUESTION,
        )

        # Check specifics of each question type
        item1_json = json.loads(
            zip_file.read(f"{item1.assessment_id}.json").decode("utf-8")
        )
        self.assertIn("What is 2+2?", item1_json["question"]["content"])
        self.assertFalse(
            item1_json["question"]["widgets"]["radio 1"]["options"]["multipleSelect"]
        )

        item2_json = json.loads(
            zip_file.read(f"{item2.assessment_id}.json").decode("utf-8")
        )
        self.assertIn("Select all prime numbers:", item2_json["question"]["content"])
        self.assertTrue(
            item2_json["question"]["widgets"]["radio 1"]["options"]["multipleSelect"]
        )

        item3_json = json.loads(
            zip_file.read(f"{item3.assessment_id}.json").decode("utf-8")
        )
        self.assertIn(
            "What is the length in meters of the bar in the capital of France?",
            item3_json["question"]["content"],
        )
        self.assertEqual(
            item3_json["question"]["widgets"]["numeric-input 1"]["options"]["answers"][
                0
            ]["value"],
            1,
        )
        # Hard code the generated checksum for the file for this test.
        # Only change this and the contents of this test if we have decided that
        # we are deliberately changing the archive generation algorithm for perseus files.
        self.assertEqual(exercise_file.checksum, "94de065d485e52d56c3032074044e7c3")

    def _test_image_resizing_in_field(self, field_type):
        """
        Helper method to test image resizing in different fields (question, answer, hint)

        Args:
            field_type: 'question', 'answer', or 'hint'
        """
        # Create a base image file
        base_image = fileobj_exercise_image(size=(400, 300), color="blue")
        base_image_url = exercises.CONTENT_STORAGE_FORMAT.format(base_image.filename())

        # Create scenarios for each field type
        if field_type == "question":
            # For questions, test multiple sizes of the same image
            question_text = (
                f"First resized image: ![shape1]({base_image_url} =200x150)\n"
                f"Second resized image (same): ![shape2]({base_image_url} =200x150)\n"
                f"Third resized image (different): ![shape3]({base_image_url} =100x75)"
            )
            answers = [{"answer": "Answer A", "correct": True, "order": 1}]
            hints = [{"hint": "Hint text", "order": 1}]

        elif field_type == "answer":
            # For answers, test across multiple answer options
            question_text = "Select the correct description:"
            answers = [
                {
                    "answer": f"This is a blue rectangle ![shape1]({base_image_url} =200x150)",
                    "correct": True,
                    "order": 1,
                },
                {
                    "answer": f"This is a big blue rectangle ![shape2]({base_image_url} =200x150)",
                    "correct": False,
                    "order": 2,
                },
                {
                    "answer": f"This is a small blue rectangle ![shape3]({base_image_url} =100x75)",
                    "correct": False,
                    "order": 3,
                },
            ]
            hints = [{"hint": "Hint text", "order": 1}]

        else:  # hint
            # For hints, test across multiple hints
            question_text = "What shape is this?"
            answers = [{"answer": "Rectangle", "correct": True, "order": 1}]
            hints = [
                {
                    "hint": f"Look at the proportions ![shape1]({base_image_url} =200x150)",
                    "order": 1,
                },
                {
                    "hint": f"It has four sides ![shape2]({base_image_url} =200x150)",
                    "order": 2,
                },
                {
                    "hint": f"It's a small rectangle ![shape3]({base_image_url} =100x75)",
                    "order": 3,
                },
            ]

        # Create the assessment item
        item_type = exercises.SINGLE_SELECTION

        item = self._create_assessment_item(item_type, question_text, answers, hints)

        # Associate the image with the assessment item
        base_image.assessment_item = item
        base_image.save()

        # Create exercise data
        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 2,
            "m": 1,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: item_type},
        }

        # Create the Perseus exercise
        self._create_perseus_zip(exercise_data)

        # Get the exercise file
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.EXERCISE)

        # Validate the zip file
        zip_file, _ = self._validate_perseus_zip(exercise_file)

        # Get all image files in the zip
        image_files = [
            name for name in zip_file.namelist() if name.startswith("images/")
        ]

        # Verify we have exactly 2 image files (one for each unique size)
        # We should have one at 200x150 and one at 100x75
        self.assertEqual(
            len(image_files),
            2,
            f"Expected 2 resized images, found {len(image_files)}: {image_files}",
        )

        # Load the item JSON to check image references
        item_json = json.loads(
            zip_file.read(f"{item.assessment_id}.json").decode("utf-8")
        )

        # Determine where to look for the content based on field type
        if field_type == "question":
            content = item_json["question"]["content"]
        elif field_type == "answer":
            answer_widgets = item_json["question"]["widgets"]
            radio_widget = answer_widgets.get("radio 1") or answer_widgets.get(
                "checkbox 1"
            )
            content = "".join(
                choice["content"] for choice in radio_widget["options"]["choices"]
            )
        else:  # hint
            content = "".join(hint["content"] for hint in item_json["hints"])

        # Extract image filenames from the content using regex
        pattern = r"images/([a-f0-9]+\.(png|jpg|jpeg|gif))"
        matches = re.findall(pattern, content)

        # Get unique image filenames
        unique_image_files = set(match[0] for match in matches)

        # Check if we have references to both resized versions
        self.assertEqual(
            len(unique_image_files),
            2,
            f"Expected 2 unique image references, found {len(unique_image_files)}",
        )

        # The original image should not be present unless it was referenced without resizing
        original_image_name = f"images/{base_image.filename()}"
        self.assertNotIn(
            original_image_name,
            zip_file.namelist(),
            "Original image should not be included when only resized versions are used",
        )

        # Verify that the same dimensions use the same resized image
        if field_type == "question":
            # Extract the first two image references (they should be the same)
            first_image_refs = re.findall(
                pattern, content.split("Second resized image")[0]
            )
            second_image_refs = re.findall(
                pattern,
                content.split("Second resized image")[1].split("Third resized image")[
                    0
                ],
            )

            self.assertEqual(
                first_image_refs[0][0],
                second_image_refs[0][0],
                "Same-sized images should reference the same file",
            )

        # Check that the images in the zip have different filesizes
        image_sizes = []
        for image_file in image_files:
            image_sizes.append(len(zip_file.read(image_file)))

        # Images with different dimensions should have different sizes
        self.assertNotEqual(
            image_sizes[0],
            image_sizes[1],
            "Different sized images should have different file sizes",
        )

    def test_image_resizing_in_question(self):
        """Test image resizing functionality in question content"""
        self._test_image_resizing_in_field("question")

    def test_image_resizing_in_answer(self):
        """Test image resizing functionality in answer content"""
        self._test_image_resizing_in_field("answer")

    def test_image_resizing_in_hint(self):
        """Test image resizing functionality in hint content"""
        self._test_image_resizing_in_field("hint")

    def test_image_with_same_resize_dimensions(self):
        """Test handling of multiple instances of the same image with the same resize dimensions"""
        # Create a base image file
        base_image = fileobj_exercise_image(size=(400, 300), color="green")
        base_image_url = exercises.CONTENT_STORAGE_FORMAT.format(base_image.filename())

        # Create a question with multiple references to the same image with same dimensions
        question_text = (
            f"First image: ![shape1]({base_image_url} =200x150)\n"
            f"Second image: ![shape2]({base_image_url} =200x150)\n"
            f"Third image: ![shape3]({base_image_url} =200x150)"
        )

        # Create the assessment item
        item = self._create_assessment_item(
            exercises.SINGLE_SELECTION,
            question_text,
            [{"answer": "Answer", "correct": True, "order": 1}],
        )

        # Associate the image with the assessment item
        base_image.assessment_item = item
        base_image.save()

        # Create exercise data
        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 1,
            "m": 1,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.SINGLE_SELECTION},
        }

        # Create the Perseus exercise
        self._create_perseus_zip(exercise_data)

        # Get the exercise file
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.EXERCISE)

        # Validate the zip file
        zip_file, _ = self._validate_perseus_zip(exercise_file)

        # Get all image files in the zip
        image_files = [
            name for name in zip_file.namelist() if name.startswith("images/")
        ]

        # Verify we have exactly 1 image file (all references are to the same size)
        self.assertEqual(
            len(image_files),
            1,
            f"Expected 1 resized image, found {len(image_files)}: {image_files}",
        )

        # Check that all three references point to the same image file
        item_json = json.loads(
            zip_file.read(f"{item.assessment_id}.json").decode("utf-8")
        )
        content = item_json["question"]["content"]

        # Extract image filenames from the content
        pattern = r"images/([a-f0-9]+\.(png|jpg|jpeg|gif))"
        matches = re.findall(pattern, content)

        # All matches should reference the same file
        self.assertEqual(len(matches), 3, "Expected 3 image references")
        self.assertEqual(
            matches[0][0],
            matches[1][0],
            "First and second image references should match",
        )
        self.assertEqual(
            matches[1][0],
            matches[2][0],
            "Second and third image references should match",
        )

    def test_image_with_similar_dimensions(self):
        """Test handling of image resizing with similar but not identical dimensions"""
        # Create a base image file
        base_image = fileobj_exercise_image(size=(400, 300), color="red")
        base_image_url = exercises.CONTENT_STORAGE_FORMAT.format(base_image.filename())

        # Create a question with images that have very similar dimensions
        # The code has logic to use the same image if dimensions are within 1% of each other
        question_text = (
            f"First image: ![shape1]({base_image_url} =200x150)\n"
            f"Second image (0.5% larger): ![shape2]({base_image_url} =201x151)\n"  # Within 1% threshold
            f"Third image (1.5% larger): ![shape3]({base_image_url} =203x152)"  # Outside 1% threshold
        )

        # Create the assessment item
        item = self._create_assessment_item(
            exercises.SINGLE_SELECTION,
            question_text,
            [{"answer": "Answer", "correct": True, "order": 1}],
        )

        # Associate the image with the assessment item
        base_image.assessment_item = item
        base_image.save()

        # Create exercise data
        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 1,
            "m": 1,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.SINGLE_SELECTION},
        }

        # Create the Perseus exercise
        self._create_perseus_zip(exercise_data)

        # Get the exercise file
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.EXERCISE)

        # Validate the zip file
        zip_file, _ = self._validate_perseus_zip(exercise_file)

        # Get all image files in the zip
        image_files = [
            name for name in zip_file.namelist() if name.startswith("images/")
        ]

        # Verify we have exactly 2 image files (200x150/201x151 should share one file, 203x152 gets its own)
        self.assertEqual(
            len(image_files),
            2,
            f"Expected 2 resized images, found {len(image_files)}: {image_files}",
        )

        # Check the image references in the content
        item_json = json.loads(
            zip_file.read(f"{item.assessment_id}.json").decode("utf-8")
        )
        content = item_json["question"]["content"]

        # Extract image filenames from the content
        pattern = r"images/([a-f0-9]+\.(png|jpg|jpeg|gif))"
        matches = re.findall(pattern, content)

        # First and second should match (within 1% threshold)
        # Third should be different (outside threshold)
        first_image = matches[0][0]
        second_image = matches[1][0]
        third_image = matches[2][0]

        self.assertEqual(
            first_image,
            second_image,
            "Images with dimensions within 1% threshold should use the same file",
        )
        self.assertNotEqual(
            first_image,
            third_image,
            "Images with dimensions outside 1% threshold should use different files",
        )

    def test_image_with_zero_width(self):
        # Create a base image file
        base_image = fileobj_exercise_image(size=(400, 300), color="red")
        base_image_url = exercises.CONTENT_STORAGE_FORMAT.format(base_image.filename())

        # Create a question with images that have very similar dimensions
        # The code has logic to use the same image if dimensions are within 1% of each other
        question_text = (
            f"First image: ![shape1]({base_image_url} =0x150)\n"
            f"Second image: ![shape2]({base_image_url} =200x151)"
        )

        # Create the assessment item
        item = self._create_assessment_item(
            exercises.SINGLE_SELECTION,
            question_text,
            [{"answer": "Answer", "correct": True, "order": 1}],
        )

        # Associate the image with the assessment item
        base_image.assessment_item = item
        base_image.save()

        # Create exercise data
        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 1,
            "m": 1,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.SINGLE_SELECTION},
        }

        # Create the Perseus exercise
        self._create_perseus_zip(exercise_data)

        # Get the exercise file
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.EXERCISE)

        # Validate the zip file
        zip_file, _ = self._validate_perseus_zip(exercise_file)

        # Get all image files in the zip
        image_files = [
            name for name in zip_file.namelist() if name.startswith("images/")
        ]

        # Verify we have exactly 1 image file
        self.assertEqual(
            len(image_files),
            1,
            f"Expected 1 resized images, found {len(image_files)}: {image_files}",
        )


class TestQTIExerciseCreation(StudioTestCase):
    """
    Tests for the QTI exercise generator which handles QTI format exercise file generation.

    These tests verify that the function correctly packages assessment items
    into a valid QTI Content Package with IMS manifest and individual item XML files.
    """

    maxDiff = None

    def setUp(self):
        self.setUpBase()

        # Create an exercise node
        self.exercise_node = ContentNode.objects.create(
            title="Test QTI Exercise",
            node_id="1234567890abcdef1234567890abcded",
            content_id="fedcba0987654321fedcba0987654321",
            kind_id=content_kinds.EXERCISE,
            parent=self.channel.main_tree,
            extra_fields=json.dumps(
                {
                    "randomize": True,
                    "options": {
                        "completion_criteria": {
                            "model": "mastery",
                            "threshold": {
                                "mastery_model": exercises.M_OF_N,
                                "m": 3,
                                "n": 5,
                            },
                        }
                    },
                }
            ),
        )

    def _create_assessment_item(
        self, item_type, question_text, answers, hints=None, assessment_id=None
    ):
        """Helper to create assessment items with the right structure"""
        if hints is None:
            hints = [{"hint": "This is a hint", "order": 1}]

        item = AssessmentItem.objects.create(
            contentnode=self.exercise_node,
            assessment_id=assessment_id or uuid4().hex,
            type=item_type,
            question=question_text,
            answers=json.dumps(answers),
            hints=json.dumps(hints),
            raw_data="{}",
            order=len(self.exercise_node.assessment_items.all()) + 1,
            randomize=True,
        )
        return item

    def _create_qti_zip(self, exercise_data):
        """Create QTI exercise zip using the generator"""
        generator = QTIExerciseGenerator(
            self.exercise_node,
            exercise_data,
            self.channel.id,
            "en-US",
            user_id=self.user.id,
        )
        return generator.create_exercise_archive()

    def _normalize_xml(self, xml_string):
        return "".join(x.strip() for x in xml_string.split("\n"))

    def _validate_qti_zip_structure(self, exercise_file):
        """Helper to validate basic structure of the QTI Content Package"""
        # Use Django's storage backend to read the file
        with storage.open(exercise_file.file_on_disk.name, "rb") as f:
            zip_data = f.read()

        zip_file = zipfile.ZipFile(BytesIO(zip_data))

        # Check that the imsmanifest.xml file exists
        assert (
            "imsmanifest.xml" in zip_file.namelist()
        ), "imsmanifest.xml not found in zip file"

        return zip_file

    def test_basic_qti_exercise_creation(self):
        """Test the basic creation of a QTI exercise with a single question"""
        # Create a simple multiple choice question with 32-char hex ID
        assessment_id = "1234567890abcdef1234567890abcdef"
        item = self._create_assessment_item(
            exercises.SINGLE_SELECTION,
            "What is 2+2?",
            [
                {"answer": "4", "correct": True, "order": 1},
                {"answer": "3", "correct": False, "order": 2},
                {"answer": "5", "correct": False, "order": 3},
            ],
            assessment_id=assessment_id,
        )

        # Create the exercise data structure
        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 5,
            "m": 3,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.SINGLE_SELECTION},
        }

        # Call the function to create the QTI exercise
        self._create_qti_zip(exercise_data)

        # Verify that a file was created for the node
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.QTI_ZIP)
        self.assertIsNotNone(exercise_file)
        self.assertEqual(exercise_file.file_format_id, "zip")

        # Validate the contents of the zip file
        zip_file = self._validate_qti_zip_structure(exercise_file)

        # Check that the assessment item XML file exists
        expected_item_file = "items/KEjRWeJCrze8SNFZ4kKvN7w.xml"
        self.assertIn(expected_item_file, zip_file.namelist())

        # Get the actual QTI item XML content
        actual_item_xml = zip_file.read(expected_item_file).decode("utf-8")

        # Expected QTI item XML content
        expected_item_xml = """<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="KEjRWeJCrze8SNFZ4kKvN7w" title="Test QTI Exercise 1" adaptive="false" time-dependent="false" language="en-US" tool-name="kolibri" tool-version="0.1">
    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
            <qti-value>choice_0</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float" />
    <qti-item-body>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" max-choices="1" min-choices="0" orientation="vertical">
            <qti-prompt>
                <p>What is 2+2?</p>
            </qti-prompt>
            <qti-simple-choice identifier="choice_0" show-hide="show" fixed="false"><p>4</p></qti-simple-choice>
            <qti-simple-choice identifier="choice_1" show-hide="show" fixed="false"><p>3</p></qti-simple-choice>
            <qti-simple-choice identifier="choice_2" show-hide="show" fixed="false"><p>5</p></qti-simple-choice>
        </qti-choice-interaction>
    </qti-item-body>
    <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />
</qti-assessment-item>"""

        # Compare normalized XML
        self.assertEqual(
            self._normalize_xml(expected_item_xml),
            self._normalize_xml(actual_item_xml),
        )

        # Get the actual IMS manifest content
        actual_manifest_xml = zip_file.read("imsmanifest.xml").decode("utf-8")

        # Expected IMS manifest XML content
        expected_manifest_xml = """<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="http://www.imsglobal.org/xsd/qti/qtiv3p0/imscp_v1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/qti/qtiv3p0/imscp_v1p2 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqtiv3p0_imscpv1p2_v1p0.xsd" identifier="K_ty6CYdlQyH-3LoJh2VDIQ" version="1.0">
    <metadata>
        <schema>QTI Package</schema>
        <schemaversion>3.0.0</schemaversion>
    </metadata>
    <organizations />
    <resources>
        <resource identifier="KEjRWeJCrze8SNFZ4kKvN7w" type="imsqti_item_xmlv3p0" href="items/KEjRWeJCrze8SNFZ4kKvN7w.xml">
            <file href="items/KEjRWeJCrze8SNFZ4kKvN7w.xml" />
        </resource>
    </resources>
</manifest>"""

        # Compare normalized XML
        self.assertEqual(
            self._normalize_xml(expected_manifest_xml),
            self._normalize_xml(actual_manifest_xml),
        )

    def test_multiple_selection_question(self):
        """Test QTI generation for multiple selection questions"""
        assessment_id = "abcdef1234567890abcdef1234567890"
        item = self._create_assessment_item(
            exercises.MULTIPLE_SELECTION,
            "Select all prime numbers:",
            [
                {"answer": "2", "correct": True, "order": 1},
                {"answer": "3", "correct": True, "order": 2},
                {"answer": "4", "correct": False, "order": 3},
                {"answer": "5", "correct": True, "order": 4},
            ],
            assessment_id=assessment_id,
        )

        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 1,
            "m": 1,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.MULTIPLE_SELECTION},
        }

        self._create_qti_zip(exercise_data)
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.QTI_ZIP)
        zip_file = self._validate_qti_zip_structure(exercise_file)

        qti_id = hex_to_qti_id(assessment_id)

        # Check the QTI XML for multiple selection specifics
        expected_item_file = f"items/{qti_id}.xml"
        actual_item_xml = zip_file.read(expected_item_file).decode("utf-8")

        # Expected QTI item XML content for multiple selection
        expected_item_xml = """<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="Kq83vEjRWeJCrze8SNFZ4kA" title="Test QTI Exercise 1" adaptive="false" time-dependent="false" language="en-US" tool-name="kolibri" tool-version="0.1">
    <qti-response-declaration identifier="RESPONSE" cardinality="multiple" base-type="identifier">
        <qti-correct-response>
            <qti-value>choice_0</qti-value>
            <qti-value>choice_1</qti-value>
            <qti-value>choice_3</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float" />
    <qti-item-body>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" max-choices="4" min-choices="0" orientation="vertical">
            <qti-prompt>
                <p>Select all prime numbers:</p>
            </qti-prompt>
            <qti-simple-choice identifier="choice_0" show-hide="show" fixed="false"><p>2</p></qti-simple-choice>
            <qti-simple-choice identifier="choice_1" show-hide="show" fixed="false"><p>3</p></qti-simple-choice>
            <qti-simple-choice identifier="choice_2" show-hide="show" fixed="false"><p>4</p></qti-simple-choice>
            <qti-simple-choice identifier="choice_3" show-hide="show" fixed="false"><p>5</p></qti-simple-choice>
        </qti-choice-interaction>
    </qti-item-body>
    <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />
</qti-assessment-item>"""

        # Compare normalized XML
        self.assertEqual(
            self._normalize_xml(expected_item_xml),
            self._normalize_xml(actual_item_xml),
        )

    def test_free_response_question(self):
        assessment_id = "fedcba0987654321fedcba0987654321"
        item = self._create_assessment_item(
            exercises.FREE_RESPONSE,
            "What is the capital of France?",
            [{"answer": "Paris", "correct": True, "order": 1}],
            assessment_id=assessment_id,
        )

        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 1,
            "m": 1,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.FREE_RESPONSE},
        }

        self._create_qti_zip(exercise_data)
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.QTI_ZIP)
        zip_file = self._validate_qti_zip_structure(exercise_file)

        # Check the QTI XML for text entry specifics
        expected_item_file = "items/K_ty6CYdlQyH-3LoJh2VDIQ.xml"
        actual_item_xml = zip_file.read(expected_item_file).decode("utf-8")

        # Expected QTI item XML content for text entry
        expected_item_xml = """<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="K_ty6CYdlQyH-3LoJh2VDIQ" title="Test QTI Exercise 1" adaptive="false" time-dependent="false" language="en-US" tool-name="kolibri" tool-version="0.1">
    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">
        <qti-correct-response>
            <qti-value>Paris</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float" />
    <qti-item-body>
        <div>
            <p>What is the capital of France?</p>
            <p><qti-text-entry-interaction response-identifier="RESPONSE" expected-length="50" placeholder-text="Enter your answer here" /></p>
        </div>
    </qti-item-body>
    <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />
</qti-assessment-item>"""

        # Compare normalized XML
        self.assertEqual(
            self._normalize_xml(expected_item_xml),
            self._normalize_xml(actual_item_xml),
        )

    def test_free_response_question_with_maths(self):
        assessment_id = "fedcba0987654321fedcba0987654321"
        item = self._create_assessment_item(
            exercises.FREE_RESPONSE,
            "$$\\sum_n^sxa^n$$\n\n What does this even mean?",
            [{"answer": "Nothing", "correct": True, "order": 1}],
            assessment_id=assessment_id,
        )

        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 1,
            "m": 1,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.FREE_RESPONSE},
        }

        self._create_qti_zip(exercise_data)
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.QTI_ZIP)
        zip_file = self._validate_qti_zip_structure(exercise_file)

        # Check the QTI XML for text entry specifics
        expected_item_file = "items/K_ty6CYdlQyH-3LoJh2VDIQ.xml"
        actual_item_xml = zip_file.read(expected_item_file).decode("utf-8")

        # Expected QTI item XML content for text entry
        expected_item_xml = """<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="K_ty6CYdlQyH-3LoJh2VDIQ" title="Test QTI Exercise 1" adaptive="false" time-dependent="false" language="en-US" tool-name="kolibri" tool-version="0.1">
    <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="string">
        <qti-correct-response>
            <qti-value>Nothing</qti-value>
        </qti-correct-response>
    </qti-response-declaration>
    <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float" />
    <qti-item-body>
        <div>
            <math display="block">
                <semantics>
                    <mrow>
                        <msubsup><mo>∑</mo><mi>n</mi><mi>s</mi></msubsup>
                        <mi>x</mi>
                        <msup><mi>a</mi><mi>n</mi></msup>
                    </mrow>
                    <annotation encoding="application/x-tex">\\sum_n^sxa^n</annotation>
                </semantics>
            </math>
            <p>What does this even mean?</p>
            <p><qti-text-entry-interaction response-identifier="RESPONSE" expected-length="50" placeholder-text="Enter your answer here" /></p>
        </div>
    </qti-item-body>
    <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />
</qti-assessment-item>"""

        # Compare normalized XML
        self.assertEqual(
            self._normalize_xml(expected_item_xml),
            self._normalize_xml(actual_item_xml),
        )

    def test_perseus_question_rejection(self):
        """Test that Perseus questions are properly rejected"""
        assessment_id = "aaaa1111bbbb2222cccc3333dddd4444"
        # Create a mock Perseus question
        item = AssessmentItem.objects.create(
            contentnode=self.exercise_node,
            assessment_id=assessment_id,
            type=exercises.PERSEUS_QUESTION,
            raw_data='{"question": {"content": "Perseus content"}}',
            order=1,
        )

        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 1,
            "m": 1,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.PERSEUS_QUESTION},
        }

        # Should raise ValueError for Perseus questions
        with self.assertRaises(ValueError) as context:
            self._create_qti_zip(exercise_data)

        self.assertIn("Perseus questions are not supported", str(context.exception))

    def test_exercise_with_image(self):
        """Test QTI exercise generation with images"""
        assessment_id = "1111aaaa2222bbbb3333cccc4444dddd"
        image_file = fileobj_exercise_image()

        # Create a question with image
        image_url = exercises.CONTENT_STORAGE_FORMAT.format(f"{image_file.filename()}")
        question_text = f"Identify the shape: ![shape]({image_url})"
        item = self._create_assessment_item(
            exercises.SINGLE_SELECTION,
            question_text,
            [
                {"answer": "Circle", "correct": True, "order": 1},
                {"answer": "Square", "correct": False, "order": 2},
            ],
            assessment_id=assessment_id,
        )

        # Associate the image with the assessment item
        image_file.assessment_item = item
        image_file.save()

        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 1,
            "m": 1,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.SINGLE_SELECTION},
        }

        self._create_qti_zip(exercise_data)
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.QTI_ZIP)
        zip_file = self._validate_qti_zip_structure(exercise_file)

        # Check that the image file was included in the zip
        image_path = f"items/images/{image_file.filename()}"
        self.assertIn(image_path, zip_file.namelist())

        # Get the actual manifest content
        actual_manifest_xml = zip_file.read("imsmanifest.xml").decode("utf-8")

        # Expected manifest should include the image file dependency
        expected_manifest_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="http://www.imsglobal.org/xsd/qti/qtiv3p0/imscp_v1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/qti/qtiv3p0/imscp_v1p2 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqtiv3p0_imscpv1p2_v1p0.xsd" identifier="K_ty6CYdlQyH-3LoJh2VDIQ" version="1.0">
    <metadata>
        <schema>QTI Package</schema>
        <schemaversion>3.0.0</schemaversion>
    </metadata>
    <organizations />
    <resources>
        <resource identifier="KERGqqiIiu7szM8zMRETd3Q" type="imsqti_item_xmlv3p0" href="items/KERGqqiIiu7szM8zMRETd3Q.xml">
            <file href="items/KERGqqiIiu7szM8zMRETd3Q.xml" />
            <file href="{image_path}" />
        </resource>
    </resources>
</manifest>"""

        # Compare normalized XML
        self.assertEqual(
            self._normalize_xml(expected_manifest_xml),
            self._normalize_xml(actual_manifest_xml),
        )

        self.assertEqual(exercise_file.checksum, "51ba0d6e3c7f30239265c5294abe6ac5")

    def test_question_with_mathematical_content(self):
        """Test QTI generation for questions containing mathematical formulas converted to MathML"""
        assessment_id = "dddddddddddddddddddddddddddddddd"
        item = self._create_assessment_item(
            exercises.SINGLE_SELECTION,
            "Solve the equation $$\\frac{x}{2} = 3$$ for x. What is the value of x?",
            [
                {"answer": "6", "correct": True, "order": 1},
                {"answer": "3", "correct": False, "order": 2},
                {"answer": "1.5", "correct": False, "order": 3},
                {"answer": "9", "correct": False, "order": 4},
            ],
            assessment_id=assessment_id,
        )

        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 1,
            "m": 1,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.SINGLE_SELECTION},
        }

        self._create_qti_zip(exercise_data)
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.QTI_ZIP)
        zip_file = self._validate_qti_zip_structure(exercise_file)

        qti_id = hex_to_qti_id(assessment_id)

        # Check the QTI XML for mathematical content conversion to MathML
        expected_item_file = f"items/{qti_id}.xml"
        actual_item_xml = zip_file.read(expected_item_file).decode("utf-8")

        # Expected QTI item XML content with MathML conversion
        expected_item_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
    <qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="{qti_id}" title="Test QTI Exercise 1" adaptive="false" time-dependent="false" language="en-US" tool-name="kolibri" tool-version="0.1">
        <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
            <qti-correct-response>
                <qti-value>choice_0</qti-value>
            </qti-correct-response>
        </qti-response-declaration>
        <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float" />
        <qti-item-body>
            <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" max-choices="1" min-choices="0" orientation="vertical">
                <qti-prompt>
                    <p>Solve the equation <math display="inline"><semantics><mrow><mfrac><mrow><mi>x</mi></mrow><mrow><mn>2</mn></mrow></mfrac><mo>=</mo><mn>3</mn></mrow><annotation encoding="application/x-tex">\\frac{{x}}{{2}} = 3</annotation></semantics></math> for x. What is the value of x?</p>
                </qti-prompt>
                <qti-simple-choice identifier="choice_0" show-hide="show" fixed="false"><p>6</p></qti-simple-choice>
                <qti-simple-choice identifier="choice_1" show-hide="show" fixed="false"><p>3</p></qti-simple-choice>
                <qti-simple-choice identifier="choice_2" show-hide="show" fixed="false"><p>1.5</p></qti-simple-choice>
                <qti-simple-choice identifier="choice_3" show-hide="show" fixed="false"><p>9</p></qti-simple-choice>
            </qti-choice-interaction>
        </qti-item-body>
        <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />
    </qti-assessment-item>"""

        # Compare normalized XML
        self.assertEqual(
            self._normalize_xml(expected_item_xml),
            self._normalize_xml(actual_item_xml),
        )

    def test_multiple_question_types_mixed(self):
        """Test creating a QTI exercise with multiple supported question types"""
        # Create different types of supported questions with 32-char hex IDs
        assessment_id1 = "1111111111111111111111111111111a"
        assessment_id2 = "2222222222222222222222222222222b"
        assessment_id3 = "3333333333333333333333333333333c"

        qti_id1 = hex_to_qti_id(assessment_id1)
        qti_id2 = hex_to_qti_id(assessment_id2)
        qti_id3 = hex_to_qti_id(assessment_id3)

        item1 = self._create_assessment_item(
            exercises.SINGLE_SELECTION,
            "What is 2+2?",
            [
                {"answer": "4", "correct": True, "order": 1},
                {"answer": "5", "correct": False, "order": 2},
            ],
            assessment_id=assessment_id1,
        )

        item2 = self._create_assessment_item(
            exercises.MULTIPLE_SELECTION,
            "Select all even numbers:",
            [
                {"answer": "2", "correct": True, "order": 1},
                {"answer": "3", "correct": False, "order": 2},
                {"answer": "4", "correct": True, "order": 3},
                {"answer": "5", "correct": False, "order": 4},
            ],
            assessment_id=assessment_id2,
        )

        item3 = self._create_assessment_item(
            exercises.INPUT_QUESTION,
            "What is the capital of Spain?",
            [{"answer": "Madrid", "correct": True, "order": 1}],
            assessment_id=assessment_id3,
        )

        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 3,
            "m": 2,
            "all_assessment_items": [
                item1.assessment_id,
                item2.assessment_id,
                item3.assessment_id,
            ],
            "assessment_mapping": {
                item1.assessment_id: exercises.SINGLE_SELECTION,
                item2.assessment_id: exercises.MULTIPLE_SELECTION,
                item3.assessment_id: exercises.INPUT_QUESTION,
            },
        }

        self._create_qti_zip(exercise_data)
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.QTI_ZIP)
        zip_file = self._validate_qti_zip_structure(exercise_file)

        # Check that all question XML files are included
        expected_files = [
            f"items/{qti_id1}.xml",
            f"items/{qti_id2}.xml",
            f"items/{qti_id3}.xml",
        ]

        for expected_file in expected_files:
            self.assertIn(expected_file, zip_file.namelist())

        # Get the actual manifest content
        actual_manifest_xml = zip_file.read("imsmanifest.xml").decode("utf-8")

        # Expected manifest with all three resources
        expected_manifest_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="http://www.imsglobal.org/xsd/qti/qtiv3p0/imscp_v1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/qti/qtiv3p0/imscp_v1p2 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqtiv3p0_imscpv1p2_v1p0.xsd" identifier="K_ty6CYdlQyH-3LoJh2VDIQ" version="1.0">
    <metadata>
        <schema>QTI Package</schema>
        <schemaversion>3.0.0</schemaversion>
    </metadata>
    <organizations />
    <resources>
        <resource identifier="{qti_id1}" type="imsqti_item_xmlv3p0" href="items/{qti_id1}.xml">
            <file href="items/{qti_id1}.xml" />
        </resource>
        <resource identifier="{qti_id2}" type="imsqti_item_xmlv3p0" href="items/{qti_id2}.xml">
            <file href="items/{qti_id2}.xml" />
        </resource>
        <resource identifier="{qti_id3}" type="imsqti_item_xmlv3p0" href="items/{qti_id3}.xml">
            <file href="items/{qti_id3}.xml" />
        </resource>
    </resources>
</manifest>"""

        # Compare normalized XML
        self.assertEqual(
            self._normalize_xml(expected_manifest_xml),
            self._normalize_xml(actual_manifest_xml),
        )

        self.assertEqual(exercise_file.checksum, "8e488543ef52f0b153553eaf9fb51419")

    def test_unsupported_question_type(self):
        """Test that unsupported question types raise appropriate errors"""
        assessment_id = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        # Create an item with an unsupported type
        item = AssessmentItem.objects.create(
            contentnode=self.exercise_node,
            assessment_id=assessment_id,
            type="UNSUPPORTED_TYPE",
            question="This is an unsupported question type",
            answers="[]",
            hints="[]",
            raw_data="{}",
            order=1,
        )

        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 1,
            "m": 1,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: "UNSUPPORTED_TYPE"},
        }

        with self.assertRaises(ValueError) as context:
            self._create_qti_zip(exercise_data)

        self.assertIn("Unsupported question type", str(context.exception))

    def test_manifest_structure_single_item(self):
        """Test that the IMS manifest has proper structure and metadata for a single item"""
        assessment_id = "cccccccccccccccccccccccccccccccc"
        item = self._create_assessment_item(
            exercises.SINGLE_SELECTION,
            "Test question",
            [{"answer": "Test answer", "correct": True, "order": 1}],
            assessment_id=assessment_id,
        )

        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 1,
            "m": 1,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.SINGLE_SELECTION},
        }

        self._create_qti_zip(exercise_data)
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.QTI_ZIP)
        zip_file = self._validate_qti_zip_structure(exercise_file)

        # Get the actual manifest content
        actual_manifest_xml = zip_file.read("imsmanifest.xml").decode("utf-8")

        # Expected exact manifest structure
        expected_manifest_xml = """<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="http://www.imsglobal.org/xsd/qti/qtiv3p0/imscp_v1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/qti/qtiv3p0/imscp_v1p2 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqtiv3p0_imscpv1p2_v1p0.xsd" identifier="K_ty6CYdlQyH-3LoJh2VDIQ" version="1.0">
    <metadata>
        <schema>QTI Package</schema>
        <schemaversion>3.0.0</schemaversion>
    </metadata>
    <organizations />
    <resources>
        <resource identifier="KzMzMzMzMzMzMzMzMzMzMzA" type="imsqti_item_xmlv3p0" href="items/KzMzMzMzMzMzMzMzMzMzMzA.xml">
            <file href="items/KzMzMzMzMzMzMzMzMzMzMzA.xml" />
        </resource>
    </resources>
</manifest>"""

        # Compare normalized XML
        self.assertEqual(
            self._normalize_xml(expected_manifest_xml),
            self._normalize_xml(actual_manifest_xml),
        )
