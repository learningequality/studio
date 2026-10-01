# -*- coding: utf-8 -*-
import datetime
import json
import sqlite3
import uuid
import zipfile
from io import BytesIO

import requests
from django.core.files.storage import default_storage
from django.template.loader import render_to_string
from django.utils.translation import activate
from django.utils.translation import deactivate
from le_utils.constants import content_kinds
from le_utils.constants import exercises
from le_utils.constants import format_presets
from mixer.backend.django import mixer
from mock import MagicMock
from mock import patch

from .base import StudioTestCase
from contentcuration.models import AssessmentItem
from contentcuration.models import ContentNode
from contentcuration.models import generate_object_storage_name
from contentcuration.tests.testdata import fileobj_exercise_image
from contentcuration.tests.utils.qti.test_validation import _item_xml
from contentcuration.utils.assessment.perseus import PerseusExerciseGenerator
from contentcuration.utils.assessment.qti.archive import QTIExerciseGenerator
from contentcuration.utils.assessment.qti.imsmanifest import (
    get_assessment_ids_from_manifest,
)
from contentcuration.utils.import_tools import create_assessment_items
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


class QTIRestoreTestCase(StudioTestCase):
    EDITOR_ITEM_XML = _item_xml(
        "item_1",
        "Editor Item",
        '<qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">'
        "<qti-correct-response><qti-value>choice_0</qti-value></qti-correct-response>"
        "</qti-response-declaration>",
        '<qti-choice-interaction response-identifier="RESPONSE" max-choices="1" min-choices="0" '
        'orientation="vertical"><qti-prompt>Pick one. <img src="{image}" alt="diagram" /></qti-prompt>'
        '<qti-simple-choice identifier="choice_0" show-hide="show" fixed="false">A</qti-simple-choice>'
        '<qti-simple-choice identifier="choice_1" show-hide="show" fixed="false">B</qti-simple-choice>'
        "</qti-choice-interaction>",
    )

    def setUp(self):
        self.setUpBase()
        self.source = self._create_exercise_node("1" * 32)
        self.restored = self._create_exercise_node("2" * 32)
        self.image = fileobj_exercise_image()
        self.image_name = f"{self.image.checksum}.{self.image.file_format_id}"

    def _create_exercise_node(self, node_id):
        return ContentNode.objects.create(
            title="Exercise",
            node_id=node_id,
            content_id=node_id,
            kind_id=content_kinds.EXERCISE,
            parent=self.channel.main_tree,
        )

    def _add_item(self, item_type, order, **fields):
        fields.setdefault("question", "")
        fields.setdefault("answers", "[]")
        fields.setdefault("hints", "[]")
        return AssessmentItem.objects.create(
            contentnode=self.source, type=item_type, order=order, **fields
        )

    def _add_editor_item(self, order):
        item = self._add_item(
            exercises.QTI,
            order,
            raw_data=self.EDITOR_ITEM_XML.format(image=self.image_name),
        )
        self.image.assessment_item = item
        self.image.save()
        return item

    def _add_legacy_item(self, order, question="Legacy question"):
        return self._add_item(
            exercises.INPUT_QUESTION,
            order,
            question=question,
            answers=json.dumps([{"answer": "1", "correct": True, "order": 1}]),
        )

    def _publish(self, generator_class):
        items = self.source.assessment_items.order_by("order")
        generator_class(
            self.source,
            {
                "mastery_model": exercises.M_OF_N,
                "randomize": True,
                "n": 5,
                "m": 3,
                "all_assessment_items": [i.assessment_id for i in items],
                "assessment_mapping": {i.assessment_id: i.type for i in items},
            },
            self.channel.id,
            "en-US",
            user_id=self.user.id,
        ).create_exercise_archive()

    def _restore(self, *presets, package=None, download_url="http://studio"):
        """package: QTI package content (or exception) served as-is, listed first."""
        rows, zips = [], {}
        if package is not None:
            rows.append(("e" * 32, "zip", format_presets.QTI_ZIP))
            zips["e" * 32] = package
        for preset in presets:
            file_obj = self.source.files.get(preset_id=preset)
            zips[file_obj.checksum] = self._stored_package(preset).getvalue()
            rows.append((file_obj.checksum, file_obj.file_format_id, preset))
        db = sqlite3.connect(":memory:")
        db.execute(
            "CREATE TABLE content_file (checksum, extension, preset, contentnode_id)"
        )
        db.executemany(
            "INSERT INTO content_file VALUES (?, ?, ?, ?)",
            [(*row, self.restored.node_id) for row in rows],
        )

        def fetch(url):
            content = zips[url.rsplit("/", 1)[1].split(".")[0]]
            if isinstance(content, Exception):
                raise content
            return [content]

        with patch(
            "contentcuration.utils.import_tools.requests.get",
            side_effect=fetch,
        ) as get:
            create_assessment_items(
                db.cursor(), self.restored, download_url=download_url
            )
        if download_url is None:
            get.assert_not_called()
        return list(self.restored.assessment_items.order_by("order"))

    def _republished_package(self, *generator_classes):
        self.source = self.restored
        for generator_class in generator_classes:
            self._publish(generator_class)
        return self._stored_package()

    def _stored_package(self, preset=format_presets.QTI_ZIP):
        package = self.source.files.get(preset_id=preset)
        with default_storage.open(package.file_on_disk.name, "rb") as f:
            return BytesIO(f.read())

    def _package_contents(self, package):
        with zipfile.ZipFile(package) as zf:
            return {
                name: zf.read(name)
                for name in zf.namelist()
                # Its manifest identifier is the node's content_id.
                if name != "imsmanifest.xml"
            }

    def _assert_republishes_source_package(self, *generator_classes):
        source_package = self._stored_package()
        source_archive = (
            self._stored_package(format_presets.EXERCISE)
            if PerseusExerciseGenerator in generator_classes
            else None
        )
        package = self._republished_package(*generator_classes)
        if source_archive:
            self.assertEqual(
                self._package_contents(self._stored_package(format_presets.EXERCISE)),
                self._package_contents(source_archive),
            )

        self.assertEqual(
            get_assessment_ids_from_manifest(package),
            get_assessment_ids_from_manifest(source_package),
        )
        self.assertEqual(
            self._package_contents(package), self._package_contents(source_package)
        )

    def _file_rows(self, item):
        return sorted(item.files.values_list("checksum", "file_format_id", "preset_id"))

    def _assert_restores_source_rows(self, restored):
        """Restored rows match their source items, bar what the package cannot hold."""
        source_items = list(self.source.assessment_items.order_by("order"))
        self.assertEqual(len(restored), len(source_items))
        for source_item, item in zip(source_items, restored):
            with self.subTest(order=source_item.order):
                self.assertEqual(item.order, source_item.order)
                self.assertEqual(self._file_rows(item), self._file_rows(source_item))
                if source_item.type == exercises.QTI:
                    # An editor item's identifier is not its assessment_id.
                    self.assertRegex(item.assessment_id, "^[0-9a-f]{32}$")
                else:
                    self.assertEqual(item.assessment_id, source_item.assessment_id)
                if source_item.type in (exercises.QTI, exercises.PERSEUS_QUESTION):
                    self.assertEqual(item.type, source_item.type)
                    self.assertEqual(item.raw_data, source_item.raw_data)
                else:
                    # Legacy questions are packaged converted to QTI.
                    self.assertEqual(item.type, exercises.QTI)

    def test_qti_only_node_restores_editor_and_legacy_items_as_qti(self):
        self._add_editor_item(0)
        self._add_legacy_item(1)
        self._publish(QTIExerciseGenerator)

        items = self._restore(format_presets.QTI_ZIP)

        self._assert_restores_source_rows(items)
        self.assertIn("Legacy question", items[1].raw_data)
        self._assert_republishes_source_package(QTIExerciseGenerator)

    def test_editor_item_with_non_canonical_id_gets_a_new_assessment_id(self):
        # Matches hex_to_qti_id's shape but sets its padding bits.
        identifier = "K" + "A" * 21 + "B"
        item = self._add_editor_item(0)
        item.raw_data = item.raw_data.replace(
            'identifier="item_1"', f'identifier="{identifier}"'
        )
        item.save()
        self._publish(QTIExerciseGenerator)

        (restored,) = self._restore(format_presets.QTI_ZIP)

        self.assertIn(identifier, restored.raw_data)
        self.assertNotEqual(restored.assessment_id, "0" * 32)
        self.assertRegex(restored.assessment_id, "^[0-9a-f]{32}$")

    def test_dual_published_node_restores_each_question_once(self):
        self._add_editor_item(0)
        self._add_legacy_item(1)
        self._publish(QTIExerciseGenerator)
        self._publish(PerseusExerciseGenerator)

        items = self._restore(format_presets.QTI_ZIP, format_presets.EXERCISE)

        self._assert_restores_source_rows(items)
        self._assert_republishes_source_package(
            QTIExerciseGenerator, PerseusExerciseGenerator
        )

    def test_sized_legacy_image_restores_from_package_and_republishes(self):
        item = self._add_legacy_item(
            0,
            question="Sized ![](${}/{} =50x50)".format(
                exercises.CONTENT_STORAGE_PLACEHOLDER, self.image_name
            ),
        )
        self.image.assessment_item = item
        self.image.save()
        self._publish(QTIExerciseGenerator)

        (restored,) = self._restore(format_presets.QTI_ZIP)

        self.assertEqual(restored.assessment_id, item.assessment_id)
        image = restored.files.get()
        image_name = f"{image.checksum}.{image.file_format_id}"
        self.assertIn(image_name, restored.raw_data)

        # The package holds the resized image only, so republishing is the
        # equivalence the restore can keep.
        self._assert_republishes_source_package(QTIExerciseGenerator)

    def _empty_package(self):
        buf = BytesIO()
        with zipfile.ZipFile(buf, "w") as zf:
            zf.writestr(
                "imsmanifest.xml",
                '<manifest xmlns="http://www.imsglobal.org/xsd/imscp_v1p1">'
                "<resources/></manifest>",
            )
        return buf.getvalue()

    def test_node_without_package_restores_from_exercise_archive(self):
        self._add_legacy_item(0)
        self._publish(PerseusExerciseGenerator)

        (item,) = self._restore(format_presets.EXERCISE)

        source_item = self.source.assessment_items.get()
        self.assertEqual(item.type, exercises.INPUT_QUESTION)
        self.assertEqual(item.assessment_id, source_item.assessment_id)
        self.assertEqual(item.order, source_item.order)
        self.assertEqual(item.question, source_item.question)
        # The archive stores a numeric answer as a number, not its source text.
        self.assertEqual(
            [(float(a["answer"]), a["correct"]) for a in json.loads(item.answers)],
            [
                (float(a["answer"]), a["correct"])
                for a in json.loads(source_item.answers)
            ],
        )

    def test_local_restore_reads_archives_from_storage(self):
        self._add_legacy_item(0)
        self._publish(QTIExerciseGenerator)
        self._publish(PerseusExerciseGenerator)

        for preset in (format_presets.QTI_ZIP, format_presets.EXERCISE):
            with self.subTest(preset=preset):
                self.restored.assessment_items.all().delete()
                (item,) = self._restore(preset, download_url=None)
                self.assertEqual(
                    item.assessment_id,
                    self.source.assessment_items.get().assessment_id,
                )

    def test_package_missing_a_listed_file_leaves_no_items(self):
        self._add_legacy_item(0)
        self._add_editor_item(1)
        self._publish(QTIExerciseGenerator)
        buf = BytesIO()
        with zipfile.ZipFile(self._stored_package()) as src, zipfile.ZipFile(
            buf, "w"
        ) as dst:
            for name in src.namelist():
                if "images/" not in name:
                    dst.writestr(name, src.read(name))

        items = self._restore(package=buf.getvalue())

        self.assertEqual(items, [])

    def test_unusable_package_restores_no_items(self):
        # The dual node's exercise archive holds QTI ids, which cannot republish.
        self._add_legacy_item(0)
        self._publish(QTIExerciseGenerator)
        self._publish(PerseusExerciseGenerator)

        for package in (
            self._empty_package(),
            b"<html>404</html>",
            requests.ConnectionError("gone"),
        ):
            with self.subTest(package=package), patch(
                "contentcuration.utils.import_tools.sys.stderr"
            ) as stderr:
                self.assertEqual(
                    self._restore(format_presets.EXERCISE, package=package), []
                )
                self.assertIn("Restoration Process Error", stderr.write.call_args[0][0])
