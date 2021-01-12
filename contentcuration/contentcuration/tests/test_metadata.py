from random import choice

import pytest

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


def _assign_metadata():
    metadata = ContentMetadata.objects.exclude(metadata_name__in=("Physics", "Algebra"))
    physics = ContentMetadata.objects.get(metadata_name="Physics")
    algebra = ContentMetadata.objects.get(metadata_name="Algebra")

    nodes = ContentNode.objects.all()
    for node in nodes:
        node.add_metadata_tag(choice(metadata))
        if "Topic" in node.title:
            node.add_metadata_tag(physics)
            node.add_metadata_tag(algebra)
        node.save()


@pytest.mark.usefixtures("create_two_metadata_hierarchies")
class MetadataCreationTestCase(BaseTestCase):
    def setUp(self):
        # creates node hierarchy according to
        # contentcuration/contentcuration/tests/fixtures/tree.json
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
        node1 = ContentNode.objects.get(title="Video 1")
        node2 = ContentNode.objects.get(title="Exercise 1")
        node1.add_metadata_tag(self.forces)
        node1.add_metadata_tag(self.maths)
        node2.add_metadata_tag(self.maths)
        assert len(node1.metadata) == 2
        assert len(node2.metadata) == 1


@pytest.mark.usefixtures("create_two_metadata_hierarchies")
class NodesMetadataTestCase(BaseTestCase):
    def setUp(self):
        # creates node hierarchy according to
        # contentcuration/contentcuration/tests/fixtures/tree.json
        super(NodesMetadataTestCase, self).setUp()
        _assign_metadata()
        self.node_query = ContentNode.objects.filter(title__icontains="Topic")

    def test_nodes_of_a_tag(self):
        """
        Get all ContentNodes with a tag or one of its descendant tags
        """
        maths = ContentMetadata.objects.get(metadata_name="Maths")
        algebra = ContentMetadata.objects.get(metadata_name="Algebra")

        # Usually (randomly) there will be more nodes with descendants than our query
        assert len(maths.nodes_metadata(descendants=True)) >= len(self.node_query)

        # Only nodes having "Topic" in the query have Algebra:
        assert len(algebra.nodes_metadata(descendants=True)) == len(self.node_query)

    def test_nodes_of_a_tag_and_descendants(self):
        """
        For a filtered ContentNode queryset, return all the unique tags that
        are applied to the ContentNodes
        """
        unique_tags = ContentNode.unique_metatags(self.node_query)
        assert len(unique_tags) >= 2
        unique_tags_names = unique_tags.values_list("metadata_name", flat=True)
        assert "Physics" in unique_tags_names
        assert "Algebra" in unique_tags_names

    def test_unique_tags_in_node_queryset(self):
        """
        For a filtered ContentNode queryset and a specific level in the tag
        hierarchy return all relevant tags for nodes
        """
        level = 2
        unique_tags = ContentNode.unique_metatags(
            self.node_query, level=level
        ).values_list("metadata_name", flat=True)

        assert "Algebra" in unique_tags
        assert "Physics" in unique_tags
        assert "Forces and Motion" not in unique_tags  # level 3
        assert "Maths" not in unique_tags  # level 1

    def test_tags_in_level_and_parent_for_node_queryset(self):
        """
        For a filtered ContentNode queryset and a specific level in the tag
        hierarchy and a specific parent tag return all relevant tags for nodes
        """
        level = 2
        parent_tag = "Maths"
        # parent_meta = ContentMetadata.objects.get(metadata_name=parent_tag)
        # filters = Q(metadata__level__gte=level) & Q(
        #     metadata__in=parent_meta.get_descendants()
        # )

        # hierarchy_tags = self.node_query.filter(filters).values_list(
        #     "metadata__metadata_name", flat=True
        # )
        hierarchy_tags = ContentNode.unique_metatags(
            self.node_query, level=level, parent_tag=parent_tag
        ).values_list("metadata_name", flat=True)
        assert "Algebra" in hierarchy_tags
        assert "Physics" not in hierarchy_tags  # not in "Maths" hierarchy
        assert "Forces and Motion" not in hierarchy_tags  # level 3
        assert "Maths" not in hierarchy_tags  # level 1

    def test_metadata_filter(self):
        queryset = ContentNode.objects.filter(kind="topic")
        queryset = ContentNode.filter_metadata_queryset(
            queryset, ("Algebra", "Physics")
        )
        nodes = queryset.values_list("title", flat=True)
        for node in self.node_query:
            assert node.title in nodes
