import datetime
import json

import pytz
from base import BaseAPITestCase
from django.conf import settings
from django.core.cache import cache
from le_utils.constants import content_kinds
from rest_framework.reverse import reverse

from contentcuration.models import ContentKind
from contentcuration.views.nodes import get_topic_details


class NodeViewsUtilityTestCase(BaseAPITestCase):
    def test_get_topic_details(self):
        node_pk = self.channel.main_tree.pk
        url = reverse('get_topic_details', [node_pk])
        request = self.create_get_request(url)
        response = get_topic_details(request, node_pk)

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
        request = self.create_get_request(url)
        get_topic_details(request, node_pk)

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
        response = self.get(reverse("get_prerequisites", kwargs={"get_prerequisites": "false", "ids": ",".join((self.node1.id, self.node2.id))}))
        prerequisites = response.json()["prerequisite_mapping"]
        self.assertTrue(self.prereq.id in prerequisites[self.node1.id])
        self.assertTrue(self.prereq.id in prerequisites[self.node2.id])

    def test_get_postrequisites(self):
        postpostreq = self.channel.main_tree.get_descendants().exclude(kind=ContentKind.objects.get(kind=content_kinds.TOPIC))[4:5][0]
        postpostreq.prerequisite.add(self.postreq)
        response = self.get(reverse("get_prerequisites", kwargs={"get_prerequisites": "true", "ids": ",".join((self.node1.id, self.node2.id))}))
        postrequisites = response.json()["postrequisite_mapping"]
        self.assertTrue(postpostreq.id in postrequisites[self.postreq.id])

    def test_get_prerequisites_only_check_nodes(self):
        response = self.get(reverse("get_prerequisites", kwargs={"get_prerequisites": "false", "ids": ",".join((self.node1.id, self.node2.id))}))
        tree_nodes = response.json()["prerequisite_tree_nodes"]
        self.assertTrue(len(filter(lambda x: x["id"] == self.node1.id, tree_nodes)) > 0)
        self.assertTrue(len(filter(lambda x: x["id"] == self.node2.id, tree_nodes)) > 0)
        self.assertTrue(len(filter(lambda x: x["id"] == self.prereq.id, tree_nodes)) > 0)
        self.assertTrue(len(filter(lambda x: x["id"] == self.postreq.id, tree_nodes)) == 0)

    def test_get_postrequisites_check_nodes(self):
        response = self.get(reverse("get_prerequisites", kwargs={"get_prerequisites": "true", "ids": ",".join((self.node1.id, self.node2.id))}))
        tree_nodes = response.json()["prerequisite_tree_nodes"]
        self.assertTrue(len(filter(lambda x: x["id"] == self.node1.id, tree_nodes)) > 0)
        self.assertTrue(len(filter(lambda x: x["id"] == self.node2.id, tree_nodes)) > 0)
        self.assertTrue(len(filter(lambda x: x["id"] == self.prereq.id, tree_nodes)) > 0)
        self.assertTrue(len(filter(lambda x: x["id"] == self.postreq.id, tree_nodes)) > 0)
