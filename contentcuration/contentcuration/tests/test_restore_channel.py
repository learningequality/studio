# -*- coding: utf-8 -*-
import datetime
import json
import uuid
from io import BytesIO

from django.core.files.storage import default_storage
from django.template.loader import render_to_string
from django.utils.translation import activate
from django.utils.translation import deactivate
from le_utils.constants import exercises
from mixer.backend.django import mixer
from mock import MagicMock
from mock import patch

from .base import StudioTestCase
from contentcuration.models import AssessmentItem
from contentcuration.models import generate_object_storage_name
from contentcuration.utils.import_tools import create_channel
from contentcuration.utils.import_tools import generate_assessment_item
from contentcuration.utils.import_tools import process_content


thumbnail_path = "/content/thumbnail.png"
ASSESSMENT_DATA = {
    "input-question-test": {
        "template": "perseus/input_question.json",
        "type": exercises.INPUT_QUESTION,
        "question": "Input question",
        "question_images": [{"name": "test.jpg", "width": 12.71, "height": 12.12}],
        "hints": [{"hint": "Hint 1"}],
        "answers": [
            {"answer": "1", "correct": True, "images": []},
            {"answer": "2", "correct": True, "images": []},
        ],
        "order": 0,
    },
    "multiple-selection-test": {
        "template": "perseus/multiple_selection.json",
        "type": exercises.MULTIPLE_SELECTION,
        "question": "Multiple selection question",
        "question_images": [],
        "hints": [],
        "answers": [
            {"answer": "A", "correct": True, "images": []},
            {"answer": "B", "correct": True, "images": []},
            {"answer": "C", "correct": False, "images": []},
        ],
        "multiple_select": True,
        "order": 1,
        "randomize": False,
    },
    "single-selection-test": {
        "template": "perseus/multiple_selection.json",
        "type": exercises.SINGLE_SELECTION,
        "question": "Single select question",
        "question_images": [],
        "hints": [{"hint": "Hint test"}],
        "answers": [
            {"answer": "Correct answer", "correct": True, "images": []},
            {"answer": "Incorrect answer", "correct": False, "images": []},
        ],
        "multiple_select": False,
        "order": 2,
        "randomize": True,
    },
    "perseus-question-test": {
        "template": "perseus/perseus_question.json",
        "type": exercises.PERSEUS_QUESTION,
        "order": 3,
        "raw_data": "{}",
    },
}


class ChannelRestoreUtilityFunctionTestCase(StudioTestCase):
    @patch(
        "contentcuration.utils.import_tools.write_to_thumbnail_file",
        return_value=thumbnail_path,
    )
    def setUp(self, thumb_mock):
        self.id = uuid.uuid4().hex
        self.name = "test name"
        self.description = "test description"
        self.thumbnail_encoding = "base64 string"
        self.root_pk = uuid.uuid4()
        self.version = 7
        self.last_updated = datetime.datetime.now()
        self.cursor_mock = MagicMock()
        self.cursor_mock.execute.return_value.fetchone.return_value = (
            self.id,
            self.name,
            self.description,
            self.thumbnail_encoding,
            self.root_pk,
            self.version,
            self.last_updated,
        )
        self.channel, _ = create_channel(self.cursor_mock, self.id, self.admin_user)

    def test_restore_channel_id(self):
        self.assertEqual(self.channel.id, self.id)

    def test_restore_channel_name(self):
        self.assertEqual(self.channel.name, self.name)

    def test_restore_channel_description(self):
        self.assertEqual(self.channel.description, self.description)

    def test_restore_channel_thumbnail(self):
        self.assertEqual(self.channel.thumbnail, thumbnail_path)

    def test_restore_channel_thumbnail_encoding(self):
        self.assertEqual(
            self.channel.thumbnail_encoding["base64"], self.thumbnail_encoding
        )

    def test_restore_channel_version(self):
        self.assertEqual(self.channel.version, self.version)


class PerseusRestoreTestCase(StudioTestCase):
    def setUp(self):
        super(PerseusRestoreTestCase, self).setUp()
        image_path = generate_object_storage_name("test", "test.png")
        default_storage.save(image_path, BytesIO(b"test"))

    def test_process_content(self):
        tests = [
            {"content": "test 1", "output": "test 1", "images": {}},
            {
                "content": "test 2 ![test](${☣ LOCALPATH}/images/test.png)",
                "output": "test 2 ![test](${☣ CONTENTSTORAGE}/test.png)",
                "images": {},
            },
            {
                "content": "test 3 ![](${☣ LOCALPATH}/images/test.png)",
                "output": "test 3 ![](${☣ CONTENTSTORAGE}/test.png =50x50)",
                "images": {
                    "${☣ LOCALPATH}/images/test.png": {"width": 50, "height": 50}
                },
            },
            {
                "content": "test 4 ![](${☣ LOCALPATH}/images/test.png) ![](${☣ LOCALPATH}/images/test.png)",
                "output": "test 4 ![](${☣ CONTENTSTORAGE}/test.png) ![](${☣ CONTENTSTORAGE}/test.png)",
                "images": {},
            },
            {
                "content": "test 5  $\\sqrt{36}+\\frac{1}{2}$ ",
                "output": "test 5 $$\\sqrt{36}+\\frac{1}{2}$$",
                "images": {},
            },
            {
                "content": "test 6 $\\frac{1}{2}$ $\\frac{3}{2}$",
                "output": "test 6 $$\\frac{1}{2}$$ $$\\frac{3}{2}$$",
                "images": {},
            },
        ]
        for test in tests:
            result = process_content(test, mixer.blend(AssessmentItem))
            self.assertEqual(result, test["output"])

    def test_generate_assessment_item(self):
        # Run in Spanish to ensure we are properly creating JSON with non-localized numbers
        activate("es-es")
        for assessment_id, data in list(ASSESSMENT_DATA.items()):
            assessment_data = json.loads(
                render_to_string(data["template"], data).encode("utf-8", "ignore")
            )
            assessment_item = generate_assessment_item(
                assessment_id, data["order"], data["type"], assessment_data
            )
            self.assertEqual(assessment_item.type, data["type"])
            self.assertEqual(assessment_item.question, data.get("question", ""))
            self.assertEqual(assessment_item.randomize, bool(data.get("randomize")))
            self.assertEqual(assessment_item.raw_data, data.get("raw_data", ""))
            for hint in json.loads(assessment_item.hints):
                self.assertTrue(
                    any(h for h in data["hints"] if h["hint"] == hint["hint"])
                )
            for answer in json.loads(assessment_item.answers):
                self.assertTrue(
                    any(
                        a
                        for a in data["answers"]
                        if a["answer"] == str(answer["answer"])
                        and a["correct"] == answer["correct"]
                    )
                )
        deactivate()
