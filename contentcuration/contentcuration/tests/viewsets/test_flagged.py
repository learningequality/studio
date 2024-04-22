from django.urls import reverse
from le_utils.constants import content_kinds

from contentcuration.tests import testdata
from contentcuration.tests.base import StudioAPITestCase


class CRUDTestCase(StudioAPITestCase):
    @property
    def flag_feedback_object(self):
        return {
            'context': {'spam': 'Spam or misleading'},
            'contentnode_id': self.contentNode.id,
            'content_id': self.contentNode.content_id,
            'target_channel_id': self.channel.id,
            'user': self.user.id,
            'feedback_type': 'FLAGGED',
            'feedback_reason': 'Some reason provided by the user'
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
        self.user = testdata.user()

#    def test_list_flagged_content_super_admin(self):
#        pass

    def test_create_flag_event(self):
        self.client.force_authenticate(user=self.user)
        flagged_content = self.flag_feedback_object
        response = self.client.post(
            reverse("flagged-list"), flagged_content, format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)

    def test_create_flag_event_fails_for_unauthorized_user(self):
        flagged_content = self.flag_feedback_object
        response = self.client.post(
            reverse("flagged-list"), flagged_content, format="json",
        )
        self.assertEqual(response.status_code, 403, response.content)

    def test_list_fails_for_normal_user(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse("flagged-list"), format="json")
        self.assertEqual(response.status_code, 403, response.content)
