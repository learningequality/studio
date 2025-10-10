import json
import uuid

from django.urls import reverse
from le_utils.constants import content_kinds
from le_utils.constants import exercises

from contentcuration import models
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.tests.viewsets.base import generate_create_event
from contentcuration.tests.viewsets.base import generate_delete_event
from contentcuration.tests.viewsets.base import generate_update_event
from contentcuration.tests.viewsets.base import SyncTestMixin
from contentcuration.viewsets.sync.constants import ASSESSMENTITEM


class SyncTestCase(SyncTestMixin, StudioAPITestCase):
    @property
    def assessmentitem_metadata(self):
        return {
            "assessment_id": uuid.uuid4().hex,
            "contentnode": self.channel.main_tree.get_descendants()
            .filter(kind_id=content_kinds.EXERCISE)
            .first()
            .id,
        }

    @property
    def assessmentitem_db_metadata(self):
        return {
            "assessment_id": uuid.uuid4().hex,
            "contentnode_id": self.channel.main_tree.get_descendants()
            .filter(kind_id=content_kinds.EXERCISE)
            .first()
            .id,
        }

    def setUp(self):
        super(SyncTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)

    def test_create_assessmentitem(self):
        self.client.force_authenticate(user=self.user)
        assessmentitem = self.assessmentitem_metadata
        response = self.sync_changes(
            [
                generate_create_event(
                    [assessmentitem["contentnode"], assessmentitem["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem,
                    channel_id=self.channel.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.AssessmentItem.objects.get(
                assessment_id=assessmentitem["assessment_id"]
            )
        except models.AssessmentItem.DoesNotExist:
            self.fail("AssessmentItem was not created")

    def test_create_assessmentitem_no_node_permission(self):
        self.client.force_authenticate(user=self.user)
        new_channel = testdata.channel()
        new_channel_exercise = (
            new_channel.main_tree.get_descendants()
            .filter(kind_id=content_kinds.EXERCISE)
            .first()
            .id
        )
        assessmentitem = self.assessmentitem_metadata
        assessmentitem["contentnode"] = new_channel_exercise
        response = self.sync_changes(
            [
                generate_create_event(
                    [assessmentitem["contentnode"], assessmentitem["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem,
                    channel_id=new_channel.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.AssessmentItem.objects.get(
                assessment_id=assessmentitem["assessment_id"]
            )
            self.fail("AssessmentItem was created")
        except models.AssessmentItem.DoesNotExist:
            pass

    def test_create_assessmentitem_with_incorrect_file_placeholder_in_question(self):
        self.client.force_authenticate(user=self.user)
        assessmentitem = self.assessmentitem_metadata
        image_file = testdata.fileobj_exercise_image()
        image_file.uploaded_by = self.user
        image_file.save()
        question = "![alt_text](${}/{}.{})".format(
            exercises.IMG_PLACEHOLDER, image_file.checksum, image_file.file_format_id
        )

        assessmentitem["question"] = question
        response = self.sync_changes(
            [
                generate_create_event(
                    [assessmentitem["contentnode"], assessmentitem["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem,
                    channel_id=self.channel.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            ai = models.AssessmentItem.objects.get(
                assessment_id=assessmentitem["assessment_id"]
            )
        except models.AssessmentItem.DoesNotExist:
            self.fail("AssessmentItem was not created")
        try:
            file = ai.files.get()
            self.assertEqual(file.id, image_file.id)
            self.fail("File was updated")
        except models.File.DoesNotExist:
            pass

    def test_create_assessmentitem_with_file_question(self):
        self.client.force_authenticate(user=self.user)
        assessmentitem = self.assessmentitem_metadata
        image_file = testdata.fileobj_exercise_image()
        image_file.uploaded_by = self.user
        image_file.save()
        question = "![alt_text](${}/{}.{})".format(
            exercises.CONTENT_STORAGE_PLACEHOLDER,
            image_file.checksum,
            image_file.file_format_id,
        )

        assessmentitem["question"] = question
        response = self.sync_changes(
            [
                generate_create_event(
                    [assessmentitem["contentnode"], assessmentitem["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem,
                    channel_id=self.channel.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            ai = models.AssessmentItem.objects.get(
                assessment_id=assessmentitem["assessment_id"]
            )
        except models.AssessmentItem.DoesNotExist:
            self.fail("AssessmentItem was not created")
        try:
            file = ai.files.get()
            self.assertEqual(file.id, image_file.id)
        except models.File.DoesNotExist:
            self.fail("File was not updated")

    def test_create_assessmentitem_with_file_in_question_no_file_object(self):
        self.client.force_authenticate(user=self.user)
        assessmentitem = self.assessmentitem_metadata
        image_file = testdata.fileobj_exercise_image()
        image_file.uploaded_by = self.user
        image_file.save()
        question = "![alt_text](${}/{}.{})".format(
            exercises.CONTENT_STORAGE_PLACEHOLDER,
            image_file.checksum,
            image_file.file_format_id,
        )

        image_file.delete()

        assessmentitem["question"] = question
        response = self.sync_changes(
            [
                generate_create_event(
                    [assessmentitem["contentnode"], assessmentitem["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem,
                    channel_id=self.channel.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            ai = models.AssessmentItem.objects.get(
                assessment_id=assessmentitem["assessment_id"]
            )
        except models.AssessmentItem.DoesNotExist:
            self.fail("AssessmentItem was not created")
        try:
            file = ai.files.get()
            self.assertEqual(file.assessment_item_id, ai.id)
        except models.File.DoesNotExist:
            self.fail("File was not created")

    def test_create_assessmentitem_with_file_in_question_no_file_uploaded(self):
        self.client.force_authenticate(user=self.user)
        assessmentitem = self.assessmentitem_metadata
        question = "![alt_text](${}/{}.{})".format(
            exercises.CONTENT_STORAGE_PLACEHOLDER,
            "123456789012345678901234567890ab",
            "jpg",
        )

        assessmentitem["question"] = question
        response = self.sync_changes(
            [
                generate_create_event(
                    [assessmentitem["contentnode"], assessmentitem["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem,
                    channel_id=self.channel.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.data["errors"]), 1)
        try:
            models.AssessmentItem.objects.get(
                assessment_id=assessmentitem["assessment_id"]
            )
            self.fail("AssessmentItem was created")
        except models.AssessmentItem.DoesNotExist:
            pass

    def test_create_assessmentitem_with_file_answers(self):
        self.client.force_authenticate(user=self.user)
        assessmentitem = self.assessmentitem_metadata
        image_file = testdata.fileobj_exercise_image()
        image_file.uploaded_by = self.user
        image_file.save()
        answer = "![alt_text](${}/{}.{})".format(
            exercises.CONTENT_STORAGE_PLACEHOLDER,
            image_file.checksum,
            image_file.file_format_id,
        )

        answers = [{"answer": answer, "correct": False, "order": 1}]

        assessmentitem["answers"] = json.dumps(answers)

        response = self.sync_changes(
            [
                generate_create_event(
                    [assessmentitem["contentnode"], assessmentitem["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem,
                    channel_id=self.channel.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            ai = models.AssessmentItem.objects.get(
                assessment_id=assessmentitem["assessment_id"]
            )
        except models.AssessmentItem.DoesNotExist:
            self.fail("AssessmentItem was not created")
        try:
            file = ai.files.get()
            self.assertEqual(file.id, image_file.id)
        except models.File.DoesNotExist:
            self.fail("File was not updated")

    def test_create_assessmentitem_with_file_hints(self):
        self.client.force_authenticate(user=self.user)
        assessmentitem = self.assessmentitem_metadata
        image_file = testdata.fileobj_exercise_image()
        image_file.uploaded_by = self.user
        image_file.save()
        hint = "![alt_text](${}/{}.{})".format(
            exercises.CONTENT_STORAGE_PLACEHOLDER,
            image_file.checksum,
            image_file.file_format_id,
        )
        hints = [
            {"hint": hint, "order": 1},
        ]

        hints = json.dumps(hints)
        assessmentitem["hints"] = hints

        response = self.sync_changes(
            [
                generate_create_event(
                    [assessmentitem["contentnode"], assessmentitem["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem,
                    channel_id=self.channel.id,
                )
            ],
        )

        self.assertEqual(response.status_code, 200, response.content)
        try:
            ai = models.AssessmentItem.objects.get(
                assessment_id=assessmentitem["assessment_id"]
            )
        except models.AssessmentItem.DoesNotExist:
            self.fail("AssessmentItem was not created")
        try:
            file = ai.files.get()
            self.assertEqual(file.id, image_file.id)
        except models.File.DoesNotExist:
            self.fail("File was not updated")

    def test_create_assessmentitem_with_file_no_permission(self):
        self.client.force_authenticate(user=self.user)
        assessmentitem = self.assessmentitem_metadata
        image_file = testdata.fileobj_exercise_image()
        question = "![alt_text](${}/{}.{})".format(
            exercises.CONTENT_STORAGE_PLACEHOLDER,
            image_file.checksum,
            image_file.file_format_id,
        )
        assessmentitem["question"] = question
        response = self.sync_changes(
            [
                generate_create_event(
                    [assessmentitem["contentnode"], assessmentitem["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem,
                    channel_id=self.channel.id,
                ),
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            ai = models.AssessmentItem.objects.get(
                assessment_id=assessmentitem["assessment_id"]
            )
        except models.AssessmentItem.DoesNotExist:
            self.fail("AssessmentItem was not created")
        try:
            file = ai.files.get()
            self.assertEqual(file.assessment_item_id, ai.id)
        except models.File.DoesNotExist:
            self.fail("File was not created")

        self.assertIsNone(image_file.assessment_item)

    def test_create_assessmentitems(self):
        self.client.force_authenticate(user=self.user)
        assessmentitem1 = self.assessmentitem_metadata
        assessmentitem2 = self.assessmentitem_metadata
        response = self.sync_changes(
            [
                generate_create_event(
                    [assessmentitem1["contentnode"], assessmentitem1["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem1,
                    channel_id=self.channel.id,
                ),
                generate_create_event(
                    [assessmentitem2["contentnode"], assessmentitem2["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem2,
                    channel_id=self.channel.id,
                ),
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.AssessmentItem.objects.get(
                assessment_id=assessmentitem1["assessment_id"]
            )
        except models.AssessmentItem.DoesNotExist:
            self.fail("AssessmentItem 1 was not created")

        try:
            models.AssessmentItem.objects.get(
                assessment_id=assessmentitem2["assessment_id"]
            )
        except models.AssessmentItem.DoesNotExist:
            self.fail("AssessmentItem 2 was not created")

    def test_update_assessmentitem(self):

        assessmentitem = models.AssessmentItem.objects.create(
            **self.assessmentitem_db_metadata
        )
        new_question = "{}"

        self.client.force_authenticate(user=self.user)
        response = self.sync_changes(
            [
                generate_update_event(
                    [assessmentitem.contentnode_id, assessmentitem.assessment_id],
                    ASSESSMENTITEM,
                    {"question": new_question},
                    channel_id=self.channel.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.AssessmentItem.objects.get(id=assessmentitem.id).question,
            new_question,
        )

    def test_update_assessmentitem_to_true_false(self):

        assessmentitem = models.AssessmentItem.objects.create(
            **self.assessmentitem_db_metadata
        )
        new_answers = json.dumps(
            [
                {"answer": "True", "correct": True, "order": 1},
                {"answer": "False", "correct": False, "order": 2},
            ]
        )

        self.client.force_authenticate(user=self.user)
        response = self.sync_changes(
            [
                generate_update_event(
                    [assessmentitem.contentnode_id, assessmentitem.assessment_id],
                    ASSESSMENTITEM,
                    {"type": "true_false", "answers": new_answers},
                    channel_id=self.channel.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.AssessmentItem.objects.get(id=assessmentitem.id).answers,
            new_answers,
        )
        self.assertEqual(
            models.AssessmentItem.objects.get(id=assessmentitem.id).type,
            "true_false",
        )

    def test_attempt_update_missing_assessmentitem(self):

        self.client.force_authenticate(user=self.user)
        response = self.sync_changes(
            [
                generate_update_event(
                    [
                        self.channel.main_tree.get_descendants()
                        .filter(kind_id=content_kinds.EXERCISE)
                        .first()
                        .id,
                        uuid.uuid4().hex,
                    ],
                    ASSESSMENTITEM,
                    {"question": "but why is it missing in the first place?"},
                    channel_id=self.channel.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.data["errors"][0]["errors"][0], "Not found")

    def test_update_assessmentitem_with_file(self):

        assessmentitem = models.AssessmentItem.objects.create(
            **self.assessmentitem_db_metadata
        )
        image_file = testdata.fileobj_exercise_image()
        image_file.uploaded_by = self.user
        image_file.save()
        question = "![alt_text](${}/{}.{})".format(
            exercises.CONTENT_STORAGE_PLACEHOLDER,
            image_file.checksum,
            image_file.file_format_id,
        )

        self.client.force_authenticate(user=self.user)
        response = self.sync_changes(
            [
                generate_update_event(
                    [assessmentitem.contentnode_id, assessmentitem.assessment_id],
                    ASSESSMENTITEM,
                    {"question": question},
                    channel_id=self.channel.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            file = assessmentitem.files.get()
            self.assertEqual(file.id, image_file.id)
        except models.File.DoesNotExist:
            self.fail("File was not updated")

    def test_update_assessmentitem_with_file_no_permissions(self):

        assessmentitem = models.AssessmentItem.objects.create(
            **self.assessmentitem_db_metadata
        )
        image_file = testdata.fileobj_exercise_image()
        question = "![alt_text](${}/{}.{})".format(
            exercises.CONTENT_STORAGE_PLACEHOLDER,
            image_file.checksum,
            image_file.file_format_id,
        )

        self.client.force_authenticate(user=self.user)
        response = self.sync_changes(
            [
                generate_update_event(
                    [assessmentitem.contentnode_id, assessmentitem.assessment_id],
                    ASSESSMENTITEM,
                    {"question": question},
                    channel_id=self.channel.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            file = assessmentitem.files.get()
            self.assertEqual(file.assessment_item_id, assessmentitem.id)
        except models.File.DoesNotExist:
            self.fail("File was not created")

        self.assertIsNone(image_file.assessment_item)

    def test_update_assessmentitem_remove_file(self):

        assessmentitem = models.AssessmentItem.objects.create(
            **self.assessmentitem_db_metadata
        )
        image_file = testdata.fileobj_exercise_image()
        image_file.assessment_item = assessmentitem
        image_file.save()
        question = "A different question"

        self.client.force_authenticate(user=self.user)
        response = self.sync_changes(
            [
                generate_update_event(
                    [assessmentitem.contentnode_id, assessmentitem.assessment_id],
                    ASSESSMENTITEM,
                    {"question": question},
                    channel_id=self.channel.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            assessmentitem.files.get()
            self.fail("File was not removed")
        except models.File.DoesNotExist:
            pass

    def test_update_assessmentitems(self):

        assessmentitem1 = models.AssessmentItem.objects.create(
            **self.assessmentitem_db_metadata
        )
        assessmentitem2 = models.AssessmentItem.objects.create(
            **self.assessmentitem_db_metadata
        )
        new_question = "{}"

        self.client.force_authenticate(user=self.user)
        response = self.sync_changes(
            [
                generate_update_event(
                    [assessmentitem1.contentnode_id, assessmentitem1.assessment_id],
                    ASSESSMENTITEM,
                    {"question": new_question},
                    channel_id=self.channel.id,
                ),
                generate_update_event(
                    [assessmentitem2.contentnode_id, assessmentitem2.assessment_id],
                    ASSESSMENTITEM,
                    {"question": new_question},
                    channel_id=self.channel.id,
                ),
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.AssessmentItem.objects.get(id=assessmentitem1.id).question,
            new_question,
        )
        self.assertEqual(
            models.AssessmentItem.objects.get(id=assessmentitem2.id).question,
            new_question,
        )

    def test_update_assessmentitem_empty(self):

        assessmentitem = models.AssessmentItem.objects.create(
            **self.assessmentitem_db_metadata
        )
        self.client.force_authenticate(user=self.user)
        response = self.sync_changes(
            [
                generate_update_event(
                    [assessmentitem.contentnode_id, assessmentitem.assessment_id],
                    ASSESSMENTITEM,
                    {},
                    channel_id=self.channel.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_update_assessmentitem_unwriteable_fields(self):

        assessmentitem = models.AssessmentItem.objects.create(
            **self.assessmentitem_db_metadata
        )
        self.client.force_authenticate(user=self.user)
        response = self.sync_changes(
            [
                generate_update_event(
                    [assessmentitem.contentnode_id, assessmentitem.assessment_id],
                    ASSESSMENTITEM,
                    {"not_a_field": "not_a_value"},
                    channel_id=self.channel.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_delete_assessmentitem(self):

        assessmentitem = models.AssessmentItem.objects.create(
            **self.assessmentitem_db_metadata
        )

        self.client.force_authenticate(user=self.user)
        response = self.sync_changes(
            [
                generate_delete_event(
                    [assessmentitem.contentnode_id, assessmentitem.assessment_id],
                    ASSESSMENTITEM,
                    channel_id=self.channel.id,
                )
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.AssessmentItem.objects.get(id=assessmentitem.id)
            self.fail("AssessmentItem was not deleted")
        except models.AssessmentItem.DoesNotExist:
            pass

    def test_delete_assessmentitems(self):
        assessmentitem1 = models.AssessmentItem.objects.create(
            **self.assessmentitem_db_metadata
        )

        assessmentitem2 = models.AssessmentItem.objects.create(
            **self.assessmentitem_db_metadata
        )

        self.client.force_authenticate(user=self.user)
        response = self.sync_changes(
            [
                generate_delete_event(
                    [assessmentitem1.contentnode_id, assessmentitem1.assessment_id],
                    ASSESSMENTITEM,
                    channel_id=self.channel.id,
                ),
                generate_delete_event(
                    [assessmentitem2.contentnode_id, assessmentitem2.assessment_id],
                    ASSESSMENTITEM,
                    channel_id=self.channel.id,
                ),
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.AssessmentItem.objects.get(id=assessmentitem1.id)
            self.fail("AssessmentItem 1 was not deleted")
        except models.AssessmentItem.DoesNotExist:
            pass

        try:
            models.AssessmentItem.objects.get(id=assessmentitem2.id)
            self.fail("AssessmentItem 2 was not deleted")
        except models.AssessmentItem.DoesNotExist:
            pass

    def test_valid_hints_assessmentitem(self):
        self.client.force_authenticate(user=self.user)
        assessmentitem = self.assessmentitem_metadata
        assessmentitem["hints"] = json.dumps(
            [
                {"hint": "asdasdwdqasd", "order": 1},
                {"hint": "testing the hint", "order": 2},
            ]
        )
        response = self.sync_changes(
            [
                generate_create_event(
                    [assessmentitem["contentnode"], assessmentitem["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem,
                    channel_id=self.channel.id,
                ),
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.AssessmentItem.objects.get(
                assessment_id=assessmentitem["assessment_id"]
            )
        except models.AssessmentItem.DoesNotExist:
            self.fail("AssessmentItem  was not created")

    def test_invalid_hints_assessmentitem(self):

        self.client.force_authenticate(user=self.user)
        assessmentitem = self.assessmentitem_metadata
        assessmentitem["hints"] = json.dumps("test invalid string for hints")
        response = self.sync_changes(
            [
                generate_create_event(
                    [assessmentitem["contentnode"], assessmentitem["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem,
                    channel_id=self.channel.id,
                ),
            ],
        )

        self.assertEqual(response.json()["errors"][0]["table"], "assessmentitem")
        self.assertEqual(
            response.json()["errors"][0]["errors"]["hints"][0],
            "JSON Data Invalid for hints",
        )
        self.assertEqual(len(response.json()["errors"]), 1)

        with self.assertRaises(
            models.AssessmentItem.DoesNotExist, msg="AssessmentItem was created"
        ):
            models.AssessmentItem.objects.get(
                assessment_id=assessmentitem["assessment_id"]
            )

    def test_valid_answers_assessmentitem(self):
        self.client.force_authenticate(user=self.user)
        assessmentitem = self.assessmentitem_metadata
        assessmentitem["answers"] = json.dumps(
            [
                {"answer": "test answer 1 :)", "correct": False, "order": 1},
                {"answer": "test answer 2 :)", "correct": False, "order": 2},
                {"answer": "test answer 3 :)", "correct": True, "order": 3},
            ]
        )
        response = self.sync_changes(
            [
                generate_create_event(
                    [assessmentitem["contentnode"], assessmentitem["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem,
                    channel_id=self.channel.id,
                ),
            ],
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.AssessmentItem.objects.get(
                assessment_id=assessmentitem["assessment_id"]
            )
        except models.AssessmentItem.DoesNotExist:
            self.fail("AssessmentItem  was not created")

    def test_invalid_answers_assessmentitem(self):

        self.client.force_authenticate(user=self.user)
        assessmentitem = self.assessmentitem_metadata
        assessmentitem["answers"] = json.dumps("test invalid string for answers")
        response = self.sync_changes(
            [
                generate_create_event(
                    [assessmentitem["contentnode"], assessmentitem["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem,
                    channel_id=self.channel.id,
                ),
            ],
        )

        self.assertEqual(response.json()["errors"][0]["table"], "assessmentitem")
        self.assertEqual(
            response.json()["errors"][0]["errors"]["answers"][0],
            "JSON Data Invalid for answers",
        )
        self.assertEqual(len(response.json()["errors"]), 1)

        with self.assertRaises(
            models.AssessmentItem.DoesNotExist, msg="AssessmentItem was created"
        ):
            models.AssessmentItem.objects.get(
                assessment_id=assessmentitem["assessment_id"]
            )


class CRUDTestCase(StudioAPITestCase):
    @property
    def assessmentitem_metadata(self):
        return {
            "assessment_id": uuid.uuid4().hex,
            "contentnode": self.channel.main_tree.get_descendants()
            .filter(kind_id=content_kinds.EXERCISE)
            .first()
            .id,
        }

    @property
    def assessmentitem_db_metadata(self):
        return {
            "assessment_id": uuid.uuid4().hex,
            "contentnode_id": self.channel.main_tree.get_descendants()
            .filter(kind_id=content_kinds.EXERCISE)
            .first()
            .id,
        }

    def setUp(self):
        super(CRUDTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)

    def test_create_assessmentitem(self):
        self.client.force_authenticate(user=self.user)
        assessmentitem = self.assessmentitem_metadata
        response = self.client.post(
            reverse("assessmentitem-list"),
            assessmentitem,
            format="json",
        )
        self.assertEqual(response.status_code, 405, response.content)

    def test_update_assessmentitem(self):
        assessmentitem = models.AssessmentItem.objects.create(
            **self.assessmentitem_db_metadata
        )
        new_question = "{}"

        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            reverse("assessmentitem-detail", kwargs={"pk": assessmentitem.id}),
            {"question": new_question},
            format="json",
        )
        self.assertEqual(response.status_code, 405, response.content)

    def test_delete_assessmentitem(self):
        assessmentitem = models.AssessmentItem.objects.create(
            **self.assessmentitem_db_metadata
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.delete(
            reverse("assessmentitem-detail", kwargs={"pk": assessmentitem.id})
        )
        self.assertEqual(response.status_code, 405, response.content)


class ContentIDTestCase(SyncTestMixin, StudioAPITestCase):
    def setUp(self):
        super(ContentIDTestCase, self).setUp()
        self.channel = testdata.channel()
        self.user = testdata.user()
        self.channel.editors.add(self.user)
        self.client.force_authenticate(user=self.user)

    def _get_assessmentitem_metadata(self, assessment_id=None, contentnode_id=None):
        return {
            "assessment_id": assessment_id or uuid.uuid4().hex,
            "contentnode_id": contentnode_id
            or self.channel.main_tree.get_descendants()
            .filter(kind_id=content_kinds.EXERCISE)
            .first()
            .id,
        }

    def _create_assessmentitem(self, assessmentitem):
        self.sync_changes(
            [
                generate_create_event(
                    [assessmentitem["contentnode_id"], assessmentitem["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem,
                    channel_id=self.channel.id,
                )
            ],
        )

    def _update_assessmentitem(self, assessmentitem, update_dict):
        self.sync_changes(
            [
                generate_update_event(
                    [assessmentitem["contentnode_id"], assessmentitem["assessment_id"]],
                    ASSESSMENTITEM,
                    update_dict,
                    channel_id=self.channel.id,
                )
            ],
        )

    def _delete_assessmentitem(self, assessmentitem):
        self.sync_changes(
            [
                generate_delete_event(
                    [assessmentitem["contentnode_id"], assessmentitem["assessment_id"]],
                    ASSESSMENTITEM,
                    channel_id=self.channel.id,
                )
            ],
        )

    def test_content_id__same_on_copy(self):
        # Make a copy of an existing assessmentitem contentnode.
        assessmentitem_node = (
            self.channel.main_tree.get_descendants()
            .filter(kind_id=content_kinds.EXERCISE)
            .first()
        )
        assessmentitem_node_copy = assessmentitem_node.copy_to(
            target=self.channel.main_tree
        )

        # Assert after copying content_id is same.
        assessmentitem_node.refresh_from_db()
        assessmentitem_node_copy.refresh_from_db()
        self.assertEqual(
            assessmentitem_node.content_id, assessmentitem_node_copy.content_id
        )

    def test_content_id__changes_on_new_assessmentitem(self):
        # Make a copy of an existing assessmentitem contentnode.
        assessmentitem_node = (
            self.channel.main_tree.get_descendants()
            .filter(kind_id=content_kinds.EXERCISE)
            .first()
        )
        assessmentitem_node_copy = assessmentitem_node.copy_to(
            target=self.channel.main_tree
        )

        # Create a new assessmentitem.
        self._create_assessmentitem(
            self._get_assessmentitem_metadata(
                contentnode_id=assessmentitem_node_copy.id
            )
        )

        # Assert after creating a new assessmentitem on copied node, it's content_id should change.
        assessmentitem_node.refresh_from_db()
        assessmentitem_node_copy.refresh_from_db()
        self.assertNotEqual(
            assessmentitem_node.content_id, assessmentitem_node_copy.content_id
        )

    def test_content_id__changes_on_deleting_assessmentitem(self):
        # Make a copy of an existing assessmentitem contentnode.
        assessmentitem_node = (
            self.channel.main_tree.get_descendants()
            .filter(kind_id=content_kinds.EXERCISE)
            .first()
        )
        assessmentitem_node_copy = assessmentitem_node.copy_to(
            target=self.channel.main_tree
        )

        # Delete an already present assessmentitem from copied contentnode.
        assessmentitem_from_db = models.AssessmentItem.objects.filter(
            contentnode=assessmentitem_node_copy.id
        ).first()
        self._delete_assessmentitem(
            self._get_assessmentitem_metadata(
                assessmentitem_from_db.assessment_id, assessmentitem_node_copy.id
            )
        )

        # Assert after deleting assessmentitem on copied node, it's content_id should change.
        assessmentitem_node.refresh_from_db()
        assessmentitem_node_copy.refresh_from_db()
        self.assertNotEqual(
            assessmentitem_node.content_id, assessmentitem_node_copy.content_id
        )

    def test_content_id__changes_on_updating_assessmentitem(self):
        # Make a copy of an existing assessmentitem contentnode.
        assessmentitem_node = (
            self.channel.main_tree.get_descendants()
            .filter(kind_id=content_kinds.EXERCISE)
            .first()
        )
        assessmentitem_node_copy = assessmentitem_node.copy_to(
            target=self.channel.main_tree
        )

        # Update an already present assessmentitem from copied contentnode.
        assessmentitem_from_db = models.AssessmentItem.objects.filter(
            contentnode=assessmentitem_node_copy.id
        ).first()
        self._update_assessmentitem(
            self._get_assessmentitem_metadata(
                assessmentitem_from_db.assessment_id, assessmentitem_node_copy.id
            ),
            {"question": "New Question!"},
        )

        # Assert after updating assessmentitem on copied node, it's content_id should change.
        assessmentitem_node.refresh_from_db()
        assessmentitem_node_copy.refresh_from_db()
        self.assertNotEqual(
            assessmentitem_node.content_id, assessmentitem_node_copy.content_id
        )

    def test_content_id__doesnot_changes_of_original_node(self):
        # Make a copy of an existing assessmentitem contentnode.
        assessmentitem_node = (
            self.channel.main_tree.get_descendants()
            .filter(kind_id=content_kinds.EXERCISE)
            .first()
        )
        assessmentitem_node.copy_to(target=self.channel.main_tree)

        content_id_before_updates = assessmentitem_node.content_id

        # Create, update and delete assessmentitems from original contentnode.
        assessmentitem_from_db = models.AssessmentItem.objects.filter(
            contentnode=assessmentitem_node.id
        ).first()
        self._update_assessmentitem(
            self._get_assessmentitem_metadata(
                assessmentitem_from_db.assessment_id, assessmentitem_node.id
            ),
            {"question": "New Question!"},
        )
        self._delete_assessmentitem(
            self._get_assessmentitem_metadata(
                assessmentitem_from_db.assessment_id, assessmentitem_node.id
            )
        )
        self._create_assessmentitem(
            self._get_assessmentitem_metadata(contentnode_id=assessmentitem_node.id)
        )

        # Assert content_id before and after updates remain same.
        assessmentitem_node.refresh_from_db()
        content_id_after_updates = assessmentitem_node.content_id
        self.assertEqual(content_id_before_updates, content_id_after_updates)

    def test_content_id__doesnot_changes_if_already_unique(self):
        # Make a copy of an existing assessmentitem contentnode.
        assessmentitem_node = (
            self.channel.main_tree.get_descendants()
            .filter(kind_id=content_kinds.EXERCISE)
            .first()
        )
        assessmentitem_node_copy = assessmentitem_node.copy_to(
            target=self.channel.main_tree
        )

        # Create, update and delete assessmentitems of copied contentnode.
        assessmentitem_from_db = models.AssessmentItem.objects.filter(
            contentnode=assessmentitem_node_copy.id
        ).first()
        self._update_assessmentitem(
            self._get_assessmentitem_metadata(
                assessmentitem_from_db.assessment_id, assessmentitem_node_copy.id
            ),
            {"question": "New Question!"},
        )
        self._delete_assessmentitem(
            self._get_assessmentitem_metadata(
                assessmentitem_from_db.assessment_id, assessmentitem_node_copy.id
            )
        )
        self._create_assessmentitem(
            self._get_assessmentitem_metadata(
                contentnode_id=assessmentitem_node_copy.id
            )
        )

        assessmentitem_node_copy.refresh_from_db()
        content_id_after_first_update = assessmentitem_node_copy.content_id

        # Once again, let us create, update and delete assessmentitems of copied contentnode.
        assessmentitem_from_db = models.AssessmentItem.objects.filter(
            contentnode=assessmentitem_node_copy.id
        ).first()
        self._update_assessmentitem(
            self._get_assessmentitem_metadata(
                assessmentitem_from_db.assessment_id, assessmentitem_node_copy.id
            ),
            {"question": "New Question!"},
        )
        self._delete_assessmentitem(
            self._get_assessmentitem_metadata(
                assessmentitem_from_db.assessment_id, assessmentitem_node_copy.id
            )
        )
        self._create_assessmentitem(
            self._get_assessmentitem_metadata(
                contentnode_id=assessmentitem_node_copy.id
            )
        )

        assessmentitem_node_copy.refresh_from_db()
        content_id_after_second_update = assessmentitem_node_copy.content_id

        # Assert after first and second updates of assessmentitem content_id remains same.
        self.assertEqual(content_id_after_first_update, content_id_after_second_update)
