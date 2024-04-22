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
            'user': self.user,
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

    def test_create_flag_event(self):
        self.client.force_authenticate(user=self.user)
        flagged_content = self.flag_feedback_object
        response = self.client.post(
            reverse("flagged"), flagged_content, format="json",
        )
        self.assertEqual(response.status_code, 201, response.content)
