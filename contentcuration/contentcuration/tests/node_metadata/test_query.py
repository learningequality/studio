from django.db.models.aggregates import Sum
from le_utils.constants import content_kinds
from le_utils.constants import roles

from ..base import StudioTestCase
from ..testdata import node
from ..testdata import tree
from contentcuration.models import ContentNode
from contentcuration.node_metadata.annotations import AssessmentCount
from contentcuration.node_metadata.annotations import CoachCount
from contentcuration.node_metadata.annotations import DescendantCount
from contentcuration.node_metadata.annotations import HasChanged
from contentcuration.node_metadata.annotations import ResourceCount
from contentcuration.node_metadata.annotations import ResourceSize
from contentcuration.node_metadata.annotations import SortOrderMax
from contentcuration.node_metadata.query import Metadata
from contentcuration.serializers import ContentNodeSerializer
from contentcuration.serializers import RootNodeSerializer


DESCENDANT_COUNT = 'descendant_count'
RESOURCE_COUNT = 'resource_count'
ASSESSMENT_COUNT = 'assessment_count'
RESOURCE_SIZE = 'resource_size'
COACH_COUNT = 'coach_count'
MAX_SORT_ORDER = 'max_sort_order'
HAS_CHANGED_DESCENDANT = 'has_changed_descendant'


