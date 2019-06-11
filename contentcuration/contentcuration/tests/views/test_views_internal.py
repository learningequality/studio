# -*- coding: utf-8 -*-
"""
Tests for contentcuration.views.internal functions.
"""
import uuid

from django.core.urlresolvers import reverse_lazy
from mixer.main import mixer

from ..base import BaseAPITestCase
from ..base import StudioTestCase
from ..testdata import fileobj_exercise_graphie
from ..testdata import fileobj_exercise_image
from ..testdata import fileobj_video
from ..testdata import tree
from contentcuration.models import Channel
from contentcuration.models import ContentNode


class SampleContentNodeDataSchema:
    """
    A class schema that we use to autogenerate parts of the
    JSON data we send to api_add_nodes_to_tree. Pair this with
    mixer.blend to autogenerate the schema with random values.
    """
    title = str
    description = str
    node_id = str
    content_id = str
    source_domain = str
    source_id = str
    author = str
    copyright_holder = str


class ApiAddNodesToTreeTestCase(StudioTestCase):
    """
    Tests for contentcuration.views.internal.api_add_nodes_to_tree function.
    """

    def setUp(self):
        super(ApiAddNodesToTreeTestCase, self).setUp()
        # get our random data from mixer
        random_data = mixer.blend(SampleContentNodeDataSchema)
        self.root_node = tree()
        self.fileobj = fileobj_video()
        self.title = random_data.title
        sample_data = {
            "root_id": self.root_node.id,
            "content_data": [
                {
                    "title": self.title,
                    "language": "en",
                    "description": random_data.description,
                    "node_id": random_data.node_id,
                    "content_id": random_data.content_id,
                    "source_domain": random_data.source_domain,
                    "source_id": random_data.source_id,
                    "author": random_data.author,
                    "files": [
                        {
                            "size": self.fileobj.file_size,
                            "preset": "video",
                            "filename": self.fileobj.filename(),
                            "original_filename": self.fileobj.original_filename,
                            "language": self.fileobj.language,
                            "source_url": self.fileobj.source_url
                        }
                    ],
                    "kind": "document",
                    "license": "CC BY",
                    "license_description": None,
                    "copyright_holder": random_data.copyright_holder,
                    "questions": [],
                    "extra_fields": "{}",
                    "role": "learner"
                }
            ]
        }
        self.resp = self.admin_client().post(
            "/api/internal/add_nodes",
            data=sample_data,
            format='json'
        )

    def test_returns_200_status_code(self):
        """
        Check that we return 200 if passed in a valid JSON.
        """
        # check that we returned 200 with that POST request
        assert self.resp.status_code == 200, "Got a request error: {}".format(self.resp.content)

    def test_creates_nodes(self):
        """
        Test that it creates a node with the given title and parent.
        """

        # make sure a node with our given self.title exists, with the given parent.
        assert ContentNode.get_nodes_with_title(title=self.title, limit_to_children_of=self.root_node.id).exists()

    def test_associates_file_with_created_node(self):
        """
        Check that the file we created beforehand is now associated
        with the node we just created through add_nodes.
        """

        c = ContentNode.objects.get(title=self.title)

        # check that the file we associated has the same checksum
        f = c.files.get(checksum=self.fileobj.checksum)
        assert f

        # check that we can read the file and it's equivalent to
        # our original file object
        assert f.file_on_disk.read() == self.fileobj.file_on_disk.read()


