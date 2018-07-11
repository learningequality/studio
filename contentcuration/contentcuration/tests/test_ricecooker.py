from cStringIO import StringIO

import pytest
from contentcuration.tests.fixtures.testcase import BaseAPITestCase, node, fileobj_video
from django.core.urlresolvers import reverse_lazy

from contentcuration import models as cc

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
                    "mastery_model": "num_correct_in_a_row_5",
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
        self.channel.staging_tree.get_descendants().update(changed=True)

        # Update file
        updated_file_node = self.channel.staging_tree.get_descendants().filter(node_id='00000000000000000000000000000006').first()
        updated_file_node.files.first().delete()
        new_video_file = fileobj_video(contents="Updated").next()
        new_video_file.contentnode = updated_file_node
        new_video_file.save()

        # Delete file
        updated_file_node = self.channel.staging_tree.get_descendants().filter(node_id='00000000000000000000000000000003').first()
        updated_file_node.files.first().delete()

        # Add file
        updated_file_node = self.channel.staging_tree.get_descendants().filter(node_id='00000000000000000000000000000007').first()
        new_video_file = fileobj_video().next()
        new_video_file.contentnode = updated_file_node
        new_video_file.save()

    def test_detailed_diff_endpoint(self):
        response = self.get(reverse_lazy("get_full_node_diff", kwargs={"channel_id": self.channel.pk}))
        self.assertEqual(response.status_code, 200)

    # def test_diff_unchanged(cls):
    #     # node 00000000000000000000000000000002 should be unchanged
    #     cls.assertEqual(True, True)

    # def test_diff_metadata_changed(cls):
    #     # node 00000000000000000000000000000001 should be changed
    #     cls.assertEqual(True, True)

    # def test_diff_file_changed(self):
    #     # node 00000000000000000000000000000006 should have an updated video file
    #     self.assertEqual(True, True)

    # def test_diff_file_added(self):
    #     # node 00000000000000000000000000000007 should have an added file
    #     self.assertEqual(True, True)

    # def test_diff_file_removed(self):
    #     # node 00000000000000000000000000000003 should have a removed file
    #     self.assertEqual(True, True)

    # def test_diff_exercise_mastery_changed(self):
    #     # node 00000000000000000000000000000005 mastery model should be changed
    #     self.assertEqual(True, True)

    # def test_diff_exercise_question_added(self):
    #     # assessment 0000000000000000000000000000000d should be added
    #     self.assertEqual(True, True)

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
