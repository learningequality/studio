import pytest

from . import testdata
from .base import BaseTestCase
from contentcuration.models import ContentMetadata
from contentcuration.models import ContentNode


@pytest.fixture(scope="class")
def create_two_metadata_hierarchies():
    subjects = ContentMetadata.objects.create(metadata_name="Subjects")
    maths = ContentMetadata.objects.create(metadata_name="Maths", parent=subjects)
    ContentMetadata.objects.create(metadata_name="Arithmetic", parent=maths)
    ContentMetadata.objects.create(metadata_name="Algebra", parent=maths)
    science = ContentMetadata.objects.create(metadata_name="Science", parent=subjects)
    physics = ContentMetadata.objects.create(metadata_name="Physics", parent=science)
    ContentMetadata.objects.create(metadata_name="Forces and Motion", parent=physics)


@pytest.fixture(scope="class")
def create_nodes():
    for i in range(10):
        title = "node_{}".format(i)
        node_data = {"title": title, "kind_id": "topic"}
        testdata.node(node_data)


@pytest.mark.usefixtures("create_two_metadata_hierarchies")
@pytest.mark.usefixtures("create_nodes")
class MetadataCreationTestCase(BaseTestCase):
    def setUp(self):
        super(MetadataCreationTestCase, self).setUp()
        self.maths = ContentMetadata.objects.get(metadata_name="Maths")
        self.forces = ContentMetadata.objects.get(metadata_name="Forces and Motion")

    def test_hierarchy(self):
        ancestors = self.maths.get_ancestors()
        assert len(ancestors) == 1
        assert ancestors[0].get_descendant_count() == 6
        assert self.forces in ancestors.get_descendants()
        children = self.maths.get_children()
        assert children[0].metadata_name == "Arithmetic"
        assert children[1].metadata_name == "Algebra"

    def test_breadcrumb(self):
        assert (
            self.forces.breadcrumb()
            == "Subjects > Science > Physics > Forces and Motion"
        )

    def test_nodes_metadata(self):
        node1 = ContentNode.objects.get(title="node_1")
        node2 = ContentNode.objects.get(title="node_2")
        node1.metadata.add(self.forces)
        node1.metadata.add(self.maths)
        node2.metadata.add(self.maths)
        assert len(node1.metadata.all()) == 2
        assert len(node2.metadata.all()) == 1


@pytest.mark.usefixtures("create_two_metadata_hierarchies")
@pytest.mark.usefixtures("create_nodes")
class NodesMetadataTestCase(BaseTestCase):
    def setUp(self):
        super(NodesMetadataTestCase, self).setUp()

    def test_nodes_of_a_tag(self):
        """
        Get all ContentNodes with a tag or one of its descendant tags
        """
        pass

    def nodes_of_a_tag_and_descendants(self):
        """
        For a filtered ContentNode queryset, return all the unique tags that
        are applied to the ContentNodes
        """
        pass

    def unique_tags_in_node_queryset(self):
        """
        For a filtered ContentNode queryset and a specific level in the tag
        hierarchy return all relevant tags for nodes
        """
        pass

    def tags_in_level_for_node_queryset(self):
        """
        For a filtered ContentNode queryset and a specific level in the tag
        hierarchy and a specific parent tag return all relevant tags for nodes
        """
        pass

    def metadata_filter(self):
        """
        Return paginated results filtered by tags
        """
        pass
