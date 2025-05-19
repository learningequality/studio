import json

import requests
from django.urls import reverse_lazy

from .base import StudioTestCase
from .testdata import create_studio_file
from contentcuration import models

###
# Test helper functions
###


def add_field_defaults_to_node(node):
    """
    Since we test using POST, all fields must be present, even if the field will just have the default
    value set. Rather than manually setting a bunch of default values on every node, we just assign it here.
    """
    node.update(
        {
            "license_description": None,
            "copyright_holder": "",
            "questions": [],
            "extra_fields": {},
        }
    )
    if "files" not in node:
        node["files"] = []
    if "description" not in node:
        node["description"] = ""
    if "children" in node:
        for i in range(0, len(node["children"])):
            node["children"][i] = add_field_defaults_to_node(node["children"][i])
    return node


###
# Tests
###


class CreateChannelTestCase(StudioTestCase):
    @classmethod
    def setUpClass(cls):
        super(CreateChannelTestCase, cls).setUpClass()

        cls.channel_metadata = {
            "name": "Aron's cool channel",
            "id": "fasdfada",
            "has_changed": True,
            "description": "coolest channel this side of the Pacific",
            "thumbnail": ":)",
        }

    def setUp(self):
        super(CreateChannelTestCase, self).setUpBase()
        self.topic = models.ContentKind.objects.get(kind="topic")
        self.license = models.License.objects.all()[0]
        self.fileinfo_audio = create_studio_file("abc", preset="audio", ext="mp3")
        self.fileinfo_video = create_studio_file(
            "def", preset="high_res_video", ext="mp4"
        )
        self.fileinfo_video_webm = create_studio_file(
            "ghi", preset="high_res_video", ext="webm"
        )
        self.fileinfo_document = create_studio_file("jkl", preset="document", ext="pdf")
        self.fileinfo_exercise = create_studio_file(
            "mno", preset="exercise", ext="perseus"
        )

    def create_channel(self):
        create_channel_url = str(reverse_lazy("api_create_channel"))
        payload = {
            "channel_data": self.channel_metadata,
        }
        client = self.admin_client()
        response = client.post(
            create_channel_url, data=json.dumps(payload), content_type="text/json"
        )
        return response

    def test_api_file_upload_status(self):
        fileobj, response = self.upload_temp_file(b":)")
        assert response.status_code == requests.codes.ok

    def test_channel_create_channel_created(self):
        response = self.create_channel()
        assert response.status_code == requests.codes.ok
        channel_id = json.loads(response.content)["channel_id"]

        name_check = self.channel_metadata["name"]
        description_check = self.channel_metadata["description"]
        thumbnail_check = self.channel_metadata["thumbnail"]
        results = models.Channel.objects.filter(
            pk=channel_id,
            name=name_check,
            description=description_check,
            thumbnail=thumbnail_check,
        )
        assert results.exists()
        channel = results.first()
        assert channel.main_tree.get_channel() == channel

    def test_channel_create_staging_tree_is_none(self):
        """
        Tests that staging_tree is None after channel creation and before sushi chef starts
        """
        channel_id = json.loads(self.create_channel().content)["channel_id"]
        channel = models.Channel.objects.get(pk=channel_id)
        assert channel.staging_tree is None

    def test_channel_create_chef_tree_is_set(self):
        """
        Tests that chef_tree is set after channel creation and before sushi chef starts.
        """
        channel_id = json.loads(self.create_channel().content)["channel_id"]
        channel = models.Channel.objects.get(pk=channel_id)
        assert channel.chef_tree is not None

    def test_nodes_created(self):
        """
        Checks that the add_nodes API actually creates the nodes with the data passed to the function.
        """
        self.add_nodes()

        def check_tree_node(n, parent=None):
            node = models.ContentNode.objects.get(node_id=n["node_id"])
            assert (
                node.title == n["title"]
                and node.description == n["description"]
                and node.author == n["author"]
                and node.kind.pk == n["kind"]
            )
            assert (
                node.license.license_name == n["license"]
                if node.license
                else n["license"] is None
            )
            parent_id = ""
            if parent:
                parent_id = parent["node_id"]
            assert (
                node.parent.node_id == parent_id
                or node.parent.node_id == self.channel_metadata["id"]
            )
            if "children" in n:
                for child in n["children"]:
                    check_tree_node(child, n)

        for n in self.topic_tree_data():
            check_tree_node(n)

    def test_files_created(self):
        """
        Test that add_nodes adds the files specified to the database and associates them with the correct node.
        """
        self.add_nodes()

        def check_tree_files(n):
            if "files" in n:
                node = models.ContentNode.objects.get(node_id=n["node_id"])
                assert len(n["files"]) == node.files.all().count()
                for file_obj in node.files.all():
                    for afile in n["files"]:
                        assert (
                            str(
                                file_obj.checksum + "." + file_obj.file_format.extension
                            )
                            in afile["filename"]
                        )

            if "children" in n:
                for child in n["children"]:
                    check_tree_files(child)

        for n in self.topic_tree_data():
            check_tree_files(n)

    def test_channel_create_main_tree_unset(self):
        """
        When a newly created channel is saved to the database, main_tree will be set to a new ContentNode if it doesn't already
        exist. Ensure main_tree is created.
        """
        channel_id = json.loads(self.create_channel().content)["channel_id"]
        channel = models.Channel.objects.get(pk=channel_id)
        assert channel.main_tree is not None

    def test_channel_create_version_not_incremented(self):
        """
        Channel version should not be incremented until a cheffing or publishing operation is committed.
        """
        channel_id = json.loads(self.create_channel().content)["channel_id"]
        channel = models.Channel.objects.get(pk=channel_id)
        assert channel.version == 0

    # Helper methods for constructing data

    def topic_tree_data(self):
        # FIXME: This method simply returns a data structure, but the complicating factor is that,
        # it needs several db objects to generate the data, and those objects need to be available
        # outside of this data structure to ascertain that the proper values were created.

        def get_file_data(fileinfo):
            fileobj = fileinfo["db_file"]
            return {
                "filename": fileinfo["name"],
                "size": fileobj.file_size,
                "preset": None,
            }

        data = [
            {
                "title": "Western Philosophy",
                "node_id": "deafdeafdeafdeafdeafdeafdeafdeaf",
                "content_id": "f52d3e2e6ccc59eaaf676aa131edd6ad",
                "description": "Philosophy materials for the budding mind.",
                "kind": self.topic.pk,
                "license": self.license.license_name,
                "author": "Bradley Smoker",
                "children": [
                    {
                        "title": "Nicomachean Ethics",
                        "node_id": "beadbeadbeadbeadbeadbeadbeadbead",
                        "content_id": "fd373d00523b5484a5586c81e4004afb",
                        "author": "Aristotle",
                        "description": "The Nicomachean Ethics is the name normally given to ...",
                        "files": [get_file_data(self.fileinfo_document)],
                        "license": self.license.license_name,
                        "kind": self.fileinfo_document["db_file"].preset.kind.pk,
                    },
                    {
                        "title": "The Critique of Pure Reason",
                        "node_id": "fadefadefadefadefadefadefadefade",
                        "content_id": "07563644b3c059429a0b42853e83c2db",
                        "author": "Bradley Smoker",
                        "description": "Kant saw the Critique of Pure Reason as an attempt to bridge the gap...",
                        "kind": self.topic.pk,
                        "license": self.license.license_name,
                        "children": [
                            {
                                "title": "01 - The Critique of Pure Reason",
                                "node_id": "facefacefacefacefacefacefaceface",
                                "content_id": "9ec91b66dc175c93a4c6a599a76cbc25",
                                "related": "deaddeaddeaddeaddeaddeaddeaddead",
                                "files": [get_file_data(self.fileinfo_video)],
                                "author": "Immanuel Kant",
                                "license": self.license.license_name,
                                "kind": self.fileinfo_video["db_file"].preset.kind.pk,
                            },
                            {
                                "title": "02 - Preface to the Second Edition",
                                "node_id": "deaddeaddeaddeaddeaddeaddeaddead",
                                "content_id": "b249c05125775c479c579e57e66a0a6e",
                                "author": "Immanuel Kant",
                                "kind": self.topic.pk,
                                "license": self.license.license_name,
                                "children": [
                                    {
                                        "title": "02.1 - A Deeply Nested Thought",
                                        "node_id": "badebadebadebadebadebadebadebade",
                                        "content_id": "aad3620a82c253ea9e8190b2989c4921",
                                        "author": "Immanuel Kant",
                                        "license": self.license.license_name,
                                        "kind": self.topic.pk,
                                    }
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                "title": "Recipes",
                "node_id": "acedacedacedacedacedacedacedaced",
                "content_id": "aa480b60a7f4526f886e7df9f4e9b8cc",
                "description": "Recipes for various dishes.",
                "author": "Bradley Smoker",
                "kind": self.topic.pk,
                "license": self.license.license_name,
                "children": [
                    {
                        "title": "Smoked Brisket Recipe",
                        "node_id": "beefbeefbeefbeefbeefbeefbeefbeef",
                        "content_id": "598fc2a55ea55f86bb7ce9008f34a9d0",
                        "author": "Bradley Smoker",
                        "files": [get_file_data(self.fileinfo_audio)],
                        "license": self.license.license_name,
                        "kind": self.fileinfo_audio["db_file"].preset.kind.pk,
                    },
                    {
                        "title": "Food Mob Bites 10: Garlic Bread",
                        "node_id": "cafecafecafecafecafecafecafecafe",
                        "content_id": "7fc278d7dd31577da822e525ec67ee02",
                        "author": "Revision 3",
                        "description": "Basic garlic bread recipe.",
                        "files": [get_file_data(self.fileinfo_exercise)],
                        "license": self.license.license_name,
                        "kind": self.fileinfo_exercise["db_file"].preset.kind.pk,
                    },
                ],
            },
        ]

        for i in range(0, len(data)):
            data[i] = add_field_defaults_to_node(data[i])

        return data

    def add_nodes(self):
        root_id = json.loads(self.create_channel().content)["root"]

        def upload_nodes(root_id, nodes):
            add_nodes_url = str(reverse_lazy("api_add_nodes_to_tree"))
            payload = {
                "root_id": root_id,
                "content_data": nodes,
            }
            response = self.admin_client().post(
                add_nodes_url, data=json.dumps(payload), content_type="text/json"
            )
            data = json.loads(response.content)
            for node in nodes:
                if "children" in node:
                    upload_nodes(data["root_ids"][node["node_id"]], node["children"])

            return response

        return upload_nodes(root_id, self.topic_tree_data())
