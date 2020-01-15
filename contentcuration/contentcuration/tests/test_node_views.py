import datetime
import json

import pytz
from mock import patch

from base import BaseAPITestCase
from django.conf import settings
from django.core.cache import cache
from le_utils.constants import content_kinds
from rest_framework.reverse import reverse

from .testdata import tree
from contentcuration.models import Channel
from contentcuration.models import ContentKind
from contentcuration.models import ContentNode
from contentcuration.models import PrerequisiteContentRelationship


class NodeViewsUtilityTestCase(BaseAPITestCase):
    def test_get_channel_details(self):
        url = reverse('get_channel_details', [self.channel.id])
        response = self.get(url)

        details = json.loads(response.content)
        assert details['resource_count'] > 0
        assert details['resource_size'] > 0
        assert details['kind_count'] > 0

    def test_get_channel_details_cached(self):
        cache_key = "details_{}".format(self.channel.main_tree.id)

        # force the cache to update by adding a very old cache entry. Since Celery tasks run sync in the test suite,
        # get_channel_details will return an updated cache value rather than generate it async.
        data = {"last_update": pytz.utc.localize(datetime.datetime(1990, 1, 1)).strftime(settings.DATE_TIME_FORMAT)}
        cache.set(cache_key, json.dumps(data))

        with patch("contentcuration.views.nodes.getnodedetails_task") as task_mock:
            url = reverse('get_channel_details', [self.channel.id])
            self.get(url)
            # Check that the outdated cache prompts an asynchronous cache update
            task_mock.apply_async.assert_called_once_with((self.channel.main_tree.id,))


class GetPrerequisitesTestCase(BaseAPITestCase):
    def setUp(self):
        super(GetPrerequisitesTestCase, self).setUp()
        self.prereq = self.channel.main_tree.get_descendants().exclude(kind=ContentKind.objects.get(kind=content_kinds.TOPIC)).first()
        self.node1 = self.channel.main_tree.get_descendants().exclude(kind=ContentKind.objects.get(kind=content_kinds.TOPIC))[1:2][0]
        self.node2 = self.channel.main_tree.get_descendants().exclude(kind=ContentKind.objects.get(kind=content_kinds.TOPIC))[2:3][0]
        self.postreq = self.channel.main_tree.get_descendants().exclude(kind=ContentKind.objects.get(kind=content_kinds.TOPIC))[3:4][0]
        self.add_prereqs(self.node1, [self.prereq])
        self.add_prereqs(self.node2, [self.prereq])
        self.add_prereqs(self.postreq, [self.node1, self.node2])

    def add_prereqs(self, target, prereqs):
        """
        Add one or more prerequisites to a ContentNode.

        For info on why we cannot use ContentNode.prerequisite.add, see here:

        https://stackoverflow.com/questions/34394323/how-to-correctly-use-auto-created-attribute-in-django
        :param target: ContentNode on which to set prerequisites
        :param prereqs: list of prerequisite ContentNodes to set
        """
        for prereq in prereqs:
            PrerequisiteContentRelationship.objects.create(target_node=target, prerequisite=prereq)

    def test_get_prerequisites_only(self):
        response = self.get(reverse("get_prerequisites", kwargs={"get_postrequisites": "false", "ids": ",".join((self.node1.id, self.node2.id))}))
        prerequisites = response.json()["prerequisite_mapping"]
        self.assertTrue(self.prereq.id in prerequisites[self.node1.id])
        self.assertTrue(self.prereq.id in prerequisites[self.node2.id])

    def test_get_postrequisites(self):
        postpostreq = self.channel.main_tree.get_descendants().exclude(kind=ContentKind.objects.get(kind=content_kinds.TOPIC))[4:5][0]
        PrerequisiteContentRelationship.objects.create(target_node=postpostreq, prerequisite=self.postreq)
        response = self.get(reverse("get_prerequisites", kwargs={"get_postrequisites": "true", "ids": ",".join((self.node1.id, self.node2.id))}))
        postrequisites = response.json()["postrequisite_mapping"]
        self.assertTrue(postpostreq.id in postrequisites[self.postreq.id])

    def test_get_prerequisites_only_check_nodes(self):
        response = self.get(reverse("get_prerequisites", kwargs={"get_postrequisites": "false", "ids": ",".join((self.node1.id, self.node2.id))}))
        tree_nodes = response.json()["prerequisite_tree_nodes"]
        self.assertTrue(len(filter(lambda x: x["id"] == self.node1.id, tree_nodes)) > 0)
        self.assertTrue(len(filter(lambda x: x["id"] == self.node2.id, tree_nodes)) > 0)
        self.assertTrue(len(filter(lambda x: x["id"] == self.prereq.id, tree_nodes)) > 0)
        self.assertTrue(len(filter(lambda x: x["id"] == self.postreq.id, tree_nodes)) == 0)

    def test_get_postrequisites_check_nodes(self):
        response = self.get(reverse("get_prerequisites", kwargs={"get_postrequisites": "true", "ids": ",".join((self.node1.id, self.node2.id))}))
        tree_nodes = response.json()["prerequisite_tree_nodes"]
        self.assertTrue(len(filter(lambda x: x["id"] == self.node1.id, tree_nodes)) > 0)
        self.assertTrue(len(filter(lambda x: x["id"] == self.node2.id, tree_nodes)) > 0)
        self.assertTrue(len(filter(lambda x: x["id"] == self.prereq.id, tree_nodes)) > 0)
        self.assertTrue(len(filter(lambda x: x["id"] == self.postreq.id, tree_nodes)) > 0)

    def test_get_prerequisites_no_permissions(self):
        channel = Channel.objects.create()
        node = ContentNode.objects.create(kind=ContentKind.objects.get(kind=content_kinds.TOPIC))
        channel.main_tree = node
        channel.save()
        response = self.get(reverse("get_prerequisites", kwargs={"get_postrequisites": "false", "ids": node.id}))
        self.assertEqual(response.status_code, 404)


