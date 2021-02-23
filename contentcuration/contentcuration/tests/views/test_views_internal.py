# -*- coding: utf-8 -*-
"""
Tests for contentcuration.views.internal functions.
"""
import json
import uuid

from django.core.urlresolvers import reverse_lazy
from le_utils.constants import format_presets
from mixer.main import mixer
from mock import patch
from rest_framework.test import APIClient

from ..base import BaseAPITestCase
from ..base import StudioTestCase
from ..testdata import channel
from ..testdata import create_studio_file
from ..testdata import create_temp_file
from ..testdata import fileobj_exercise_graphie
from ..testdata import fileobj_exercise_image
from ..testdata import fileobj_video
from ..testdata import user
from contentcuration import ricecooker_versions as rc
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.views import internal


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
        # first setup a test channel...
        self.channel = channel()
        self.root_node = self.channel.main_tree

        # get our random data from mixer
        random_data = mixer.blend(SampleContentNodeDataSchema)
        self.fileobj = fileobj_video()
        self.title = random_data.title
        self.sample_data = {
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
                            "source_url": self.fileobj.source_url,
                        }
                    ],
                    "kind": "document",
                    "license": "CC BY",
                    "license_description": None,
                    "copyright_holder": random_data.copyright_holder,
                    "questions": [],
                    "extra_fields": "{}",
                    "role": "learner",
                }
            ],
        }
        self.resp = self.admin_client().post(
            reverse_lazy("api_add_nodes_to_tree"), data=self.sample_data, format="json"
        )

    def test_404_no_permission(self):
        client = APIClient()
        client.force_authenticate(user())
        response = client.post(
            reverse_lazy("api_add_nodes_to_tree"), self.sample_data, format="json"
        )
        self.assertEqual(response.status_code, 404)

    def test_returns_200_status_code(self):
        """
        Check that we return 200 if passed in a valid JSON.
        """
        # check that we returned 200 with that POST request
        assert self.resp.status_code == 200, "Got a request error: {}".format(
            self.resp.content
        )

    def test_creates_nodes(self):
        """
        Test that it creates a node with the given title and parent.
        """

        # make sure a node with our given self.title exists, with the given parent.
        assert ContentNode.get_nodes_with_title(
            title=self.title, limit_to_children_of=self.root_node.id
        ).exists()

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
        # first setup a test channel...
        self.channel = channel()
        self.root_node = self.channel.main_tree

        # get our random data from mixer
        random_data = mixer.blend(SampleContentNodeDataSchema)
        # a vanilla image file associated with question
        self.exercise_image = fileobj_exercise_image()
        # a perseus image file associated with question
        self.exercise_graphie = fileobj_exercise_graphie()
        self.title = random_data.title
        self.sample_data = {
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
                                    "source_url": None,
                                }
                            ],
                            "question": u"Which numbers are even?\n\nTest local image include: ![](${☣ CONTENTSTORAGE}/%s)"
                            % self.exercise_image.filename(),
                            "hints": "[]",
                            "answers": '[{"answer": "1", "correct": false, "order": 0}, {"answer": "2", "correct": True, "order": 1}, {"answer": "3", "correct": false, "order": 2}, {"answer": "4", "correct": true, "order": 3}, {"answer": "5", "correct": false, "order": 4}]',  # noqa
                            "raw_data": "",
                            "source_url": None,
                            "randomize": False,
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
                                    "source_url": None,
                                }
                            ],
                            "question": "",
                            "hints": "[]",
                            "answers": "[]",
                            "raw_data": u'{"question": {"content": "What was the main idea in the passage you just read?\\n\\n[[☃ radio 1]]\\n\\n Test web+graphie image ![graph](web+graphie:${☣ CONTENTSTORAGE}/%s)", "images": {}, "widgets": {"radio 1": {"type": "radio", "alignment": "default", "static": false, "graded": true, "options": {"choices": [{"content": "The right answer", "correct": true}, {"content": "Another option", "correct": false}, {"isNoneOfTheAbove": false, "content": "Nope, not this", "correct": false}], "randomize": false, "multipleSelect": false, "countChoices": false, "displayCount": null, "hasNoneOfTheAbove": false, "deselectEnabled": false}, "version": {"major": 1, "minor": 0}}}}, "answerArea": {"calculator": false, "chi2Table": false, "periodicTable": false, "tTable": false, "zTable": false}, "itemDataVersion": {"major": 0, "minor": 1}, "hints": []}'  # noqa
                            % self.exercise_graphie.original_filename,  # noqa
                            "source_url": None,
                            "randomize": False,
                        },
                    ],
                    "extra_fields": '{"mastery_model": "m_of_n", "randomize": true, "m": 1, "n": 2}',
                    "role": "learner",
                }
            ],
        }
        self.resp = self.admin_client().post(
            reverse_lazy("api_add_nodes_to_tree"), data=self.sample_data, format="json"
        )

    def test_404_no_permission(self):
        client = APIClient()
        client.force_authenticate(user())
        response = client.post(
            reverse_lazy("api_add_nodes_to_tree"), self.sample_data, format="json"
        )
        self.assertEqual(response.status_code, 404)

    def test_returns_200_status_code(self):
        """
        Check that we return 200 if passed in a valid JSON.
        """
        # check that we returned 200 with that POST request
        assert self.resp.status_code == 200, "Got a request error: {}".format(
            self.resp.content
        )

    def test_creates_nodes(self):
        """
        Test that it creates a node with the given title and parent.
        """
        # make sure a node with our given self.title exists, with the given parent.
        assert ContentNode.get_nodes_with_title(
            title=self.title, limit_to_children_of=self.root_node.id
        ).exists()

    def test_associated_assesment_items_with_created_node(self):
        """
        Check that the file we created beforehand is now associated
        with the node we just created through add_nodes.
        """
        c = ContentNode.objects.get(title=self.title)

        # there shold be no files associated with the condent node
        assert len(c.files.all()) == 0, "unexpected files created"
        # get the associated assessment items...
        assessment_items = list(c.assessment_items.order_by("order"))
        # there should be two assesment items associated with the condent node
        assert len(assessment_items) == 2, "should have two assesment items"
        # created in right order?
        assert (
            assessment_items[0].assessment_id == "abf45e8fd7f151adb1b3df2d751e945e"
        ), "created in wrong order"
        assert (
            assessment_items[1].assessment_id == "98856e24d53b57ea9023782ab6018767"
        ), "created in wrong order"
        # associated with content node c ?
        for assessment_item in assessment_items:
            assert assessment_item.contentnode == c, "not associated with content node"

    def test_exercise_image_files_associated_with_assesment_items(self):
        """
        Check that the files we created beforehand are now associated with the
        correct assesment items.
        """
        c = ContentNode.objects.get(title=self.title)

        question1 = c.assessment_items.get(
            assessment_id="abf45e8fd7f151adb1b3df2d751e945e"
        )
        assert len(question1.files.all()) == 1, "wrong number of files"
        file1 = question1.files.all()[0]
        assert (
            file1.assessment_item == question1
        ), "not associated with right assessment item"
        assert file1.filename() == self.exercise_image.filename(), "wrong file"
        assert (
            file1.file_on_disk.read() == self.exercise_image.file_on_disk.read()
        ), "different contents"

        question2 = c.assessment_items.get(
            assessment_id="98856e24d53b57ea9023782ab6018767"
        )
        assert len(question2.files.all()) == 1, "wrong number of files"
        file2 = question2.files.all()[0]
        assert (
            file2.assessment_item == question2
        ), "not associated with right assessment item"
        assert file2.filename() == self.exercise_graphie.filename(), "wrong file"
        assert (
            file2.file_on_disk.read() == self.exercise_graphie.file_on_disk.read()
        ), "different contents"
        assert (
            file2.original_filename == self.exercise_graphie.original_filename
        ), "wrong original_filename"


