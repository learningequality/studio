from django.urls import reverse
from le_utils.constants import content_kinds

from contentcuration.models import FlagFeedbackEvent
from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase


class CRUDTestCase(StudioAPITestCase):
    @property
    def flag_feedback_object(self):
        return {
            "context": {"spam": "Spam or misleading"},
            "contentnode_id": self.contentNode.id,
            "content_id": self.contentNode.content_id,
            "target_channel_id": self.channel.id,
            "user": self.user.id,
            "feedback_type": "FLAGGED",
            "feedback_reason": "Some reason provided by the user",
        }

    def setUp(self):
        super(CRUDTestCase, self).setUp()
        self.contentNode = testdata.node(
            {
                "kind_id": content_kinds.VIDEO,
                "title": "Suspicious Video content",
            },
        )
        self.channel = testdata.channel()
        self.user = testdata.user(feature_flags={"test_dev_feature": True})

    def test_create_flag_event(self):
        self.client.force_authenticate(user=self.user)
        flagged_content = self.flag_feedback_object
        response = self.client.post(
            reverse("flagged-list"),
            flagged_content,
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)

    def test_create_flag_event_fails_for_flag_test_dev_feature_disabled(self):
        flagged_content = self.flag_feedback_object
        self.user.feature_flags = {"test_dev_feature": False}
        self.user.save()
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("flagged-list"),
            flagged_content,
            format="json",
        )
        self.assertEqual(response.status_code, 403, response.content)

    def test_create_flag_event_fails_for_flag_test_dev_feature_None(self):
        flagged_content = self.flag_feedback_object
        self.user.feature_flags = None
        self.user.save()
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("flagged-list"),
            flagged_content,
            format="json",
        )
        self.assertEqual(response.status_code, 403, response.content)

    def test_create_flag_event_fails_for_unauthorized_user(self):
        flagged_content = self.flag_feedback_object
        response = self.client.post(
            reverse("flagged-list"),
            flagged_content,
            format="json",
        )
        self.assertEqual(response.status_code, 403, response.content)

    def test_list_flagged_content_super_admin(self):
        self.user.is_admin = True
        self.user.save()
        self.client.force_authenticate(self.user)
        response = self.client.get(reverse("flagged-list"), format="json")
        self.assertEqual(response.status_code, 200, response.content)

    def test_retreive_fails_for_normal_user(self):
        self.client.force_authenticate(user=self.user)
        flag_feedback_object = FlagFeedbackEvent.objects.create(
            **{
                "context": {"spam": "Spam or misleading"},
                "contentnode_id": self.contentNode.id,
                "content_id": self.contentNode.content_id,
                "target_channel_id": self.channel.id,
                "feedback_type": "FLAGGED",
                "feedback_reason": "Some reason provided by the user",
            },
            user=self.user,
        )
        response = self.client.get(
            reverse("flagged-detail", kwargs={"pk": flag_feedback_object.id}),
            format="json",
        )
        self.assertEqual(response.status_code, 403, response.content)

    def test_list_fails_for_normal_user(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse("flagged-list"), format="json")
        self.assertEqual(response.status_code, 403, response.content)

    def test_list_fails_for_user_dev_feature_enabled(self):
        response = self.client.get(reverse("flagged-list"), format="json")
        self.assertEqual(response.status_code, 403, response.content)

    def test_destroy_flagged_content_super_admin(self):
        self.user.is_admin = True
        self.user.save()
        self.client.force_authenticate(self.user)
        flag_feedback_object = FlagFeedbackEvent.objects.create(
            **{
                "context": {"spam": "Spam or misleading"},
                "contentnode_id": self.contentNode.id,
                "content_id": self.contentNode.content_id,
                "target_channel_id": self.channel.id,
                "feedback_type": "FLAGGED",
                "feedback_reason": "Some reason provided by the user",
            },
            user=self.user,
        )
        response = self.client.delete(
            reverse("flagged-detail", kwargs={"pk": flag_feedback_object.id}),
            format="json",
        )
        self.assertEqual(response.status_code, 204, response.content)

    def test_destroy_flagged_content_fails_for_user_with_feature_flag_disabled(self):
        self.user.feature_flags = {"test_dev_feature": False}
        self.user.save()
        self.client.force_authenticate(user=self.user)
        flag_feedback_object = FlagFeedbackEvent.objects.create(
            **{
                "context": {"spam": "Spam or misleading"},
                "contentnode_id": self.contentNode.id,
                "content_id": self.contentNode.content_id,
                "target_channel_id": self.channel.id,
                "feedback_type": "FLAGGED",
                "feedback_reason": "Some reason provided by the user",
            },
            user=self.user,
        )
        response = self.client.delete(
            reverse("flagged-detail", kwargs={"pk": flag_feedback_object.id}),
            format="json",
        )
        self.assertEqual(response.status_code, 403, response.content)
