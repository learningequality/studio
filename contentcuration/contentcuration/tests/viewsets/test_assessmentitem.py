from __future__ import absolute_import

import uuid

from django.urls import reverse
from le_utils.constants import content_kinds
from le_utils.constants import exercises

from contentcuration import models
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase
from contentcuration.viewsets.sync.constants import ASSESSMENTITEM
from contentcuration.viewsets.sync.utils import generate_create_event
from contentcuration.viewsets.sync.utils import generate_delete_event
from contentcuration.viewsets.sync.utils import generate_update_event


class SyncTestCase(StudioAPITestCase):
    @property
    def sync_url(self):
        return reverse("sync")

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
        response = self.client.post(
            self.sync_url,
            [
                generate_create_event(
                    [assessmentitem["contentnode"], assessmentitem["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem,
                )
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            models.AssessmentItem.objects.get(
                assessment_id=assessmentitem["assessment_id"]
            )
        except models.AssessmentItem.DoesNotExist:
            self.fail("AssessmentItem was not created")

    def test_create_assessmentitem_with_file_question(self):
        self.client.force_authenticate(user=self.user)
        assessmentitem = self.assessmentitem_metadata
        image_file = testdata.fileobj_exercise_image()
        image_file.uploaded_by = self.user
        image_file.save()
        question = "![alt_text](${}/{}.{})".format(
            exercises.IMG_PLACEHOLDER, image_file.checksum, image_file.file_format_id
        )

        assessmentitem["question"] = question
        response = self.client.post(
            self.sync_url,
            [
                generate_create_event(
                    [assessmentitem["contentnode"], assessmentitem["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem,
                )
            ],
            format="json",
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

    def test_create_assessmentitem_with_file_answers(self):
        self.client.force_authenticate(user=self.user)
        assessmentitem = self.assessmentitem_metadata
        image_file = testdata.fileobj_exercise_image()
        image_file.uploaded_by = self.user
        image_file.save()
        answers = "![alt_text](${}/{}.{})".format(
            exercises.IMG_PLACEHOLDER, image_file.checksum, image_file.file_format_id
        )

        assessmentitem["answers"] = answers
        response = self.client.post(
            self.sync_url,
            [
                generate_create_event(
                    [assessmentitem["contentnode"], assessmentitem["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem,
                )
            ],
            format="json",
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
        hints = "![alt_text](${}/{}.{})".format(
            exercises.IMG_PLACEHOLDER, image_file.checksum, image_file.file_format_id
        )

        assessmentitem["hints"] = hints
        response = self.client.post(
            self.sync_url,
            [
                generate_create_event(
                    [assessmentitem["contentnode"], assessmentitem["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem,
                )
            ],
            format="json",
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
            exercises.IMG_PLACEHOLDER, image_file.checksum, image_file.file_format_id
        )
        assessmentitem["question"] = question
        response = self.client.post(
            self.sync_url,
            [
                generate_create_event(
                    [assessmentitem["contentnode"], assessmentitem["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem,
                )
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)
        try:
            models.AssessmentItem.objects.get(
                assessment_id=assessmentitem["assessment_id"]
            )
            self.fail("AssessmentItem was created")
        except models.AssessmentItem.DoesNotExist:
            pass

        self.assertIsNone(image_file.assessment_item)

    def test_create_assessmentitems(self):
        self.client.force_authenticate(user=self.user)
        assessmentitem1 = self.assessmentitem_metadata
        assessmentitem2 = self.assessmentitem_metadata
        response = self.client.post(
            self.sync_url,
            [
                generate_create_event(
                    [assessmentitem1["contentnode"], assessmentitem1["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem1,
                ),
                generate_create_event(
                    [assessmentitem2["contentnode"], assessmentitem2["assessment_id"]],
                    ASSESSMENTITEM,
                    assessmentitem2,
                ),
            ],
            format="json",
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
        response = self.client.post(
            self.sync_url,
            [
                generate_update_event(
                    [assessmentitem.contentnode_id, assessmentitem.assessment_id],
                    ASSESSMENTITEM,
                    {"question": new_question},
                )
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.AssessmentItem.objects.get(id=assessmentitem.id).question,
            new_question,
        )

    def test_attempt_update_missing_assessmentitem(self):

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.sync_url,
            [
                generate_update_event([
                            self.channel.main_tree.get_descendants()
                                .filter(kind_id=content_kinds.EXERCISE)
                                .first()
                                .id,
                            uuid.uuid4().hex
                        ],
                    ASSESSMENTITEM,
                    {"question": "but why is it missing in the first place?"},
                )
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)
        self.assertEqual(response.data.get("errors")[0].get("error")[0], "Not found")

    def test_update_assessmentitem_with_file(self):

        assessmentitem = models.AssessmentItem.objects.create(
            **self.assessmentitem_db_metadata
        )
        image_file = testdata.fileobj_exercise_image()
        image_file.uploaded_by = self.user
        image_file.save()
        question = "![alt_text](${}/{}.{})".format(
            exercises.IMG_PLACEHOLDER, image_file.checksum, image_file.file_format_id
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.sync_url,
            [
                generate_update_event(
                    [assessmentitem.contentnode_id, assessmentitem.assessment_id],
                    ASSESSMENTITEM,
                    {"question": question},
                )
            ],
            format="json",
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
            exercises.IMG_PLACEHOLDER, image_file.checksum, image_file.file_format_id
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.sync_url,
            [
                generate_update_event(
                    [assessmentitem.contentnode_id, assessmentitem.assessment_id],
                    ASSESSMENTITEM,
                    {"question": question},
                )
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)
        try:
            file = assessmentitem.files.get()
            self.assertNotEqual(file.id, image_file.id)
            self.fail("File was updated")
        except models.File.DoesNotExist:
            pass

    def test_update_assessmentitem_remove_file(self):

        assessmentitem = models.AssessmentItem.objects.create(
            **self.assessmentitem_db_metadata
        )
        image_file = testdata.fileobj_exercise_image()
        image_file.assessment_item = assessmentitem
        image_file.save()
        question = "A different question"

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.sync_url,
            [
                generate_update_event(
                    [assessmentitem.contentnode_id, assessmentitem.assessment_id],
                    ASSESSMENTITEM,
                    {"question": question},
                )
            ],
            format="json",
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
        response = self.client.post(
            self.sync_url,
            [
                generate_update_event(
                    [assessmentitem1.contentnode_id, assessmentitem1.assessment_id],
                    ASSESSMENTITEM,
                    {"question": new_question},
                ),
                generate_update_event(
                    [assessmentitem2.contentnode_id, assessmentitem2.assessment_id],
                    ASSESSMENTITEM,
                    {"question": new_question},
                ),
            ],
            format="json",
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
        response = self.client.post(
            self.sync_url,
            [
                generate_update_event(
                    [assessmentitem.contentnode_id, assessmentitem.assessment_id],
                    ASSESSMENTITEM,
                    {},
                )
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_update_assessmentitem_unwriteable_fields(self):

        assessmentitem = models.AssessmentItem.objects.create(
            **self.assessmentitem_db_metadata
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.sync_url,
            [
                generate_update_event(
                    [assessmentitem.contentnode_id, assessmentitem.assessment_id],
                    ASSESSMENTITEM,
                    {"not_a_field": "not_a_value"},
                )
            ],
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_delete_assessmentitem(self):

        assessmentitem = models.AssessmentItem.objects.create(
            **self.assessmentitem_db_metadata
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            self.sync_url,
            [
                generate_delete_event(
                    [assessmentitem.contentnode_id, assessmentitem.assessment_id],
                    ASSESSMENTITEM,
                )
            ],
            format="json",
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
        response = self.client.post(
            self.sync_url,
            [
                generate_delete_event(
                    [assessmentitem1.contentnode_id, assessmentitem1.assessment_id],
                    ASSESSMENTITEM,
                ),
                generate_delete_event(
                    [assessmentitem2.contentnode_id, assessmentitem2.assessment_id],
                    ASSESSMENTITEM,
                ),
            ],
            format="json",
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
            reverse("assessmentitem-list"), assessmentitem, format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
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
        response = self.client.post(
            reverse("assessmentitem-list"), assessmentitem, format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)

    def test_create_assessmentitem_with_file(self):
        self.client.force_authenticate(user=self.user)
        assessmentitem = self.assessmentitem_metadata
        image_file = testdata.fileobj_exercise_image()
        image_file.uploaded_by = self.user
        image_file.save()
        question = "![alt_text](${}/{}.{})".format(
            exercises.IMG_PLACEHOLDER, image_file.checksum, image_file.file_format_id
        )
        assessmentitem["question"] = question
        response = self.client.post(
            reverse("assessmentitem-list"), assessmentitem, format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
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
            exercises.IMG_PLACEHOLDER, image_file.checksum, image_file.file_format_id
        )
        assessmentitem["question"] = question
        response = self.client.post(
            reverse("assessmentitem-list"), assessmentitem, format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)
        try:
            models.AssessmentItem.objects.get(
                assessment_id=assessmentitem["assessment_id"]
            )
            self.fail("AssessmentItem was created")
        except models.AssessmentItem.DoesNotExist:
            pass

        self.assertIsNone(image_file.assessment_item)

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
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(
            models.AssessmentItem.objects.get(id=assessmentitem.id).question,
            new_question,
        )

    def test_update_assessmentitem_empty(self):

        assessmentitem = models.AssessmentItem.objects.create(
            **self.assessmentitem_db_metadata
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            reverse("assessmentitem-detail", kwargs={"pk": assessmentitem.id}),
            {},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_update_assessmentitem_unwriteable_fields(self):

        assessmentitem = models.AssessmentItem.objects.create(
            **self.assessmentitem_db_metadata
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            reverse("assessmentitem-detail", kwargs={"pk": assessmentitem.id}),
            {"not_a_field": "not_a_value"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)

    def test_update_assessmentitem_with_file(self):

        assessmentitem = models.AssessmentItem.objects.create(
            **self.assessmentitem_db_metadata
        )
        image_file = testdata.fileobj_exercise_image()
        image_file.uploaded_by = self.user
        image_file.save()
        question = "![alt_text](${}/{}.{})".format(
            exercises.IMG_PLACEHOLDER, image_file.checksum, image_file.file_format_id
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            reverse("assessmentitem-detail", kwargs={"pk": assessmentitem.id}),
            {"question": question},
            format="json",
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
            exercises.IMG_PLACEHOLDER, image_file.checksum, image_file.file_format_id
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            reverse("assessmentitem-detail", kwargs={"pk": assessmentitem.id}),
            {"question": question},
            format="json",
        )
        self.assertEqual(response.status_code, 400, response.content)
        try:
            file = assessmentitem.files.get()
            self.assertNotEqual(file.id, image_file.id)
            self.fail("File was updated")
        except models.File.DoesNotExist:
            pass

    def test_update_assessmentitem_remove_file(self):

        assessmentitem = models.AssessmentItem.objects.create(
            **self.assessmentitem_db_metadata
        )
        image_file = testdata.fileobj_exercise_image()
        image_file.assessment_item = assessmentitem
        image_file.save()
        question = "A different question"

        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            reverse("assessmentitem-detail", kwargs={"pk": assessmentitem.id}),
            {"question": question},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        try:
            assessmentitem.files.get()
            self.fail("File was not removed")
        except models.File.DoesNotExist:
            pass

    def test_delete_assessmentitem(self):
        assessmentitem = models.AssessmentItem.objects.create(
            **self.assessmentitem_db_metadata
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.delete(
            reverse("assessmentitem-detail", kwargs={"pk": assessmentitem.id})
        )
        self.assertEqual(response.status_code, 204, response.content)
        try:
            models.AssessmentItem.objects.get(id=assessmentitem.id)
            self.fail("AssessmentItem was not deleted")
        except models.AssessmentItem.DoesNotExist:
            pass
