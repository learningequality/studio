"""
Tests for contentcuration.views.internal functions.
"""
import json
from mixer.main import mixer

from contentcuration.models import ContentNode

from ..base import StudioTestCase
from ..testdata import tree, fileobj_video

class ApiAddNodesToTreeTestCase(StudioTestCase):
    """
    Tests for contentcuration.views.internal.api_add_nodes_to_tree function.
    """

    class SampleNodeDataSchema:
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

    def setUp(self):
        super(ApiAddNodesToTreeTestCase, self).setUp()
        # get our random data from mixer
        random_data = mixer.blend(self.SampleNodeDataSchema)
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

        serialized_data = json.dumps(sample_data)

        self.resp = self.admin_client().post(
            "/api/internal/add_nodes",
            data=serialized_data,
            # remember to set content_type to json, so django will
            # decode it
            content_type="application/json"
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
