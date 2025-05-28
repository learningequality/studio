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
            f"Expected 2 resized images, found {len(image_files)}: {image_files}",
        )