class MetadataTest(StudioTestCase):
    def create_coach_node(self, parent):
        coach_video = node({
            'node_id': '7e1584e2ae270e9915207ced7074c784',
            'kind_id': content_kinds.VIDEO,
            'title': 'Coach video',
        }, parent=parent)
        coach_video.role_visibility = roles.COACH
        coach_video.save()
        coach_video.refresh_from_db()
        return coach_video

    def set_tree_changed(self, tree, changed):
        tree.get_descendants(include_self=True).update(changed=changed)
        tree.changed = changed
        tree.save()

    def test_descendant_count(self):
        topic_tree_node = tree()
        query = Metadata(topic_tree_node)

        results = query.annotate(**{DESCENDANT_COUNT: DescendantCount()})
        serialized = ContentNodeSerializer(topic_tree_node).data

        self.assertEqual(serialized.get('metadata').get('total_count'),
                         results.get(serialized.get('id')).get(DESCENDANT_COUNT))
        self.assertEqual(7, results.get(serialized.get('id')).get(DESCENDANT_COUNT))

    def test_assessment_count(self):
        tree()
        node = ContentNode.objects.get(node_id='00000000000000000000000000000005')
        query = Metadata(node)

        results = query.annotate(**{ASSESSMENT_COUNT: AssessmentCount()})
        serialized = ContentNodeSerializer(node).data

        self.assertEqual(serialized.get('metadata').get('resource_count'),
                         results.get(serialized.get('id')).get(ASSESSMENT_COUNT))
        self.assertEqual(3, results.get(serialized.get('id')).get(ASSESSMENT_COUNT))

    def test_resource_count(self):
        topic_tree_node = tree()
        query = Metadata(topic_tree_node)

        results = query.annotate(**{RESOURCE_COUNT: ResourceCount()})
        serialized = ContentNodeSerializer(topic_tree_node).data

        self.assertEqual(serialized.get('metadata').get('resource_count'),
                         results.get(serialized.get('id')).get(RESOURCE_COUNT))
        self.assertEqual(5, results.get(serialized.get('id')).get(RESOURCE_COUNT))

    def test_resource_size__topic(self):
        topic_tree_node = tree()
        nested_topic = topic_tree_node.get_descendants().filter(kind=content_kinds.TOPIC).first()
        self.create_coach_node(nested_topic)

        query = Metadata(topic_tree_node)
        results = query.annotate(**{RESOURCE_SIZE: ResourceSize()})
        serialized = ContentNodeSerializer(topic_tree_node).data

        self.assertEqual(serialized.get('metadata').get('resource_size'),
                         results.get(serialized.get('id')).get(RESOURCE_SIZE))
        self.assertEqual(0, results.get(serialized.get('id')).get(RESOURCE_SIZE))

    def test_resource_size__video(self):
        topic_tree_node = tree()
        nested_topic = topic_tree_node.get_descendants().filter(kind=content_kinds.TOPIC).first()
        video_node = self.create_coach_node(nested_topic)

        query = Metadata(video_node)
        results = query.annotate(**{RESOURCE_SIZE: ResourceSize()})
        serialized = ContentNodeSerializer(video_node).data

        size = video_node.files.aggregate(size=Sum('file_size')).get('size')

        self.assertEqual(serialized.get('metadata').get('resource_size'),
                         results.get(serialized.get('id')).get(RESOURCE_SIZE))
        self.assertEqual(size, results.get(serialized.get('id')).get(RESOURCE_SIZE))

    def test_coach_count(self):
        topic_tree_node = tree()
        nested_topic = topic_tree_node.get_descendants().filter(kind=content_kinds.TOPIC).first()
        self.create_coach_node(nested_topic)

        query = Metadata(topic_tree_node)

        results = query.annotate(**{COACH_COUNT: CoachCount()})
        serialized = ContentNodeSerializer(topic_tree_node).data

        self.assertEqual(serialized.get('metadata').get('coach_count'),
                         results.get(serialized.get('id')).get(COACH_COUNT))
        self.assertEqual(1, results.get(serialized.get('id')).get(COACH_COUNT))

    def test_max_sort_order(self):
        topic_tree_node = tree()
        query = Metadata(topic_tree_node)

        results = query.annotate(**{MAX_SORT_ORDER: SortOrderMax()})
        serialized = RootNodeSerializer(topic_tree_node).data

        self.assertEqual(serialized.get('metadata').get('max_sort_order'),
                         results.get(serialized.get('id')).get(MAX_SORT_ORDER))
        self.assertEqual(2.0, results.get(serialized.get('id')).get(MAX_SORT_ORDER))

    def test_max_sort_order__alternate(self):
        topic_tree_node = tree().get_descendants().filter(kind=content_kinds.TOPIC).first()
        query = Metadata(topic_tree_node)

        results = query.annotate(**{MAX_SORT_ORDER: SortOrderMax()})
        serialized = RootNodeSerializer(topic_tree_node).data

        self.assertEqual(serialized.get('metadata').get('max_sort_order'),
                         results.get(serialized.get('id')).get(MAX_SORT_ORDER))
        self.assertEqual(4.0, results.get(serialized.get('id')).get(MAX_SORT_ORDER))

    def test_has_changed_descendant(self):
        topic_tree_node = tree()
        query = Metadata(topic_tree_node)

        results = query.annotate(**{HAS_CHANGED_DESCENDANT: HasChanged()})
        serialized = RootNodeSerializer(topic_tree_node).data

        self.assertEqual(serialized.get('metadata').get('has_changed_descendant'),
                         results.get(serialized.get('id')).get(HAS_CHANGED_DESCENDANT))
        self.assertTrue(results.get(serialized.get('id')).get(HAS_CHANGED_DESCENDANT))

    def test_has_changed_descendant__forced(self):
        topic_tree_node = tree()
        query = Metadata(topic_tree_node)

        self.set_tree_changed(topic_tree_node, False)

        topic_tree_node.refresh_from_db()
        results = query.annotate(**{HAS_CHANGED_DESCENDANT: HasChanged()})
        serialized = RootNodeSerializer(topic_tree_node).data

        self.assertEqual(serialized.get('metadata').get('has_changed_descendant'),
                         results.get(serialized.get('id')).get(HAS_CHANGED_DESCENDANT))
        self.assertFalse(results.get(serialized.get('id')).get(HAS_CHANGED_DESCENDANT))

        video_node = topic_tree_node.get_descendants().filter(kind=content_kinds.TOPIC).first()\
            .get_descendants().first()
        video_node.changed = True
        video_node.save()

        topic_tree_node.refresh_from_db()
        results = query.annotate(**{HAS_CHANGED_DESCENDANT: HasChanged()})
        serialized = RootNodeSerializer(topic_tree_node).data

        self.assertEqual(serialized.get('metadata').get('has_changed_descendant'),
                         results.get(serialized.get('id')).get(HAS_CHANGED_DESCENDANT))
        self.assertTrue(results.get(serialized.get('id')).get(HAS_CHANGED_DESCENDANT))

    def test_multiple(self):
        topic_tree_node1 = tree()
        topic_tree_node2 = tree()

        topic_tree1_topics = topic_tree_node1.get_descendants().filter(kind=content_kinds.TOPIC)
        video_node = self.create_coach_node(topic_tree1_topics.first())
        exercise_node = ContentNode.objects.get(tree_id=topic_tree_node2.tree_id,
                                                node_id='00000000000000000000000000000005')

        self.set_tree_changed(topic_tree_node1, False)
        self.set_tree_changed(topic_tree_node2, False)
        topic_tree1_topics.last().delete()

        nodes = ContentNode.objects.filter(pk__in=[
            topic_tree_node1.pk,
            topic_tree_node2.pk,
            video_node.pk,
            exercise_node.pk,
        ])
        query = Metadata(nodes, **{
            DESCENDANT_COUNT: DescendantCount(),
            RESOURCE_COUNT: ResourceCount(),
            ASSESSMENT_COUNT: AssessmentCount(),
            RESOURCE_SIZE: ResourceSize(),
            COACH_COUNT: CoachCount(),
            HAS_CHANGED_DESCENDANT: HasChanged(include_self=True),
            MAX_SORT_ORDER: SortOrderMax(),
        })

        topic_tree1_results = query.get(topic_tree_node1.pk)
        topic_tree2_results = query.get(topic_tree_node2.pk)
        video_node_results = query.get(video_node.pk)
        exercise_node_results = query.get(exercise_node.pk)

        self.assertIsNotNone(topic_tree1_results)
        self.assertEqual(6, topic_tree1_results.get(DESCENDANT_COUNT))
        self.assertEqual(5, topic_tree1_results.get(RESOURCE_COUNT))
        self.assertEqual(0, topic_tree1_results.get(ASSESSMENT_COUNT))
        self.assertEqual(0, topic_tree1_results.get(RESOURCE_SIZE))
        self.assertEqual(1, topic_tree1_results.get(COACH_COUNT))
        self.assertTrue(topic_tree1_results.get(HAS_CHANGED_DESCENDANT))
        self.assertEqual(1, topic_tree1_results.get(MAX_SORT_ORDER))

        self.assertIsNotNone(topic_tree2_results)
        self.assertEqual(7, topic_tree2_results.get(DESCENDANT_COUNT))
        self.assertEqual(5, topic_tree2_results.get(RESOURCE_COUNT))
        self.assertEqual(0, topic_tree2_results.get(ASSESSMENT_COUNT))
        self.assertEqual(0, topic_tree2_results.get(RESOURCE_SIZE))
        self.assertEqual(0, topic_tree2_results.get(COACH_COUNT))
        self.assertFalse(topic_tree2_results.get(HAS_CHANGED_DESCENDANT))
        self.assertEqual(2, topic_tree2_results.get(MAX_SORT_ORDER))

        self.assertIsNotNone(video_node_results)
        self.assertEqual(1, video_node_results.get(DESCENDANT_COUNT))
        self.assertEqual(1, video_node_results.get(RESOURCE_COUNT))
        self.assertEqual(0, video_node_results.get(ASSESSMENT_COUNT))
        self.assertEqual(video_node.files.aggregate(size=Sum('file_size')).get('size'),
                         video_node_results.get(RESOURCE_SIZE))
        self.assertEqual(1, video_node_results.get(COACH_COUNT))
        self.assertFalse(video_node_results.get(HAS_CHANGED_DESCENDANT))
        self.assertEqual(video_node.sort_order, video_node_results.get(MAX_SORT_ORDER))

        self.assertIsNotNone(exercise_node_results)
        self.assertEqual(1, exercise_node_results.get(DESCENDANT_COUNT))
        self.assertEqual(1, exercise_node_results.get(RESOURCE_COUNT))
        self.assertEqual(3, exercise_node_results.get(ASSESSMENT_COUNT))
        self.assertEqual(0, exercise_node_results.get(RESOURCE_SIZE))
        self.assertEqual(0, exercise_node_results.get(COACH_COUNT))
        self.assertFalse(exercise_node_results.get(HAS_CHANGED_DESCENDANT))
        self.assertEqual(exercise_node.sort_order, exercise_node_results.get(MAX_SORT_ORDER))