class GetNodeDiffEndpointTestCase(BaseAPITestCase):
    def test_200_post(self):
        response = self.get(
            reverse("get_node_diff", kwargs={"channel_id": self.channel.id})
        )
        self.assertEqual(response.status_code, 200)

    def test_404_no_permission(self):
        new_channel = Channel.objects.create()
        response = self.get(
            reverse("get_node_diff", kwargs={"channel_id": new_channel.id}),
        )
        self.assertEqual(response.status_code, 404)


class GetTotalSizeEndpointTestCase(BaseAPITestCase):
    def test_200_post(self):
        response = self.get(
            reverse("get_total_size", kwargs={"ids": self.channel.main_tree.id})
        )
        self.assertEqual(response.status_code, 200)

    def test_404_no_permission(self):
        new_channel = Channel.objects.create()
        new_channel.main_tree = tree()
        new_channel.save()
        response = self.get(
            reverse("get_total_size", kwargs={"ids": new_channel.main_tree.id}),
        )
        self.assertEqual(response.status_code, 404)


class GetNodePathEndpointTestCase(BaseAPITestCase):
    def test_200_post(self):
        response = self.get(
            reverse("get_node_path", args=[
                self.channel.main_tree.node_id,
                self.channel.main_tree.tree_id,
                self.channel.main_tree.children.first().node_id,
            ])
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue('node' in response.data)

    def test_404_no_permission(self):
        new_channel = Channel.objects.create()
        new_channel.main_tree = tree()
        new_channel.save()
        response = self.get(
            reverse("get_node_path", args=[
                new_channel.main_tree.node_id,
                new_channel.main_tree.tree_id,
                new_channel.main_tree.children.first().node_id
            ]),
        )
        self.assertEqual(response.status_code, 404)


class GetNodesByIdsEndpointTestCase(BaseAPITestCase):
    def test_200_get(self):
        response = self.get(
            reverse("get_nodes_by_ids", kwargs={"ids": self.channel.main_tree.id})
        )
        self.assertEqual(response.status_code, 200)

    def test_200_clipboard(self):
        self.user.clipboard_tree = tree()
        self.user.clipboard_tree.save()
        response = self.get(
            reverse("get_nodes_by_ids", kwargs={"ids": self.user.clipboard_tree.id}),
        )
        self.assertEqual(response.status_code, 200)

    def test_404_no_permission(self):
        new_channel = Channel.objects.create()
        new_channel.main_tree = tree()
        new_channel.save()
        response = self.get(
            reverse("get_nodes_by_ids", kwargs={"ids": new_channel.main_tree.id}),
        )
        self.assertEqual(response.status_code, 404)


class GetNodesByIdsSimplifiedEndpointTestCase(BaseAPITestCase):
    def test_200_post(self):
        response = self.get(
            reverse("get_nodes_by_ids_simplified", kwargs={"ids": self.channel.main_tree.id})
        )
        self.assertEqual(response.status_code, 200)

    def test_404_no_permission(self):
        new_channel = Channel.objects.create()
        new_channel.main_tree = tree()
        new_channel.save()
        response = self.get(
            reverse("get_nodes_by_ids_simplified", kwargs={"ids": new_channel.main_tree.id}),
        )
        self.assertEqual(response.status_code, 404)


class GetNodesByIdsCompleteEndpointTestCase(BaseAPITestCase):
    def test_200_post(self):
        response = self.get(
            reverse("get_nodes_by_ids_complete", kwargs={"ids": self.channel.main_tree.id})
        )
        self.assertEqual(response.status_code, 200)

    def test_404_no_permission(self):
        new_channel = Channel.objects.create()
        new_channel.main_tree = tree()
        new_channel.save()
        response = self.get(
            reverse("get_nodes_by_ids_complete", kwargs={"ids": new_channel.main_tree.id}),
        )
        self.assertEqual(response.status_code, 404)


class GetTopicDetailsEndpointTestCase(BaseAPITestCase):
    def test_200_post(self):
        response = self.get(
            reverse("get_channel_details", kwargs={"channel_id": self.channel.id})
        )
        self.assertEqual(response.status_code, 200)

    def test_404_no_permission(self):
        new_channel = Channel.objects.create()
        new_channel.main_tree = tree()
        new_channel.save()
        response = self.get(
            reverse("get_channel_details", kwargs={"channel_id": new_channel.id}),
        )
        self.assertEqual(response.status_code, 404)
