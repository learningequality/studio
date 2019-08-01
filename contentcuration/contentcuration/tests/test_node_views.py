import datetime
import json

import pytz
from base import BaseAPITestCase
from django.conf import settings
from django.core.cache import cache
from le_utils.constants import content_kinds
from rest_framework.reverse import reverse

from .testdata import tree
from contentcuration.models import Channel
from contentcuration.models import ContentKind
from contentcuration.models import ContentNode


class NodeViewsUtilityTestCase(BaseAPITestCase):
    def test_get_topic_details(self):
        node_pk = self.channel.main_tree.pk
        url = reverse('get_topic_details', [node_pk])
        response = self.get(url)

        details = json.loads(response.content)
        assert details['resource_count'] > 0
        assert details['resource_size'] > 0
        assert details['kind_count'] > 0

    def test_get_topic_details_cached(self):
        node = self.channel.main_tree
        node_pk = self.channel.main_tree.pk
        cache_key = "details_{}".format(node.node_id)

        # force the cache to update by adding a very old cache entry. Since Celery tasks run sync in the test suite,
        # get_topic_details will return an updated cache value rather than generate it async.
        data = {"last_update": pytz.utc.localize(datetime.datetime(1990, 1, 1)).strftime(settings.DATE_TIME_FORMAT)}
        cache.set(cache_key, json.dumps(data))

        url = reverse('get_topic_details', [node_pk])
        self.get(url)

        # the response will contain the invalid cache entry that we set above, but if we retrieve the cache
        # now it will be updated with the correct values.
        cache_details = json.loads(cache.get(cache_key))
        assert cache_details['resource_count'] > 0
        assert cache_details['resource_size'] > 0
        assert cache_details['kind_count'] > 0


class GetPrerequisitesTestCase(BaseAPITestCase):
    def setUp(self):
        super(GetPrerequisitesTestCase, self).setUp()
        self.prereq = self.channel.main_tree.get_descendants().exclude(kind=ContentKind.objects.get(kind=content_kinds.TOPIC)).first()
        self.node1 = self.channel.main_tree.get_descendants().exclude(kind=ContentKind.objects.get(kind=content_kinds.TOPIC))[1:2][0]
        self.node2 = self.channel.main_tree.get_descendants().exclude(kind=ContentKind.objects.get(kind=content_kinds.TOPIC))[2:3][0]
        self.postreq = self.channel.main_tree.get_descendants().exclude(kind=ContentKind.objects.get(kind=content_kinds.TOPIC))[3:4][0]
        self.node1.prerequisite.add(self.prereq)
        self.node2.prerequisite.add(self.prereq)
        self.postreq.prerequisite.add(self.node1, self.node2)

    def test_get_prerequisites_only(self):
        response = self.get(reverse("get_prerequisites", kwargs={"get_postrequisites": "false", "ids": ",".join((self.node1.id, self.node2.id))}))
        prerequisites = response.json()["prerequisite_mapping"]
        self.assertTrue(self.prereq.id in prerequisites[self.node1.id])
        self.assertTrue(self.prereq.id in prerequisites[self.node2.id])

    def test_get_postrequisites(self):
        postpostreq = self.channel.main_tree.get_descendants().exclude(kind=ContentKind.objects.get(kind=content_kinds.TOPIC))[4:5][0]
        postpostreq.prerequisite.add(self.postreq)
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
            reverse("get_topic_details", kwargs={"contentnode_id": self.channel.main_tree.id})
        )
        self.assertEqual(response.status_code, 200)

    def test_404_no_permission(self):
        new_channel = Channel.objects.create()
        new_channel.main_tree = tree()
        new_channel.save()
        response = self.get(
            reverse("get_topic_details", kwargs={"contentnode_id": new_channel.main_tree.id}),
        )
        self.assertEqual(response.status_code, 404)