class PublishEndpointTestCase(BaseAPITestCase):
    @classmethod
    def setUpClass(cls):
        super(PublishEndpointTestCase, cls).setUpClass()
        cls.patch_copy_db = patch('contentcuration.utils.publish.save_export_database')
        cls.patch_copy_db.start()

    @classmethod
    def tearDownClass(cls):
        super(PublishEndpointTestCase, cls).tearDownClass()
        cls.patch_copy_db.stop()

    def test_404_non_existent(self):
        response = self.post(
            reverse_lazy("api_publish_channel"), {"channel_id": uuid.uuid4().hex}
        )
        self.assertEqual(response.status_code, 404)

    def test_200_publish_successful(self):
        self.channel.editors.add(self.user)
        response = self.post(
            reverse_lazy("api_publish_channel"), {"channel_id": self.channel.id}
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])

    def test_404_not_authorized(self):
        new_channel = Channel.objects.create()
        response = self.post(
            reverse_lazy("api_publish_channel"), {"channel_id": new_channel.id}
        )
        self.assertEqual(response.status_code, 404)


class VersionEndpointTestCase(BaseAPITestCase):
    def test_better_than_OK(self):
        with patch(
            "contentcuration.views.internal.VERSION_OK",
            internal.VersionStatus(
                version="0.0.1", status=0, message=rc.VERSION_OK_MESSAGE
            ),
        ):
            response = self.post(reverse_lazy("check_version"), {"version": "0.1.1"})
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json()["success"])
            self.assertEqual(response.json()["status"], internal.VERSION_OK[1])

    def test_OK(self):
        response = self.post(reverse_lazy("check_version"), {"version": rc.VERSION_OK})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.assertEqual(response.json()["status"], internal.VERSION_OK[1])

    def test_worse_than_OK_but_better_than_soft(self):
        with patch(
            "contentcuration.views.internal.VERSION_OK",
            internal.VersionStatus(
                version="1.0.0", status=0, message=rc.VERSION_OK_MESSAGE
            ),
        ), patch(
            "contentcuration.views.internal.VERSION_SOFT_WARNING",
            internal.VersionStatus(
                version="0.0.1", status=1, message=rc.VERSION_SOFT_WARNING_MESSAGE
            ),
        ):
            response = self.post(reverse_lazy("check_version"), {"version": "0.1.1"})
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json()["success"])
            self.assertEqual(
                response.json()["status"], internal.VERSION_SOFT_WARNING[1]
            )

    def test_soft_warning(self):
        response = self.post(
            reverse_lazy("check_version"), {"version": rc.VERSION_SOFT_WARNING}
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.assertEqual(response.json()["status"], internal.VERSION_SOFT_WARNING[1])

    def test_worse_than_soft_but_better_than_hard(self):
        with patch(
            "contentcuration.views.internal.VERSION_SOFT_WARNING",
            internal.VersionStatus(
                version="1.0.0", status=1, message=rc.VERSION_SOFT_WARNING_MESSAGE
            ),
        ), patch(
            "contentcuration.views.internal.VERSION_HARD_WARNING",
            internal.VersionStatus(
                version="0.0.1", status=2, message=rc.VERSION_HARD_WARNING_MESSAGE
            ),
        ):
            response = self.post(reverse_lazy("check_version"), {"version": "0.1.1"})
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json()["success"])
            self.assertEqual(
                response.json()["status"], internal.VERSION_HARD_WARNING[1]
            )

    def test_hard_warning(self):
        response = self.post(
            reverse_lazy("check_version"), {"version": rc.VERSION_HARD_WARNING}
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.assertEqual(response.json()["status"], internal.VERSION_HARD_WARNING[1])

    def test_worse_than_hard(self):
        with patch(
            "contentcuration.views.internal.VERSION_HARD_WARNING",
            internal.VersionStatus(
                version="1.0.0", status=2, message=rc.VERSION_HARD_WARNING_MESSAGE
            ),
        ):
            response = self.post(reverse_lazy("check_version"), {"version": "0.1.1"})
            self.assertEqual(response.status_code, 200)
            self.assertTrue(response.json()["success"])
            self.assertEqual(response.json()["status"], internal.VERSION_ERROR[1])


class FileDiffEndpointTestCase(BaseAPITestCase):
    def test_200_no_files(self):
        response = self.post(reverse_lazy("file_diff"), [])
        self.assertEqual(response.status_code, 200)

    def test_200_1_file_present(self):
        file = create_temp_file(b"test")
        response = self.post(reverse_lazy("file_diff"), [file["name"]])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_200_1_file_present_1_missing(self):
        file = create_temp_file(b"test")
        response = self.post(reverse_lazy("file_diff"), [file["name"], "test_file"])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), ["test_file"])

    def test_401_no_auth(self):
        self.client.logout()
        response = self.post(reverse_lazy("file_diff"), [])
        self.assertEqual(response.status_code, 401)