class ApiAddExerciseNodesToTreeTestCase(StudioTestCase):
    """
    Tests for contentcuration.views.internal.api_add_nodes_to_tree function for nodes
    of type Exercise that contain questions with associated image files.
    """

    def setUp(self):
        super(ApiAddExerciseNodesToTreeTestCase, self).setUp()
        # get our random data from mixer
        random_data = mixer.blend(SampleContentNodeDataSchema)
        self.root_node = tree()
        self.exercise_image = fileobj_exercise_image()          # a vanilla image file associated with question
        self.exercise_graphie = fileobj_exercise_graphie()      # a perseus image file associated with question
        self.title = random_data.title
        sample_data = {
            "root_id": self.root_node.id,
            "content_data": [
                {
                    "title": self.title,
                    "language": "en",
                    "description": random_data.description,
                    "node_id": random_data.node_id,
                    "content_id": random_data.content_id,
                    "source_domain": random_data.source_domain,
                    "source_id": random_data.source_id,
                    "author": random_data.author,
                    "files": [],
                    "kind": "exercise",
                    "license": "CC BY",
                    "license_description": None,
                    "copyright_holder": random_data.copyright_holder,
                    "questions": [
                        {
                            "assessment_id": "abf45e8fd7f151adb1b3df2d751e945e",
                            "type": "multiple_selection",
                            "files": [
                                {
                                    "size": self.exercise_image.file_size,
                                    "preset": "exercise_image",
                                    "filename": self.exercise_image.filename(),
                                    "original_filename": None,
                                    "language": None,
                                    "source_url": None
                                }
                            ],
                            "question": u"Which numbers are even?\n\nTest local image include: ![](${☣ CONTENTSTORAGE}/%s)" % self.exercise_image.filename(),
                            "hints": "[]",
                            "answers": "[{\"answer\": \"1\", \"correct\": false, \"order\": 0}, {\"answer\": \"2\", \"correct\": True, \"order\": 1}, {\"answer\": \"3\", \"correct\": false, \"order\": 2}, {\"answer\": \"4\", \"correct\": true, \"order\": 3}, {\"answer\": \"5\", \"correct\": false, \"order\": 4}]",  # noqa
                            "raw_data": "",
                            "source_url": None,
                            "randomize": False
                        },
                        {
                            "assessment_id": "98856e24d53b57ea9023782ab6018767",
                            "type": "perseus_question",
                            "files": [
                                {
                                    "size": self.exercise_graphie.file_size,
                                    "preset": "exercise_graphie",
                                    "filename": self.exercise_graphie.filename(),
                                    "original_filename": self.exercise_graphie.original_filename,
                                    "language": None,
                                    "source_url": None
                                }
                            ],
                            "question": "",
                            "hints": "[]",
                            "answers": "[]",
                            "raw_data": u"{\"question\": {\"content\": \"What was the main idea in the passage you just read?\\n\\n[[☃ radio 1]]\\n\\n Test web+graphie image ![graph](web+graphie:${☣ CONTENTSTORAGE}/%s)\", \"images\": {}, \"widgets\": {\"radio 1\": {\"type\": \"radio\", \"alignment\": \"default\", \"static\": false, \"graded\": true, \"options\": {\"choices\": [{\"content\": \"The right answer\", \"correct\": true}, {\"content\": \"Another option\", \"correct\": false}, {\"isNoneOfTheAbove\": false, \"content\": \"Nope, not this\", \"correct\": false}], \"randomize\": false, \"multipleSelect\": false, \"countChoices\": false, \"displayCount\": null, \"hasNoneOfTheAbove\": false, \"deselectEnabled\": false}, \"version\": {\"major\": 1, \"minor\": 0}}}}, \"answerArea\": {\"calculator\": false, \"chi2Table\": false, \"periodicTable\": false, \"tTable\": false, \"zTable\": false}, \"itemDataVersion\": {\"major\": 0, \"minor\": 1}, \"hints\": []}" % self.exercise_graphie.original_filename,  # noqa
                            "source_url": None,
                            "randomize": False
                        }
                    ],
                    "extra_fields": "{\"mastery_model\": \"m_of_n\", \"randomize\": true, \"m\": 1, \"n\": 2}",
                    "role": "learner"
                }
            ]
        }
        self.resp = self.admin_client().post(
            "/api/internal/add_nodes",
            data=sample_data,
            format='json'
        )

    def test_returns_200_status_code(self):
        """
        Check that we return 200 if passed in a valid JSON.
        """
        # check that we returned 200 with that POST request
        assert self.resp.status_code == 200, "Got a request error: {}".format(self.resp.content)

    def test_creates_nodes(self):
        """
        Test that it creates a node with the given title and parent.
        """
        # make sure a node with our given self.title exists, with the given parent.
        assert ContentNode.get_nodes_with_title(title=self.title, limit_to_children_of=self.root_node.id).exists()

    def test_associated_assesment_items_with_created_node(self):
        """
        Check that the file we created beforehand is now associated
        with the node we just created through add_nodes.
        """
        c = ContentNode.objects.get(title=self.title)

        # there shold be no files associated with the condent node
        assert len(c.files.all()) == 0, 'unexpected files created'
        # get the associated assessment items...
        assessment_items = list(c.assessment_items.order_by('order'))
        # there should be two assesment items associated with the condent node
        assert len(assessment_items) == 2, 'should have two assesment items'
        # created in right order?
        assert assessment_items[0].assessment_id == 'abf45e8fd7f151adb1b3df2d751e945e', 'created in wrong order'
        assert assessment_items[1].assessment_id == '98856e24d53b57ea9023782ab6018767', 'created in wrong order'
        # associated with content node c ?
        for assessment_item in assessment_items:
            assert assessment_item.contentnode == c, 'not associated with content node'

    def test_exercise_image_files_associated_with_assesment_items(self):
        """
        Check that the files we created beforehand are now associated with the
        correct assesment items.
        """
        c = ContentNode.objects.get(title=self.title)

        question1 = c.assessment_items.get(assessment_id='abf45e8fd7f151adb1b3df2d751e945e')
        assert len(question1.files.all()) == 1, 'wrong number of files'
        file1 = question1.files.all()[0]
        assert file1.assessment_item == question1, 'not associated with right assessment item'
        assert file1.filename() == self.exercise_image.filename(), 'wrong file'
        assert file1.file_on_disk.read() == self.exercise_image.file_on_disk.read(), 'different contents'

        question2 = c.assessment_items.get(assessment_id='98856e24d53b57ea9023782ab6018767')
        assert len(question2.files.all()) == 1, 'wrong number of files'
        file2 = question2.files.all()[0]
        assert file2.assessment_item == question2, 'not associated with right assessment item'
        assert file2.filename() == self.exercise_graphie.filename(), 'wrong file'
        assert file2.file_on_disk.read() == self.exercise_graphie.file_on_disk.read(), 'different contents'
        assert file2.original_filename == self.exercise_graphie.original_filename, 'wrong original_filename'


class PublishEndpointTestCase(BaseAPITestCase):

    def test_404_non_existent(self):
        response = self.post(reverse_lazy("api_publish_channel"), {"channel_id": uuid.uuid4().hex})
        self.assertEqual(response.status_code, 404)

    def test_200_publish_successful(self):
        self.channel.editors.add(self.user)
        response = self.post(reverse_lazy("api_publish_channel"), {"channel_id": self.channel.id})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])

    def test_404_not_authorized(self):
        new_channel = Channel.objects.create()
        response = self.post(reverse_lazy("api_publish_channel"), {"channel_id": new_channel.id})
        self.assertEqual(response.status_code, 404)
