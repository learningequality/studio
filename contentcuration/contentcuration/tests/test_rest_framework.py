import json

import pytest
from django.urls import reverse_lazy
from le_utils.constants import content_kinds
from le_utils.constants import exercises

from .base import BaseAPITestCase
from contentcuration.models import AssessmentItem
from contentcuration.models import ContentNode
from contentcuration.models import File
from contentcuration.models import User

pytestmark = pytest.mark.django_db


class ChannelTestCase(BaseAPITestCase):
    def setUp(self):
        super(ChannelTestCase, self).setUp()
        self.channel.editors.add(self.user)
        self.channel.save()

    def test_authorized_get(self):
        url = reverse_lazy("channel-list") + "/" + self.channel.pk
        response = self.get(url)
        self.assertEqual(response.status_code, 200)

    def test_unauthorized_get(self):
        newuser = User.objects.create(email="unauthorized@test.com")
        newuser.set_password("password")
        newuser.save()
        self.client.force_authenticate(newuser)
        url = reverse_lazy("channel-list") + "/" + self.channel.pk
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)

    def test_readonly_fields(self):
        original_version = self.channel.version
        url = reverse_lazy("channel-list") + "/" + self.channel.pk
        self.put(
            url,
            {
                "version": original_version + 1,
                "content_defaults": {},
                "pending_editors": [],
            },
        )
        self.channel.refresh_from_db()
        self.assertEqual(original_version, self.channel.version)


# TODO: rtibbles - update tests to test sync behaviour.
@pytest.mark.skip
class AssessmentItemTestCase(BaseAPITestCase):
    def test_bulk_update(self):
        exercise = ContentNode.objects.filter(kind=content_kinds.EXERCISE).first()
        item1 = AssessmentItem.objects.create(contentnode=exercise)
        item2 = AssessmentItem.objects.create(contentnode=exercise)
        item3 = AssessmentItem.objects.create(contentnode=exercise)
        item1dict = {}
        item2dict = {}
        item3dict = {}
        for field in AssessmentItem._meta.fields:
            attname = field.attname
            set_attname = attname
            if attname == "contentnode_id":
                set_attname = "contentnode"
            item1dict[set_attname] = getattr(item1, attname)
            item2dict[set_attname] = getattr(item2, attname)
            item3dict[set_attname] = getattr(item3, attname)
        item1dict["question"] = "test"
        item2dict["type"] = "test"
        self.client.put(
            reverse_lazy("assessmentitem-list"),
            json.dumps([item1dict, item2dict, item3dict]),
            content_type="application/json",
        )
        item1.refresh_from_db()
        self.assertEqual(item1.question, "test")
        item2.refresh_from_db()
        self.assertEqual(item2.type, "test")
        item3.refresh_from_db()
        self.assertEqual(item3.question, item3dict["question"])

    def test_bulk_update_non_existent_item(self):
        exercise = ContentNode.objects.filter(kind=content_kinds.EXERCISE).first()
        item1 = AssessmentItem.objects.create(contentnode=exercise)
        item1dict = {}
        item2dict = {}
        item3dict = {}
        for field in AssessmentItem._meta.fields:
            attname = field.attname
            set_attname = attname
            if attname == "contentnode_id":
                set_attname = "contentnode"
            item1dict[set_attname] = getattr(item1, attname)
            item2dict[set_attname] = getattr(item1, attname)
            item3dict[set_attname] = getattr(item1, attname)
        item2dict["id"] = 10000
        item3dict["id"] = 10001
        item1dict["question"] = "test"
        response = self.client.put(
            reverse_lazy("assessmentitem-list"),
            json.dumps([item1dict, item2dict, item3dict]),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_bulk_update_checksum_file_not_associated_create_new_file_object(self):
        exercise = ContentNode.objects.filter(kind=content_kinds.EXERCISE).first()
        item1 = AssessmentItem.objects.create(contentnode=exercise)
        item1dict = {}
        for field in AssessmentItem._meta.fields:
            attname = field.attname
            set_attname = attname
            if attname == "contentnode_id":
                set_attname = "contentnode"
            item1dict[set_attname] = getattr(item1, attname)
        checksum = "b6d83d66859b0cf095ef81120ef98e1f"
        item1dict["question"] = (
            "![I'm an image!]($"
            + exercises.IMG_PLACEHOLDER
            + "/{checksum}.gif)".format(checksum=checksum)
        )
        File.objects.create(checksum=checksum)
        self.client.put(
            reverse_lazy("assessmentitem-list"),
            json.dumps([item1dict]),
            content_type="application/json",
        )
        self.assertEqual(File.objects.filter(checksum=checksum).count(), 2)

    def test_bulk_update_checksum_file_associated_use_existing_file_object(self):
        exercise = ContentNode.objects.filter(kind=content_kinds.EXERCISE).first()
        item1 = AssessmentItem.objects.create(contentnode=exercise)
        item1dict = {}
        for field in AssessmentItem._meta.fields:
            attname = field.attname
            set_attname = attname
            if attname == "contentnode_id":
                set_attname = "contentnode"
            item1dict[set_attname] = getattr(item1, attname)
        checksum = "b6d83d66859b0cf095ef81120ef98e1f"
        item1dict["question"] = (
            "![I'm an image!]($"
            + exercises.IMG_PLACEHOLDER
            + "/{checksum}.gif)".format(checksum=checksum)
        )
        File.objects.create(checksum=checksum, assessment_item=item1)
        self.client.put(
            reverse_lazy("assessmentitem-list"),
            json.dumps([item1dict]),
            content_type="application/json",
        )
        self.assertEqual(File.objects.filter(checksum=checksum).count(), 1)
