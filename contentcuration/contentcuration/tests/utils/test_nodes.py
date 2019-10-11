from le_utils.constants import content_kinds
from le_utils.constants import roles

from ..base import StudioTestCase
from ..testdata import node
from ..testdata import tree
from contentcuration.serializers import RootNodeSerializer
from contentcuration.serializers import SimplifiedContentNodeSerializer
from contentcuration.utils.nodes import COACH_COUNT
from contentcuration.utils.nodes import DESCENDANT_COUNT
from contentcuration.utils.nodes import HAS_CHANGED_DESCENDANT
from contentcuration.utils.nodes import MAX_SORT_ORDER
from contentcuration.utils.nodes import MetadataQuery
from contentcuration.utils.nodes import RESOURCE_COUNT


class MetadataQueryTest(StudioTestCase):
    def create_coach_node(self, parent):
        coach_video = node({
            'node_id': '7e1584e2ae270e9915207ced7074c784',
            'kind_id': content_kinds.VIDEO,
            'title': 'Coach video',
        }, parent=parent)
        coach_video.role_visibility = roles.COACH
        coach_video.save()

    def set_tree_changed(self, tree, changed):
        tree.get_descendants().update(changed=changed)
        tree.changed = changed
        tree.save()

    def test_descendant_count(self):
        topic_tree_node = tree()
        query = MetadataQuery([topic_tree_node.pk])

        results = query.add_descendant_count().retrieve_metadata()
        serialized = SimplifiedContentNodeSerializer(topic_tree_node).data

        self.assertEqual(serialized.get('metadata').get('total_count'),
                         results[serialized.get('id')].get(DESCENDANT_COUNT))
        self.assertEqual(7, results[serialized.get('id')].get(DESCENDANT_COUNT))

    def test_resource_count(self):
        topic_tree_node = tree()
        query = MetadataQuery([topic_tree_node.pk])

        results = query.add_resource_count().retrieve_metadata()
        serialized = SimplifiedContentNodeSerializer(topic_tree_node).data

        self.assertEqual(serialized.get('metadata').get('resource_count'),
                         results.get(serialized.get('id')).get(RESOURCE_COUNT))
        self.assertEqual(5, results.get(serialized.get('id')).get(RESOURCE_COUNT))

    def test_coach_count(self):
        topic_tree_node = tree()
        nested_topic = topic_tree_node.get_descendants().filter(kind=content_kinds.TOPIC).first()
        self.create_coach_node(nested_topic)

        query = MetadataQuery([topic_tree_node.pk])

        results = query.add_coach_count().retrieve_metadata()
        serialized = SimplifiedContentNodeSerializer(topic_tree_node).data

        self.assertEqual(serialized.get('metadata').get('coach_count'),
                         results.get(serialized.get('id')).get(COACH_COUNT))
        self.assertEqual(1, results.get(serialized.get('id')).get(COACH_COUNT))

    def test_max_sort_order(self):
        topic_tree_node = tree()
        query = MetadataQuery([topic_tree_node.pk])

        results = query.add_max_sort_order().retrieve_metadata()
        serialized = RootNodeSerializer(topic_tree_node).data

        self.assertEqual(serialized.get('metadata').get('max_sort_order'),
                         results.get(serialized.get('id')).get(MAX_SORT_ORDER))
        self.assertEqual(2.0, results.get(serialized.get('id')).get(MAX_SORT_ORDER))

    def test_max_sort_order__alternate(self):
        topic_tree_node = tree().get_descendants().filter(kind=content_kinds.TOPIC).first()
        query = MetadataQuery([topic_tree_node.pk])

        results = query.add_max_sort_order().retrieve_metadata()
        serialized = RootNodeSerializer(topic_tree_node).data

        self.assertEqual(serialized.get('metadata').get('max_sort_order'),
                         results.get(serialized.get('id')).get(MAX_SORT_ORDER))
        self.assertEqual(4.0, results.get(serialized.get('id')).get(MAX_SORT_ORDER))

    def test_has_changed_descendant(self):
        topic_tree_node = tree()
        query = MetadataQuery([topic_tree_node.pk])

        results = query.add_has_changed_descendant().retrieve_metadata()
        serialized = RootNodeSerializer(topic_tree_node).data

        self.assertEqual(serialized.get('metadata').get('has_changed_descendant'),
                         results.get(serialized.get('id')).get(HAS_CHANGED_DESCENDANT))
        self.assertTrue(results.get(serialized.get('id')).get(HAS_CHANGED_DESCENDANT))

    def test_has_changed_descendant__forced(self):
        topic_tree_node = tree()
        query = MetadataQuery([topic_tree_node.pk])

        self.set_tree_changed(topic_tree_node, False)

        topic_tree_node.refresh_from_db()
        results = query.add_has_changed_descendant().retrieve_metadata()
        serialized = RootNodeSerializer(topic_tree_node).data

        self.assertEqual(serialized.get('metadata').get('has_changed_descendant'),
                         results.get(serialized.get('id')).get(HAS_CHANGED_DESCENDANT))
        self.assertFalse(results.get(serialized.get('id')).get(HAS_CHANGED_DESCENDANT))

        video_node = topic_tree_node.get_descendants().filter(kind=content_kinds.TOPIC).first()\
            .get_descendants().first()
        video_node.changed = True
        video_node.save()

        topic_tree_node.refresh_from_db()
        results = query.add_has_changed_descendant().retrieve_metadata()
        serialized = RootNodeSerializer(topic_tree_node).data

        self.assertEqual(serialized.get('metadata').get('has_changed_descendant'),
                         results.get(serialized.get('id')).get(HAS_CHANGED_DESCENDANT))
        self.assertTrue(results.get(serialized.get('id')).get(HAS_CHANGED_DESCENDANT))

    def test_multiple(self):
        topic_tree_node1 = tree()
        topic_tree_node2 = tree()

        topic_tree1_topics = topic_tree_node1.get_descendants().filter(kind=content_kinds.TOPIC)
        self.create_coach_node(topic_tree1_topics.first())
        self.set_tree_changed(topic_tree_node1, False)
        topic_tree1_topics.last().delete()

        query = MetadataQuery([topic_tree_node1.pk, topic_tree_node2.pk])
        query.add_descendant_count()\
            .add_resource_count()\
            .add_coach_count()\
            .add_has_changed_descendant()\
            .add_max_sort_order()

        results = query.retrieve_metadata()
        topic_tree1_results = results.get(topic_tree_node1.pk)
        topic_tree2_results = results.get(topic_tree_node2.pk)

        self.assertEqual(6, topic_tree1_results.get(DESCENDANT_COUNT))
        self.assertEqual(5, topic_tree1_results.get(RESOURCE_COUNT))
        self.assertEqual(1, topic_tree1_results.get(COACH_COUNT))
        self.assertFalse(topic_tree1_results.get(HAS_CHANGED_DESCENDANT))
        self.assertEqual(1, topic_tree1_results.get(MAX_SORT_ORDER))

        self.assertEqual(7, topic_tree2_results.get(DESCENDANT_COUNT))
        self.assertEqual(5, topic_tree2_results.get(RESOURCE_COUNT))
        self.assertEqual(0, topic_tree2_results.get(COACH_COUNT))
        self.assertTrue(topic_tree2_results.get(HAS_CHANGED_DESCENDANT))
        self.assertEqual(2, topic_tree2_results.get(MAX_SORT_ORDER))
