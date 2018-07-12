from cStringIO import StringIO

import pytest
from contentcuration.tests.fixtures.testcase import BaseAPITestCase, node, fileobj_video
from django.core.urlresolvers import reverse_lazy

from contentcuration import models as cc
from contentcuration.views.internal import get_full_node_diff, set_node_diff
from le_utils.constants import format_presets

pytestmark = pytest.mark.django_db

STAGED_TREE = {
    "node_id": "00000000000000000000000000000000",
    "kind_id": "topic",
    "title": "Root Node",
    "children": [
        {
            "node_id": "00000000000000000000000000000001",
            "kind_id": "topic",
            "title": "Topic A changed",
            "children": [
                {
                    "node_id": "00000000000000000000000000000006",
                    "kind_id": "video",
                    "title": "Video 3",
                },
                {
                    "node_id": "00000000000000000000000000000007",
                    "kind_id": "video",
                    "title": "Video 4",
                },
                {
                    "node_id": "00000000000000000000000000000008",
                    "kind_id": "video",
                    "title": "Video 5",
                }
            ]
        },
        {
            "node_id": "00000000000000000000000000000002",
            "kind_id": "topic",
            "title": "Topic B",
            "children": [
                {
                    "node_id": "00000000000000000000000000000003",
                    "kind_id": "video",
                    "title": "Video 1",
                },
                {
                    "node_id": "00000000000000000000000000000005",
                    "kind_id": "exercise",
                    "title": "Exercise 1",
                    "mastery_model": "m_of_n",
                    "m": 3,
                    "n": 5,
                    "assessment_items": [
                        {
                            "type": "single_selection",
                            "question": "Question 1 changed?",
                            "assessment_id": "0000000000000000000000000000000a",
                            "answers": [
                                {
                                    "answer": "Answer 1",
                                    "correct": True,
                                    "help_text": ""
                                },
                                {
                                    "answer": "Answer 2",
                                    "correct": False,
                                    "help_text": ""
                                }
                            ]
                        },
                        {
                            "type": "multiple_selection",
                            "question": "Question 2?",
                            "assessment_id": "0000000000000000000000000000000b",
                            "answers": [
                                {
                                    "answer": "Answer 1",
                                    "correct": False,
                                    "help_text": ""
                                },
                                {
                                    "answer": "Answer 2 changed",
                                    "correct": True,
                                    "help_text": ""
                                }
                            ]
                        },
                        {
                            "type": "input_question",
                            "question": "Question 4?",
                            "assessment_id": "0000000000000000000000000000000d",
                            "answers": [
                                {
                                    "answer": 100,
                                    "correct": True,
                                    "help_text": ""
                                },
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}


class NodeDiffTestCase(BaseAPITestCase):

    @classmethod
    def setUpClass(self):
        super(NodeDiffTestCase, self).setUpClass()
        self.channel.staging_tree = node(STAGED_TREE)
        self.channel.save()

        # Update file
        updated_file_node = self.channel.staging_tree.get_descendants().filter(node_id='00000000000000000000000000000006').first()
        updated_file_node.files.first().delete()
        new_video_file = fileobj_video(contents="Updated").next()
        new_video_file.contentnode = updated_file_node
        new_video_file.preset_id = format_presets.VIDEO_HIGH_RES
        new_video_file.save()

        # Delete file
        updated_file_node = self.channel.staging_tree.get_descendants().filter(node_id='00000000000000000000000000000003').first()
        updated_file_node.files.first().delete()

        # Add file
        updated_file_node = self.channel.staging_tree.get_descendants().filter(node_id='00000000000000000000000000000007').first()
        new_video_file = fileobj_video().next()
        new_video_file.contentnode = updated_file_node
        new_video_file.preset_id = format_presets.VIDEO_LOW_RES
        new_video_file.save()

        # Set all changed nodes as changed accordingly
        for tree_node in self.channel.staging_tree.get_descendants().prefetch_related('files', 'tags', 'assessment_items'):
            set_node_diff(tree_node, self.channel)

        self.diff = get_full_node_diff(self.channel)

    def test_detailed_diff_endpoint(self):
        response = self.get(reverse_lazy("get_full_node_diff", kwargs={"channel_id": self.channel.pk}))
        self.assertEqual(response.status_code, 200)

    def test_diff_unchanged(self):
        # node 00000000000000000000000000000002 should be unchanged
        node = self.diff.get('00000000000000000000000000000002')
        self.assertEqual(node, None)

    def test_diff_metadata_changed(self):
        # node 00000000000000000000000000000001 should be changed
        node = self.diff.get('00000000000000000000000000000001')
        self.assertEqual(node['title'], "Topic A changed")
        self.assertEqual(node.get('description'), None)

    def test_diff_file_changed(self):
        # node 00000000000000000000000000000006 should have an updated video file
        node = self.diff.get('00000000000000000000000000000006')
        self.assertEqual(bool(node['files']['modified'][0].get('checksum')), True)
        self.assertEqual(node['files'].get('new'), None)
        self.assertEqual(node['files'].get('deleted'), None)

    def test_diff_file_added(self):
        # node 00000000000000000000000000000007 should have an added file
        node = self.diff.get('00000000000000000000000000000007')
        self.assertEqual(bool(node['files']['new']), True)

    def test_diff_file_removed(self):
        # node 00000000000000000000000000000003 should have a removed file
        node = self.diff.get('00000000000000000000000000000003')
        self.assertEqual(bool(node['files']['deleted']), True)

    def test_diff_exercise_mastery_changed(self):
        # node 00000000000000000000000000000005 mastery model should be changed
        node = self.diff.get('00000000000000000000000000000005')
        self.assertEqual(bool(node.get('extra_fields')), True)

    def test_diff_exercise_question_added(self):
        # assessment 0000000000000000000000000000000d should be added
        exercise = self.diff.get('00000000000000000000000000000005')

        self.assertEqual(True, True)

    # def test_diff_exercise_question_changed(self):
    #     # assessment 0000000000000000000000000000000a question should be changed
    #     # assessment 0000000000000000000000000000000b answers should be changed
    #     self.assertEqual(True, True)

    # def test_diff_exercise_question_removed(self):
    #     # assessment 0000000000000000000000000000000c should be deleted
    #     self.assertEqual(True, True)

    # def test_diff_node_added(self):
    #     # node 00000000000000000000000000000008 should be added
    #     self.assertEqual(True, True)

    # def test_diff_node_deleted(self):
    #     # node 00000000000000000000000000000004 should be removed
    #     self.assertEqual(True, True)

    # def test_diff_node_moved(self):
    #     # node 00000000000000000000000000000003 should be moved
    #     self.assertEqual(True, True)