class AuthenticateUserEndpointTestCase(BaseAPITestCase):
    def test_200_get(self):
        response = self.get(reverse_lazy("authenticate_user_internal"))
        self.assertEqual(response.status_code, 200)

    def test_200_post(self):
        response = self.post(reverse_lazy("authenticate_user_internal"), {})
        self.assertEqual(response.status_code, 200)

    def test_401_no_auth(self):
        self.client.logout()
        response = self.post(reverse_lazy("authenticate_user_internal"), {})
        self.assertEqual(response.status_code, 401)

    def test_200_response(self):
        response = self.get(reverse_lazy("authenticate_user_internal"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user_id"], self.user.id)
        self.assertEqual(response.json()["username"], str(self.user))
        self.assertEqual(response.json()["first_name"], self.user.first_name)
        self.assertEqual(response.json()["last_name"], self.user.last_name)
        self.assertEqual(response.json()["is_admin"], self.user.is_admin)


class APICommitChannelEndpointTestCase(BaseAPITestCase):
    def test_200_post(self):
        self.channel.chef_tree = self.channel.main_tree
        self.channel.staging_tree = self.channel.main_tree
        self.channel.save()
        response = self.post(
            reverse_lazy("api_finish_channel"), {"channel_id": self.channel.id}
        )
        self.assertEqual(response.status_code, 200)

    def test_404_no_permission(self):
        new_channel = Channel.objects.create()
        response = self.post(
            reverse_lazy("api_finish_channel"), {"channel_id": new_channel.id}
        )
        self.assertEqual(response.status_code, 404)


class APIActivateChannelEndpointTestCase(BaseAPITestCase):
    def test_200_post(self):
        self.channel.staging_tree = self.channel.main_tree
        self.channel.save()
        response = self.post(
            reverse_lazy("activate_channel_internal"), {"channel_id": self.channel.id}
        )
        self.assertEqual(response.status_code, 200)

    def test_404_no_permission(self):
        new_channel = Channel.objects.create()
        response = self.post(
            reverse_lazy("activate_channel_internal"), {"channel_id": new_channel.id}
        )
        self.assertEqual(response.status_code, 404)


class CheckUserIsEditorEndpointTestCase(BaseAPITestCase):
    def test_200_post(self):
        response = self.post(
            reverse_lazy("check_user_is_editor"), {"channel_id": self.channel.id}
        )
        self.assertEqual(response.status_code, 200)

    def test_404_no_permission(self):
        new_channel = Channel.objects.create()
        response = self.post(
            reverse_lazy("check_user_is_editor"), {"channel_id": new_channel.id}
        )
        self.assertEqual(response.status_code, 404)


class GetTreeDataEndpointTestCase(BaseAPITestCase):
    def test_200_post(self):
        response = self.post(
            reverse_lazy("get_tree_data"),
            {"channel_id": self.channel.id, "tree": "main"},
        )
        self.assertEqual(response.status_code, 200)

    def test_404_no_permission(self):
        new_channel = Channel.objects.create()
        response = self.post(
            reverse_lazy("get_tree_data"),
            {"channel_id": new_channel.id, "tree": "main"},
        )
        self.assertEqual(response.status_code, 404)


class GetNodeTreeDataEndpointTestCase(BaseAPITestCase):
    def test_200_post(self):
        response = self.post(
            reverse_lazy("get_node_tree_data"),
            {"channel_id": self.channel.id, "tree": "main"},
        )
        self.assertEqual(response.status_code, 200)

    def test_404_no_permission(self):
        new_channel = Channel.objects.create()
        response = self.post(
            reverse_lazy("get_node_tree_data"),
            {"channel_id": new_channel.id, "tree": "main"},
        )
        self.assertEqual(response.status_code, 404)


class GetChannelStatusBulkEndpointTestCase(BaseAPITestCase):
    def test_200_post(self):
        response = self.post(
            reverse_lazy("get_channel_status_bulk"), {"channel_ids": [self.channel.id]}
        )
        self.assertEqual(response.status_code, 200)

    def test_404_no_permission(self):
        new_channel = Channel.objects.create()
        response = self.post(
            reverse_lazy("get_channel_status_bulk"),
            {"channel_ids": [self.channel.id, new_channel.id]},
        )
        self.assertEqual(response.status_code, 404)


class CreateChannelTestCase(StudioTestCase):
    """
    Tests for contentcuration.views.internal.api_create_channel_endpoint function.
    """

    def setUp(self):
        super(CreateChannelTestCase, self).setUp()
        self.channel_data = {
            "id": uuid.uuid4().hex,
            "name": "Test channel for creation",
            "thumbnail": "thumbnail.jpg",
            "language": "as",
            "description": "This is a long description for administrators and coaches",
            "tagline": "This is a short description for learners",
            "license": None,
            "source_domain": "unique domain",
            "source_id": "unique domain root",
            "ricecooker_version": '0.6.46',
            "extra_fields": None,
            "files": None,
        }

    def test_401_no_permission(self):
        client = APIClient()
        response = client.post(
            reverse_lazy("api_create_channel"), data={"channel_data": self.channel_data}, format="json"
        )
        self.assertEqual(response.status_code, 401)

    def test_returns_200_status_code(self):
        """
        Check that we return 200 if passed in a valid JSON.
        """
        # check that we returned 200 with that POST request
        resp = self.admin_client().post(
            reverse_lazy("api_create_channel"), data={"channel_data": self.channel_data}, format="json"
        )
        self.assertEqual(resp.status_code, 200, "Got a request error: {}".format(resp.content))

    def test_creates_channel(self):
        """
        Test that it creates a channel with the given id
        """
        self.admin_client().post(
            reverse_lazy("api_create_channel"), data={"channel_data": self.channel_data}, format="json"
        )
        try:
            Channel.objects.get(id=self.channel_data["id"])
        except Channel.DoesNotExist:
            self.fail("Channel was not created")

    def test_creates_cheftree(self):
        """
        Test that it creates a channel with the given id
        """
        self.admin_client().post(
            reverse_lazy("api_create_channel"), data={"channel_data": self.channel_data}, format="json"
        )
        try:
            c = Channel.objects.get(id=self.channel_data["id"])
        except Channel.DoesNotExist:
            self.fail("Channel was not created")

        self.assertIsNotNone(c.chef_tree)

    def test_associates_file_with_created_channel(self):
        """
        Check that the file we passed is now associated
        with the chef_tree we just created.
        """
        dummy_file = create_studio_file(b"aaaaaaaaaaaaaaa", preset=format_presets.HTML5_ZIP, ext="zip")
        test_file = {
            'size': len(dummy_file["data"]),
            'preset': format_presets.HTML5_ZIP,
            'filename': dummy_file["name"],
            'original_filename': 'test_file',
            'language': "as",
            'source_url': "https://justatest.com/test_file.zip",
        }
        self.channel_data.update({"files": [test_file]})
        self.admin_client().post(
            reverse_lazy("api_create_channel"), data={"channel_data": self.channel_data}, format="json"
        )

        try:
            c = Channel.objects.get(id=self.channel_data["id"])
        except Channel.DoesNotExist:
            self.fail("Channel was not created")

        self.assertEqual(c.chef_tree.files.first().filename(), test_file["filename"])

    def test_associates_extra_fields_with_root_node(self):
        """
        Check that extra_fields information is put on the chef_tree root node
        """
        self.channel_data.update({"extra_fields": json.dumps({"modality": "CUSTOM_NAVIGATION"})})
        self.admin_client().post(
            reverse_lazy("api_create_channel"), data={"channel_data": self.channel_data}, format="json"
        )

        try:
            c = Channel.objects.get(id=self.channel_data["id"])
        except Channel.DoesNotExist:
            self.fail("Channel was not created")

        self.assertEqual(c.chef_tree.extra_fields["modality"], "CUSTOM_NAVIGATION")
