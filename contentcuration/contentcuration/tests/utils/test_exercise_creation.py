# flake8: noqa: E501
# Ignore line length issues in this file
# Black will autoformat where possible, so this is not too egregious
# but will allow our long strings where necessary.
import json
import os
import re
import zipfile
from io import BytesIO
from tempfile import TemporaryDirectory
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
from contentcuration.tests.utils.qti.test_convert import _normalize_xml
from contentcuration.tests.utils.qti.test_validation import _item_xml
from contentcuration.tests.utils.qti.test_validation import VALID_CHOICE_ITEM
from contentcuration.utils.assessment.perseus import PerseusExerciseGenerator
from contentcuration.utils.assessment.qti.archive import hex_to_qti_id
from contentcuration.utils.assessment.qti.archive import QTIExerciseGenerator
from contentcuration.utils.assessment.qti.validation import parse_qti_xml
from contentcuration.utils.assessment.qti.validation import validate_qti_item


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

    def test_write_raw_perseus_assets_returns_paths_and_writes_files(self):
        """`_write_raw_perseus_assets` writes an item's images/graphie assets into
        the given directory and returns their package-relative paths."""
        image_file = fileobj_exercise_image()
        graphie_file = fileobj_exercise_graphie(original_filename="mygraphie")

        item = AssessmentItem.objects.create(
            contentnode=self.exercise_node,
            assessment_id="fedcba0987654321fedcba0987654321",
            type=exercises.PERSEUS_QUESTION,
            raw_data="{}",
            order=1,
            randomize=True,
        )
        image_file.assessment_item = item
        image_file.save()
        graphie_file.assessment_item = item
        graphie_file.save()

        generator = PerseusExerciseGenerator(
            self.exercise_node, {}, self.channel.id, "en-US", user_id=self.user.id
        )
        with TemporaryDirectory() as tempdir:
            generator.tempdir = tempdir
            written = generator._write_raw_perseus_assets(item, "perseus/images")

            image_path = (
                f"perseus/images/{image_file.checksum}.{image_file.file_format_id}"
            )
            svg_path = f"perseus/images/{graphie_file.original_filename}.svg"
            json_path = f"perseus/images/{graphie_file.original_filename}-data.json"

            self.assertIn(image_path, written)
            self.assertIn(svg_path, written)
            self.assertIn(json_path, written)

            for path in (image_path, svg_path, json_path):
                self.assertTrue(os.path.exists(os.path.join(tempdir, path)))

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

    def test_image_key_full_path_regression(self):
        """Regression test for image key containing full path in Perseus files.

        This test ensures that the 'images' object in Perseus JSON files uses the full path
        as the key (${IMG_PLACEHOLDER}/images/filename.ext) rather than just the filename.

        Bug: The image key in the 'images' object was being set to just the filename
        instead of the full path with IMG_PLACEHOLDER prefix.
        """
        # Create an image file
        image_file = fileobj_exercise_image()

        # Create a question with image that has dimensions (to trigger images object generation)
        image_url = exercises.CONTENT_STORAGE_FORMAT.format(image_file.filename())
        question_text = f"Identify the shape: ![shape]({image_url} =100x100)"
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
            "n": 1,
            "m": 1,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.SINGLE_SELECTION},
        }

        # Create the Perseus exercise
        self._create_perseus_zip(exercise_data)

        # Verify that a file was created
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.EXERCISE)

        # Validate the zip file
        zip_file, _ = self._validate_perseus_zip(exercise_file)

        # Get the Perseus item JSON content
        item_json = json.loads(
            zip_file.read(f"{item.assessment_id}.json").decode("utf-8")
        )

        # The critical regression check: images object keys should contain full path
        question_images = item_json["question"]["images"]

        # Should have exactly one image entry
        self.assertEqual(
            len(question_images),
            1,
            f"Expected 1 image in images object, got {len(question_images)}: {list(question_images.keys())}",
        )

        # Get the image key from the images object
        image_key = list(question_images.keys())[0]

        # The key should be the full path, not just the filename
        expected_full_path = (
            f"${exercises.IMG_PLACEHOLDER}/images/{image_file.filename()}"
        )
        self.assertEqual(
            image_key,
            expected_full_path,
            f"Image key should be '{expected_full_path}' but got: '{image_key}'",
        )

        # Verify the image has the expected dimensions
        image_data = question_images[image_key]
        self.assertEqual(image_data["width"], 100)
        self.assertEqual(image_data["height"], 100)

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

        # Verify that the dimensions have been stripped from the markdown
        for file_name in unique_image_files:
            # Because we can't predict the set ordering, just confirm that
            # neither dimension descriptor is applied.
            first_file = f"{file_name} =200x150"
            self.assertNotIn(first_file, content)
            second_file = f"{file_name} =100x75"
            self.assertNotIn(second_file, content)

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

    NATIVE_ITEM_XML = _item_xml(
        "native_item_1",
        "Native Item",
        '<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">'
        "<qti-correct-response><qti-value>choice_0</qti-value></qti-correct-response>"
        "</qti-response-declaration>",
        '<qti-choice-interaction response-identifier="RESPONSE" max-choices="1" min-choices="0" '
        'orientation="vertical"><qti-prompt>Pick one. '
        '<img src="{checksum}.{ext}" alt="diagram" /></qti-prompt>'
        '<qti-simple-choice identifier="choice_0" show-hide="show" fixed="false">A</qti-simple-choice>'
        '<qti-simple-choice identifier="choice_1" show-hide="show" fixed="false">B</qti-simple-choice>'
        "</qti-choice-interaction>",
    )

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

    def _create_native_qti_item(self, raw_data, assessment_id=None):
        """Helper to create a native type=QTI assessment item with the given raw_data."""
        return AssessmentItem.objects.create(
            contentnode=self.exercise_node,
            assessment_id=assessment_id or uuid4().hex,
            type=exercises.QTI,
            question="",
            answers="[]",
            hints="[]",
            raw_data=raw_data,
            order=len(self.exercise_node.assessment_items.all()) + 1,
            randomize=False,
        )

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

    def _create_perseus_zip(self, exercise_data):
        """Create Perseus exercise zip using the generator"""
        generator = PerseusExerciseGenerator(
            self.exercise_node,
            exercise_data,
            self.channel.id,
            "en-US",
            user_id=self.user.id,
        )
        return generator.create_exercise_archive()

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
        # (per-type conversion output is covered by tests/utils/qti/test_convert.py)
        expected_item_file = "items/KEjRWeJCrze8SNFZ4kKvN7w.xml"
        self.assertIn(expected_item_file, zip_file.namelist())

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
            _normalize_xml(expected_manifest_xml),
            _normalize_xml(actual_manifest_xml),
        )

    def _render_single_item_xml(self, assessment_id, hints):
        """Package a single-question QTI exercise and return that item's XML."""
        item = self._create_assessment_item(
            exercises.SINGLE_SELECTION,
            "What is 2+2?",
            [
                {"answer": "4", "correct": True, "order": 1},
                {"answer": "3", "correct": False, "order": 2},
            ],
            hints=hints,
            assessment_id=assessment_id,
        )
        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 5,
            "m": 3,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.SINGLE_SELECTION},
        }
        self._create_qti_zip(exercise_data)
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.QTI_ZIP)
        zip_file = self._validate_qti_zip_structure(exercise_file)
        return zip_file.read(f"items/{hex_to_qti_id(assessment_id)}.xml").decode(
            "utf-8"
        )

    def test_qti_exercise_with_hints_produces_catalog_info(self):
        item_xml = self._render_single_item_xml(
            "1234567890abcdef1234567890abcdef",
            [
                {"hint": "Think about pairs.", "order": 1},
                {"hint": "It's 4.", "order": 2},
            ],
        )
        self.assertEqual(item_xml.count('support="ext:kolibri-hint"'), 2)
        self.assertLess(item_xml.index("Think about pairs."), item_xml.index("It's 4."))

    def test_qti_exercise_without_hints_produces_no_catalog_info(self):
        item_xml = self._render_single_item_xml("abcdef1234567890abcdef1234567890", [])
        self.assertNotIn("<qti-catalog-info", item_xml)

    def test_perseus_custom_interaction_embedded_with_native_qti(self):
        """A node mixing a native QTI item and a raw Perseus question yields one
        QTI package: the native item, plus the Perseus question wrapped as a
        ``qti-custom-interaction`` with its JSON and image packaged and declared."""
        native_id = "1234567890abcdef1234567890abcdef"
        native_item = self._create_native_qti_item(
            VALID_CHOICE_ITEM, assessment_id=native_id
        )

        image_file = fileobj_exercise_image()
        image_url = exercises.CONTENT_STORAGE_FORMAT.format(image_file.filename())
        perseus_id = "aaaa1111bbbb2222cccc3333dddd4444"
        perseus_item = AssessmentItem.objects.create(
            contentnode=self.exercise_node,
            assessment_id=perseus_id,
            type=exercises.PERSEUS_QUESTION,
            raw_data=json.dumps(
                {"question": {"content": f"See ![shape]({image_url})", "images": {}}},
                ensure_ascii=False,
            ),
            order=2,
            randomize=False,
        )
        image_file.assessment_item = perseus_item
        image_file.save()

        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 1,
            "m": 1,
            "all_assessment_items": [
                native_item.assessment_id,
                perseus_item.assessment_id,
            ],
            "assessment_mapping": {
                native_item.assessment_id: exercises.QTI,
                perseus_item.assessment_id: exercises.PERSEUS_QUESTION,
            },
        }

        self._create_qti_zip(exercise_data)
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.QTI_ZIP)
        zip_file = self._validate_qti_zip_structure(exercise_file)

        namelist = zip_file.namelist()
        perseus_item_path = f"items/{hex_to_qti_id(perseus_id)}.xml"
        perseus_json_path = f"perseus/{perseus_id}.json"
        image_path = f"perseus/images/{image_file.filename()}"

        # Native QTI item and the Perseus wrapper item both present.
        self.assertIn("items/item_1.xml", namelist)
        self.assertIn(perseus_item_path, namelist)
        # Perseus JSON and its image packaged.
        self.assertIn(perseus_json_path, namelist)
        self.assertIn(image_path, namelist)

        # The wrapper item validates and references the Perseus JSON.
        wrapper_xml = zip_file.read(perseus_item_path).decode("utf-8")
        self.assertTrue(validate_qti_item(wrapper_xml.encode("utf-8")).is_valid)
        parsed = parse_qti_xml(wrapper_xml.encode("utf-8"))
        custom = parsed.getroot().iter("{*}qti-custom-interaction")
        custom_el = next(custom)
        self.assertEqual(custom_el.get("data-type"), "perseus")
        self.assertEqual(custom_el.get("data-perseus-path"), perseus_json_path)

        # The Perseus JSON's image reference was rewritten to the packaged path.
        packaged_json = zip_file.read(perseus_json_path).decode("utf-8")
        self.assertIn(
            f"${exercises.IMG_PLACEHOLDER}/perseus/images/{image_file.filename()}",
            packaged_json,
        )

        # The manifest lists the JSON and image as files of the perseus resource.
        manifest_xml = zip_file.read("imsmanifest.xml").decode("utf-8")
        self.assertIn(f'<file href="{perseus_json_path}" />', manifest_xml)
        self.assertIn(f'<file href="{image_path}" />', manifest_xml)

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
            <file href="images/{image_file.filename()}" />
        </resource>
    </resources>
