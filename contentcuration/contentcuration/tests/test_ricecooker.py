from cStringIO import StringIO
from django.core.urlresolvers import reverse_lazy
import pytest

from le_utils.constants import format_presets
from contentcuration import models as cc
from contentcuration.tests.base import BaseAPITestCase
from contentcuration.tests.testdata import fileobj_video
from contentcuration.tests.testdata import channel
from contentcuration.tests.testdata import node
from contentcuration.views.internal import get_full_node_diff
from contentcuration.views.internal import set_node_diff
from contentcuration.views.internal import get_full_node_diff_endpoint
from contentcuration.utils import minio_utils



STAGED_TREE = {
    "node_id": "00000000000000000000000000000000",
    "kind_id": "topic",
    "title": "Root Node",
    "children": [
        {
            "node_id": "00000000000000000000000000000001",
            "kind_id": "topic",
            "title": "Topic A changed",
            "tags": [{"tag_name": "tag1"}],
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
                    "content_id": "00000000000000000000000000000006",
                    "kind_id": "video",
                    "title": "Video 3",
                },
                {
                    "node_id": "00000000000000000000000000000011",
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
                    "node_id": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                    "content_id": "00000000000000000000000000000003",
                    "kind_id": "video",
                    "title": "Video 1",
                },
                {
                    "node_id": "00000000000000000000000000000009",
                    "content_id": "00000000000000000000000000000006",
                    "kind_id": "video",
                    "title": "Video 3",
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
                            ],
                            "hints": [
                                {
                                    "hint": "Hint 1"
                                },
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
                                    "answer": 10,
                                    "correct": True,
                                    "help_text": ""
                                }
                            ]
                        },
                        {
                            "type": "input_question",
                            "question": "Question 5?",
                            "assessment_id": "0000000000000000000000000000000e",
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

def staging_tree():
    staging_tree = node(STAGED_TREE)

    # Update file
    updated_file_node = staging_tree.get_descendants().filter(node_id='00000000000000000000000000000006').first()
    updated_file_node.files.first().delete()
    new_video_file = fileobj_video(contents="Updated")
    new_video_file.contentnode = updated_file_node
    new_video_file.preset_id = format_presets.VIDEO_HIGH_RES
    new_video_file.save()

    # Delete file
    updated_file_node = staging_tree.get_descendants().filter(node_id='00000000000000000000000000000011').first()
    updated_file_node.files.first().delete()

    # Add file
    updated_file_node = staging_tree.get_descendants().filter(node_id='00000000000000000000000000000007').first()
    new_video_file = fileobj_video()
    new_video_file.contentnode = updated_file_node
    new_video_file.preset_id = format_presets.VIDEO_LOW_RES
    new_video_file.save()

    return staging_tree




class NodeDiffTestCase(BaseAPITestCase):
    persist_bucket = True

    @classmethod
    def setUpClass(cls):
        super(NodeDiffTestCase, cls).setUpClass()
        minio_utils.ensure_storage_bucket_public(will_sleep=False)

    @classmethod
    def teardDownClass(cls):
        super(NodeDiffTestCase, cls).teardDownClass()
        minio_utils.ensure_bucket_deleted()

    def setUp(self):
        super(NodeDiffTestCase, self).setUp()
        self.channel.staging_tree = staging_tree()
        self.channel.save()

        # Set all changed nodes as changed accordingly
        for tree_node in self.channel.staging_tree.get_descendants().prefetch_related('files', 'tags', 'assessment_items'):
            set_node_diff(tree_node, self.channel)

        self.diff = get_full_node_diff(self.channel)
        self.modified_diff = self.diff['nodes_modified']

    def test_detailed_diff_endpoint(self):
        request = self.create_get_request(reverse_lazy("get_full_node_diff", kwargs={"channel_id": self.channel.pk}))
        response = get_full_node_diff_endpoint(request, self.channel.pk)
        self.assertEqual(response.status_code, 200, msg="Response returned {} instead of 200".format(response.status_code))


    """ Test node metadata changes """
    def test_diff_unchanged(self):
        # node 00000000000000000000000000000002 should be unchanged
        node = self.modified_diff.get('00000000000000000000000000000002')
        self.assertIsNone(node, msg="Node should be unchanged")


    def test_diff_metadata_changed(self):
        # node 00000000000000000000000000000001 should be changed
        node = self.modified_diff.get('00000000000000000000000000000001')
        self.assertEqual(node['title'], "Topic A changed", msg="Node title be changed")
        self.assertNotIn('description', node, msg="Node description should not be changed")
        self.assertIn('tags', node, msg="Node tags should be changed")


    """ Test file changes """
    def test_diff_file_changed(self):
        # node 00000000000000000000000000000006 should have an updated video file
        node = self.modified_diff.get('00000000000000000000000000000006')
        self.assertIn('checksum', node['files']['modified'][0], msg="Node should have an updated video file")
        self.assertNotIn('new', node['files'], msg="Updated file should not be in new list")
        self.assertNotIn('deleted', node['files'], msg="Updated file should not be in deleted list")


    def test_diff_file_added(self):
        # node 00000000000000000000000000000007 should have an added file
        node = self.modified_diff.get('00000000000000000000000000000007')
        self.assertTrue(node['files']['new'], msg="Node should have an added file")


    def test_diff_file_removed(self):
        # node 00000000000000000000000000000006 should have a removed file
        node = self.modified_diff.get('00000000000000000000000000000011')
        self.assertTrue(node['files']['deleted'], msg="Node should have a removed file")


    """ Test exercise changes """
    def test_diff_exercise_mastery_changed(self):
        # node 00000000000000000000000000000005 mastery model should be changed
        node = self.modified_diff.get('00000000000000000000000000000005')
        self.assertIsNotNone(node.get('extra_fields'), msg="Node's mastery model should be changed")


    def test_diff_exercise_unchanged(self):
        # assessment 0000000000000000000000000000000d should be unchanged
        exercise_node = self.modified_diff.get('00000000000000000000000000000005')
        unchanged_id = "0000000000000000000000000000000d"
        exercise = next((e for e in exercise_node['assessment_items']['new'] if e['assessment_id'] == unchanged_id), None)
        self.assertIsNone(exercise, msg="Assessment item should not be in new list")

        exercise = next((e for e in exercise_node['assessment_items']['modified'] if e['assessment_id'] == unchanged_id), None)
        self.assertIsNone(exercise, msg="Assessment item should not be in modified list")

        exercise = next((e for e in exercise_node['assessment_items']['deleted'] if e['assessment_id'] == unchanged_id), None)
        self.assertIsNone(exercise, msg="Assessment item should not be in deleted list")


    def test_diff_exercise_question_added(self):
        # assessment 0000000000000000000000000000000e should be added
        exercise_node = self.modified_diff.get('00000000000000000000000000000005')
        exercise = next((e for e in exercise_node['assessment_items']['new'] \
                                if e['assessment_id'] == "0000000000000000000000000000000e"), None)
        self.assertIsNotNone(exercise, msg="Assessment item should be added")

        exercise = next((e for e in exercise_node['assessment_items']['modified'] \
                                if e['assessment_id'] == "0000000000000000000000000000000e"), None)
        self.assertIsNone(exercise, msg="Assessment item should not be in modified list")

        exercise = next((e for e in exercise_node['assessment_items']['deleted'] \
                                if e['assessment_id'] == "0000000000000000000000000000000e"), None)
        self.assertIsNone(exercise, msg="Assessment item should not be in deleted list")


    def test_diff_exercise_question_changed(self):
        # assessment 0000000000000000000000000000000a question should be changed
        exercise_node = self.modified_diff.get('00000000000000000000000000000005')
        exercise_question = next((e for e in exercise_node['assessment_items']['modified'] \
                                if e['assessment_id'] == "0000000000000000000000000000000a"), None)
        self.assertIsNotNone(exercise_question, msg="Assessment item question should be changed")
        self.assertIn('question', exercise_question, msg="Assessment item 'question' should be in diff")


    def test_diff_exercise_answers_changed(self):
        # assessment 0000000000000000000000000000000b answers should be changed
        exercise_node = self.modified_diff.get('00000000000000000000000000000005')
        exercise_answers = next((e for e in exercise_node['assessment_items']['modified'] \
                                if e['assessment_id'] == "0000000000000000000000000000000b"), None)
        self.assertIsNotNone(exercise_answers, msg="Assessment item answers should be changed")
        self.assertIn('answers', exercise_answers, msg="Assessment item 'answers' should be in diff")


    def test_diff_exercise_hints_changed(self):
        # assessment 0000000000000000000000000000000b hints should be changed
        exercise_node = self.modified_diff.get('00000000000000000000000000000005')
        exercise_hints = next((e for e in exercise_node['assessment_items']['modified'] \
                                if e['assessment_id'] == "0000000000000000000000000000000b"), None)
        self.assertIsNotNone(exercise_hints, msg="Assessment item hints should be changed")
        self.assertIn('hints', exercise_hints, msg="Assessment item 'hints' should be in diff")


    def test_diff_exercise_question_removed(self):
        # assessment 0000000000000000000000000000000c should be deleted
        exercise_node = self.modified_diff.get('00000000000000000000000000000005')
        exercise = next((e for e in exercise_node['assessment_items']['deleted'] \
                                if e['assessment_id'] == "0000000000000000000000000000000c"), None)
        self.assertIsNotNone(exercise, msg="Assessment item should be deleted")

        exercise = next((e for e in exercise_node['assessment_items']['modified'] \
                                if e['assessment_id'] == "0000000000000000000000000000000c"), None)
        self.assertIsNone(exercise, msg="Assessment item should not be in modified list")

        exercise = next((e for e in exercise_node['assessment_items']['new'] \
                                if e['assessment_id'] == "0000000000000000000000000000000c"), None)
        self.assertIsNone(exercise, msg="Assessment item should not be in new list")


    """ Test structural changes """
    def test_diff_node_structure_unchanged(self):
        # node 00000000000000000000000000000000 should be unchanged
        # node 00000000000000000000000000000001 should be unchanged
        # node 00000000000000000000000000000002 should be unchanged
        # node 00000000000000000000000000000005 should be unchanged
        # node 00000000000000000000000000000006 should be unchanged
        # node 00000000000000000000000000000007 should be unchanged
        all_structure_dicts = {}
        all_structure_dicts.update(self.diff['nodes_moved'])
        all_structure_dicts.update(self.diff['nodes_added'])
        all_structure_dicts.update(self.diff['nodes_deleted'])
        self.assertNotIn("00000000000000000000000000000000", all_structure_dicts, msg="Node should not be structurally changed")
        self.assertNotIn("00000000000000000000000000000001", all_structure_dicts, msg="Node should not be structurally changed")
        self.assertNotIn("00000000000000000000000000000002", all_structure_dicts, msg="Node should not be structurally changed")
        self.assertNotIn("00000000000000000000000000000005", all_structure_dicts, msg="Node should not be structurally changed")
        self.assertNotIn("00000000000000000000000000000006", all_structure_dicts, msg="Node should not be structurally changed")
        self.assertNotIn("00000000000000000000000000000007", all_structure_dicts, msg="Node should not be structurally changed")


    def test_diff_node_added(self):
        # node 00000000000000000000000000000008 or 00000000000000000000000000000009 should be added
        first_test = '00000000000000000000000000000009' in self.diff['nodes_added']
        second_test = '00000000000000000000000000000008' in self.diff['nodes_added']
        self.assertTrue(first_test or second_test, msg="Node should be added")
        self.assertNotEqual(first_test, second_test, msg="Only one node should be added")


    def test_diff_node_deleted(self):
        # node 00000000000000000000000000000004 should be removed
        self.assertIsNotNone(self.diff['nodes_deleted'].get('00000000000000000000000000000004'), msg="Node should be deleted")


    def test_diff_node_moved(self):
        # node bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb should be moved
        # node 00000000000000000000000000000008 or 00000000000000000000000000000009 should be moved
        moved_node = self.diff['nodes_moved'].get('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')
        self.assertIsNotNone(moved_node, msg="Node should be moved")
        self.assertIsNotNone(moved_node.get('old_parent'), msg="Node should have old_parent")
        self.assertIsNotNone(moved_node.get('new_parent'), msg="Node should have new_parent")
        self.assertIsNotNone(moved_node.get('old_node_id'), msg="Node should have old_node_id")

        first_test = self.diff['nodes_moved'].get('00000000000000000000000000000009')
        second_test = self.diff['nodes_moved'].get('00000000000000000000000000000008')
        moved_node = first_test or second_test
        self.assertIsNotNone(moved_node, msg="Node should be moved")
        self.assertNotEqual(first_test, second_test, msg="Only one node should be moved")
        self.assertIsNotNone(moved_node.get('old_parent'), msg="Node should have old_parent")
        self.assertIsNotNone(moved_node.get('new_parent'), msg="Node should have new_parent")
        self.assertIsNotNone(moved_node.get('old_node_id'), msg="Node should have old_node_id")