</manifest>"""

        # Compare normalized XML
        self.assertEqual(
            _normalize_xml(expected_manifest_xml),
            _normalize_xml(actual_manifest_xml),
        )

        self.assertEqual(exercise_file.checksum, "08f316508478ea4710b96473d0e5e1f3")

    def test_image_resizing(self):
        # Create a base image file
        base_image = fileobj_exercise_image(size=(400, 300), color="blue")
        base_image_url = exercises.CONTENT_STORAGE_FORMAT.format(base_image.filename())

        # For questions, test multiple sizes of the same image
        question_text = (
            f"First resized image: ![shape1]({base_image_url} =200x150)\n\n"
            f"Second resized image (same): ![shape2]({base_image_url} =200x150)\n\n"
            f"Third resized image (different): ![shape3]({base_image_url} =100x75)"
        )
        answers = [{"answer": "Answer A", "correct": True, "order": 1}]
        hints = [{"hint": "Hint text", "order": 1}]

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
        self._create_qti_zip(exercise_data)

        exercise_file = self.exercise_node.files.get(preset_id=format_presets.QTI_ZIP)
        zip_file = self._validate_qti_zip_structure(exercise_file)

        # Get all image files in the zip
        image_files = [
            name for name in zip_file.namelist() if name.startswith("items/images/")
        ]

        # Verify we have exactly 2 image files (one for each unique size)
        # We should have one at 200x150 and one at 100x75
        self.assertEqual(
            len(image_files),
            2,
            f"Expected 2 resized images, found {len(image_files)}: {image_files}",
        )

        # The original image should not be present unless it was referenced without resizing
        original_image_name = f"images/{base_image.filename()}"
        self.assertNotIn(
            original_image_name,
            zip_file.namelist(),
            "Original image should not be included when only resized versions are used",
        )

        qti_id = hex_to_qti_id(item.assessment_id)

        # Check the QTI XML for mathematical content conversion to MathML
        expected_item_file = f"items/{qti_id}.xml"
        actual_item_xml = zip_file.read(expected_item_file).decode("utf-8")

        # Expected QTI item XML content with MathML conversion
        expected_item_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
        <qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd" identifier="{qti_id}" title="Test QTI Exercise 1" adaptive="false" time-dependent="false" xml:lang="en-US" tool-name="kolibri" tool-version="0.1">
        <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
        <qti-correct-response>
        <qti-value>choice_0</qti-value>
        </qti-correct-response>
        </qti-response-declaration>
        <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float" />
        <qti-item-body>
        <qti-choice-interaction response-identifier="RESPONSE" shuffle="true" max-choices="1" min-choices="0" orientation="vertical">
        <qti-prompt>
            <p>First resized image: <img alt="shape1" src="images/b8f3062ca5795e39ff813958296b4884.jpg" /></p>
            <p>Second resized image (same): <img alt="shape2" src="images/b8f3062ca5795e39ff813958296b4884.jpg" /></p>
            <p>Third resized image (different): <img alt="shape3" src="images/abb0589d29a3852a5ebfd2726a832761.jpg" /></p>
        </qti-prompt>
        <qti-simple-choice identifier="choice_0" show-hide="show" fixed="false">
        <p>Answer A</p>
        </qti-simple-choice>
        </qti-choice-interaction>
        </qti-item-body>
        <qti-catalog-info>
        <qti-catalog id="kolibri-hints">
        <qti-card support="ext:kolibri-hint">
        <qti-html-content><p>Hint text</p></qti-html-content>
        </qti-card>
        </qti-catalog>
        </qti-catalog-info>
        <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct" />
        </qti-assessment-item>"""

        # Compare normalized XML
        self.assertEqual(
            _normalize_xml(expected_item_xml),
            _normalize_xml(actual_item_xml),
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
            _normalize_xml(expected_manifest_xml),
            _normalize_xml(actual_manifest_xml),
        )

        self.assertEqual(exercise_file.checksum, "f4689243ba9f9b5e1abdc874d2d7527d")

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
            _normalize_xml(expected_manifest_xml),
            _normalize_xml(actual_manifest_xml),
        )

    def test_native_qti_item_written_verbatim(self):
        """The item XML in the zip must byte-match the authored raw_data."""
        raw_data = _item_xml(
            "native_item_1",
            "Native Item",
            '<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">'
            "<qti-correct-response><qti-value>choice_0</qti-value></qti-correct-response>"
            "</qti-response-declaration>",
            '<qti-choice-interaction response-identifier="RESPONSE" max-choices="1" min-choices="0" '
            'orientation="vertical"><qti-prompt>Pick one.</qti-prompt>'
            '<qti-simple-choice identifier="choice_0" show-hide="show" fixed="false">A</qti-simple-choice>'
            '<qti-simple-choice identifier="choice_1" show-hide="show" fixed="false">B</qti-simple-choice>'
            "</qti-choice-interaction>",
        )
        item = self._create_native_qti_item(raw_data)
        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 5,
            "m": 3,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.QTI},
        }
        self._create_qti_zip(exercise_data)
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.QTI_ZIP)
        zip_file = self._validate_qti_zip_structure(exercise_file)
        self.assertIn("items/native_item_1.xml", zip_file.namelist())
        self.assertEqual(
            zip_file.read("items/native_item_1.xml").decode("utf-8"), raw_data
        )

    def test_native_qti_item_media_included_and_addressed(self):
        # fileobj_exercise_image() writes real bytes to storage keyed by their
        # actual md5 checksum + "jpg" ext -- use that real checksum/ext rather
        # than a hardcoded one, or _write_qti_media_files' storage.open() call
        # finds nothing there (see test_exercise_with_image, same file).
        image_file = fileobj_exercise_image()
        raw_data = self.NATIVE_ITEM_XML.format(
            checksum=image_file.checksum, ext=image_file.file_format_id
        )
        item = self._create_native_qti_item(raw_data)
        image_file.assessment_item = item
        image_file.save()
        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 5,
            "m": 3,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.QTI},
        }
        self._create_qti_zip(exercise_data)
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.QTI_ZIP)
        zip_file = self._validate_qti_zip_structure(exercise_file)
        media_filename = f"{image_file.checksum}.{image_file.file_format_id}"
        # Media files can't sit bare alongside the item XML in items/ - they go in
        # items/images/, matching the legacy generator's layout.
        self.assertIn(f"items/images/{media_filename}", zip_file.namelist())
        self.assertNotIn(f"items/{media_filename}", zip_file.namelist())
        manifest = zip_file.read("imsmanifest.xml").decode("utf-8")
        self.assertIn(f"images/{media_filename}", manifest)

        item_xml = zip_file.read("items/native_item_1.xml").decode("utf-8")
        self.assertEqual(
            item_xml, raw_data.replace(media_filename, f"images/{media_filename}")
        )

    def test_native_qti_item_invalid_raw_data_is_skipped(self):
        """An item that fails schema validation is logged and excluded, not fatal to publish."""
        invalid_raw_data = VALID_CHOICE_ITEM.replace(
            'orientation="vertical"', 'orientation="sideways"'
        )
        item = self._create_native_qti_item(invalid_raw_data)
        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 5,
            "m": 3,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.QTI},
        }
        with self.assertLogs(level="ERROR") as logs:
            self._create_qti_zip(exercise_data)
        self.assertTrue(
            any("failed schema validation" in message for message in logs.output)
        )
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.QTI_ZIP)
        zip_file = self._validate_qti_zip_structure(exercise_file)
        self.assertEqual(
            [name for name in zip_file.namelist() if name.startswith("items/")], []
        )

    def test_native_qti_item_missing_media_file_is_logged_and_omitted(self):
        """A dangling media reference is logged and skipped, not fatal to publish."""
        raw_data = self.NATIVE_ITEM_XML.format(checksum="b" * 32, ext="png")
        item = self._create_native_qti_item(raw_data)  # no File row linked
        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 5,
            "m": 3,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.QTI},
        }
        with self.assertLogs(level="ERROR") as logs:
            self._create_qti_zip(exercise_data)
        self.assertTrue(
            any("no matching File record linked" in message for message in logs.output)
        )
        exercise_file = self.exercise_node.files.get(preset_id=format_presets.QTI_ZIP)
        zip_file = self._validate_qti_zip_structure(exercise_file)
        self.assertIn("items/native_item_1.xml", zip_file.namelist())
        self.assertNotIn(f"items/{'b' * 32}.png", zip_file.namelist())

    def test_native_qti_duplicate_identifier_raises(self):
        item1 = self._create_native_qti_item(VALID_CHOICE_ITEM)
        item2 = self._create_native_qti_item(
            VALID_CHOICE_ITEM
        )  # same "item_1" identifier
        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 5,
            "m": 3,
            "all_assessment_items": [item1.assessment_id, item2.assessment_id],
            "assessment_mapping": {
                item1.assessment_id: exercises.QTI,
                item2.assessment_id: exercises.QTI,
            },
        }
        with self.assertRaises(ValueError):
            self._create_qti_zip(exercise_data)

    def test_republish_replaces_stale_native_qti_archive(self):
        item = self._create_native_qti_item(VALID_CHOICE_ITEM)
        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 5,
            "m": 3,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.QTI},
        }
        self._create_qti_zip(exercise_data)
        first_checksum = self.exercise_node.files.get(
            preset_id=format_presets.QTI_ZIP
        ).checksum

        item.raw_data = VALID_CHOICE_ITEM.replace("Sample Item", "Renamed Item")
        item.save()
        self._create_qti_zip(exercise_data)

        self.assertEqual(
            self.exercise_node.files.filter(preset_id=format_presets.QTI_ZIP).count(), 1
        )
        second_checksum = self.exercise_node.files.get(
            preset_id=format_presets.QTI_ZIP
        ).checksum
        self.assertNotEqual(first_checksum, second_checksum)

    def test_native_qti_perseus_derivation(self):
        """A native QTI choice item is derived into a rendered Perseus item JSON."""
        catalog_info = (
            '<qti-catalog-info><qti-catalog id="kolibri-hints">'
            '<qti-card support="ext:kolibri-hint">'
            "<qti-html-content><p>First hint.</p></qti-html-content>"
            "</qti-card></qti-catalog></qti-catalog-info>"
        )
        raw_data = VALID_CHOICE_ITEM.replace(
            "<qti-response-processing", catalog_info + "<qti-response-processing"
        )
        item = self._create_native_qti_item(raw_data)
        exercise_data = {
            "mastery_model": exercises.M_OF_N,
            "randomize": True,
            "n": 5,
            "m": 3,
            "all_assessment_items": [item.assessment_id],
            "assessment_mapping": {item.assessment_id: exercises.QTI},
        }

        self._create_perseus_zip(exercise_data)

        exercise_file = self.exercise_node.files.get(preset_id=format_presets.EXERCISE)
        with storage.open(exercise_file.file_on_disk.name, "rb") as f:
            zip_file = zipfile.ZipFile(BytesIO(f.read()))

        # The derived item JSON is named by the QTI item's root identifier (not
        # the raw hex assessment_id), so it matches the id the QTI manifest
        # records in the node's assessment metadata — how older Kolibri resolves
        # the Perseus item. VALID_CHOICE_ITEM's root identifier is "item_1".
        qti_id = parse_qti_xml(raw_data.encode("utf-8")).getroot().get("identifier")
        self.assertIn("exercise.json", zip_file.namelist())
        self.assertIn(f"{qti_id}.json", zip_file.namelist())

        # exercise.json must reference the derived item by its root identifier
        # and legacy type (not the raw hex id / "qti"), so restore_channel's
        # extract_assessment_items opens the item JSON that actually ships and
        # generate_assessment_item gets a mappable type.
        exercise_json = json.loads(zip_file.read("exercise.json").decode("utf-8"))
        self.assertEqual(exercise_json["all_assessment_items"], [qti_id])
        self.assertEqual(
            exercise_json["assessment_mapping"],
            {qti_id: exercises.SINGLE_SELECTION},
        )

        item_json = json.loads(zip_file.read(f"{qti_id}.json").decode("utf-8"))
        # Prompt is derived from the QTI qti-prompt.
        self.assertIn("Select the correct answer.", item_json["question"]["content"])
        # Choices and the correct answer match the QTI item.
        choices = item_json["question"]["widgets"]["radio 1"]["options"]["choices"]
        self.assertEqual(
            {(choice["content"], choice["correct"]) for choice in choices},
            {("Option A", True), ("Option B", False)},
        )
        # The kolibri-hint catalog card is derived back into a Perseus hint.
        hint_content = "".join(hint["content"] for hint in item_json["hints"])
        self.assertIn("First hint.", hint_content)
