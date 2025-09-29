"""
To run this test, type this in command line <kolibri manage test -- kolibri.core.content>
"""
import datetime
import uuid
from calendar import timegm

from django.core.cache import cache
from django.core.management import call_command
from django.urls import reverse
from django.utils.http import http_date
from kolibri_public import models
from kolibri_public.tests.base import ChannelBuilder
from kolibri_public.tests.base import OKAY_TAG
from le_utils.constants import content_kinds
from rest_framework.test import APITestCase

from contentcuration.models import generate_storage_url
from contentcuration.models import Language


kind_activity_map = {
    content_kinds.EXERCISE: "practice",
    content_kinds.VIDEO: "watch",
    content_kinds.AUDIO: "listen",
    content_kinds.DOCUMENT: "read",
    content_kinds.HTML5: "explore",
}


def infer_learning_activity(kind):
    activity = kind_activity_map.get(kind)
    if activity:
        return [activity]
    return []


class ContentNodeAPIBase(object):
    @classmethod
    def setUpTestData(cls):
        call_command("loadconstants")
        builder = ChannelBuilder()
        builder.insert_into_default_db()
        models.ContentNode.objects.all().update(available=True)
        cls.root = models.ContentNode.objects.get(id=builder.root_node["id"])
        cls.is_prereq = models.ContentNode.objects.exclude(
            kind=content_kinds.TOPIC
        ).first()
        cls.has_prereq = models.ContentNode.objects.exclude(kind=content_kinds.TOPIC)[1]
        cls.has_prereq.has_prerequisite.add(cls.is_prereq)
        cls.channel_data = builder.channel

    def _get(self, *args, **kwargs):
        return self.client.get(*args, **kwargs)

    def _assert_headers(self, response, last_updated):
        self.assertEqual(response.headers["Vary"], "Accept")
        self.assertEqual(
            response.headers["Cache-Control"],
            "max-age=300, public, stale-while-revalidate=100",
        )
        self.assertEqual(
            response.headers["Last-Modified"],
            http_date(timegm(last_updated.utctimetuple())),
        )

    def map_language(self, lang):
        if lang:
            return {
                f: getattr(lang, f)
                for f in [
                    "id",
                    "lang_code",
                    "lang_subcode",
                    "lang_name",
                    "lang_direction",
                ]
            }

    def _assert_node(self, actual, expected):
        assessmentmetadata = (
            expected.assessmentmetadata.all()
            .values(
                "assessment_item_ids",
                "number_of_assessments",
                "mastery_model",
                "randomize",
                "is_manipulable",
                "contentnode",
            )
            .first()
        )
        thumbnail = None
        files = []
        for f in expected.files.all():
            "local_file__id",
            "local_file__available",
            "local_file__file_size",
            "local_file__extension",
            "lang_id",
            file = {}
            for field in [
                "id",
                "priority",
                "preset",
                "supplementary",
                "thumbnail",
            ]:
                file[field] = getattr(f, field)
            file["checksum"] = f.local_file_id
            for field in [
                "available",
                "file_size",
                "extension",
            ]:
                file[field] = getattr(f.local_file, field)
            file["lang"] = self.map_language(f.lang)
            file["storage_url"] = generate_storage_url(
                "{}.{}".format(file["checksum"], file["extension"])
            )
            files.append(file)
            if f.thumbnail:
                thumbnail = generate_storage_url(
                    "{}.{}".format(file["checksum"], file["extension"])
                )
        self.assertEqual(
            actual,
            {
                "id": expected.id,
                "available": expected.available,
                "author": expected.author,
                "channel_id": expected.channel_id,
                "coach_content": expected.coach_content,
                "content_id": expected.content_id,
                "description": expected.description,
                "duration": expected.duration,
                "learning_activities": expected.learning_activities.split(",")
                if expected.learning_activities
                else [],
                "learner_needs": expected.learner_needs.split(",")
                if expected.learner_needs
                else [],
                "grade_levels": expected.grade_levels.split(",")
                if expected.grade_levels
                else [],
                "resource_types": expected.resource_types.split(",")
                if expected.resource_types
                else [],
                "accessibility_labels": expected.accessibility_labels.split(",")
                if expected.accessibility_labels
                else [],
                "categories": expected.categories.split(",")
                if expected.categories
                else [],
                "kind": expected.kind,
                "lang": self.map_language(expected.lang),
                "license_description": expected.license_description,
                "license_name": expected.license_name,
                "license_owner": expected.license_owner,
                "num_coach_contents": expected.num_coach_contents,
                "options": expected.options,
                "parent": expected.parent_id,
                "sort_order": expected.sort_order,
                "title": expected.title,
                "lft": expected.lft,
                "rght": expected.rght,
                "tree_id": expected.tree_id,
                "ancestors": [],
                "tags": list(
                    expected.tags.all()
                    .order_by("tag_name")
                    .values_list("tag_name", flat=True)
                ),
                "thumbnail": thumbnail,
                "assessmentmetadata": assessmentmetadata,
                "is_leaf": expected.kind != "topic",
                "files": files,
            },
        )

    def _assert_nodes(self, data, nodes):
        for actual, expected in zip(
            sorted(data, key=lambda x: x["id"]), sorted(nodes, key=lambda x: x.id)
        ):
            self._assert_node(actual, expected)

    def test_contentnode_list(self):
        nodes = self.root.get_descendants(include_self=True).filter(available=True)
        expected_output = len(nodes)
        response = self._get(reverse("publiccontentnode-list"))
        self.assertEqual(len(response.data), expected_output)
        self._assert_nodes(response.data, nodes)

    def test_contentnode_list_labels(self):
        nodes = self.root.get_descendants(include_self=True).filter(available=True)
        response = self._get(reverse("publiccontentnode-list"), data={"max_results": 1})
        node_languages = Language.objects.filter(contentnode__in=nodes)
        self.assertEqual(
            len(response.data["labels"]["languages"]), node_languages.distinct().count()
        )
        for lang in response.data["labels"]["languages"]:
            self.assertTrue(
                node_languages.filter(native_name=lang["lang_name"]).exists()
            )

    def test_contentnode_list_headers(self):
        channel = models.ChannelMetadata.objects.get()
        channel.last_updated = datetime.datetime.now()
        channel.save()
        response = self._get(reverse("publiccontentnode-list"))
        self._assert_headers(response, channel.last_updated)

    def _recurse_and_assert(self, data, nodes, recursion_depth=0):
        recursion_depths = []
        for actual, expected in zip(data, nodes):
            children = actual.pop("children", None)
            self._assert_node(actual, expected)
            if children:
                child_nodes = models.ContentNode.objects.filter(
                    available=True, parent=expected
                )
                if children["more"] is None:
                    self.assertEqual(len(child_nodes), len(children["results"]))
                else:
                    self.assertGreater(len(child_nodes), len(children["results"]))
                    self.assertEqual(children["more"]["id"], expected.id)
                    self.assertEqual(
                        children["more"]["params"]["next__gt"], child_nodes[11].rght
                    )
                    self.assertEqual(
                        children["more"]["params"]["depth"], 2 - recursion_depth
                    )
                    if self.baseurl:
                        self.assertEqual(
                            children["more"]["params"]["baseurl"], self.baseurl
                        )
                recursion_depths.append(
                    self._recurse_and_assert(
                        children["results"],
                        child_nodes,
                        recursion_depth=recursion_depth + 1,
                    )
                )
        return recursion_depth if not recursion_depths else max(recursion_depths)

    def test_contentnode_tree_invalid_uuid(self):
        invalid_uuid = "8f0a5b9d89795"

        response = self._get(
            reverse("publiccontentnode_tree-detail", kwargs={"pk": invalid_uuid})
        )

        self.assertEqual(response.status_code, 400)

        self.assertEqual(response.data["error"], "Invalid UUID format.")

    def test_contentnode_tree(self):
        response = self._get(
            reverse("publiccontentnode_tree-detail", kwargs={"pk": self.root.id})
        )
        self._recurse_and_assert([response.data], [self.root])

    def test_contentnode_tree_headers(self):
        channel = models.ChannelMetadata.objects.get()
        channel.last_updated = datetime.datetime.now()
        channel.save()
        response = self._get(
            reverse("publiccontentnode_tree-detail", kwargs={"pk": self.root.id})
        )
        self._assert_headers(response, channel.last_updated)

    def test_contentnode_tree_filtered_queryset_node(self):
        response = self.client.get(
            reverse("publiccontentnode_tree-detail", kwargs={"pk": self.root.id})
            + "?parent={}".format(uuid.uuid4().hex)
        )
        self.assertEqual(response.status_code, 404)

    def test_contentnode_tree_depth_1(self):
        response = self._get(
            reverse("publiccontentnode_tree-detail", kwargs={"pk": self.root.id}),
            data={"depth": 1},
        )
        self._recurse_and_assert([response.data], [self.root])

    def test_contentnode_tree_singleton_path(self):
        builder = ChannelBuilder(levels=5, num_children=1)
        builder.insert_into_default_db()
        models.ContentNode.objects.all().update(available=True)
        root = models.ContentNode.objects.get(id=builder.root_node["id"])
        response = self._get(
            reverse("publiccontentnode_tree-detail", kwargs={"pk": root.id})
        )
        max_depth = self._recurse_and_assert([response.data], [root])
        # Should recurse all the way down the tree through a total of 6 levels
        # including the root.
        self.assertEqual(max_depth, 6)

    def test_contentnode_tree_singleton_child(self):
        builder = ChannelBuilder(levels=5, num_children=2)
        builder.insert_into_default_db()
        models.ContentNode.objects.all().update(available=True)
        root = models.ContentNode.objects.get(id=builder.root_node["id"])
        first_child = root.children.first()
        first_child.available = False
        first_child.save()
        response = self._get(
            reverse("publiccontentnode_tree-detail", kwargs={"pk": root.id})
        )
        max_depth = self._recurse_and_assert([response.data], [root])
        # Should recurse an extra level to find multiple descendants under the first grandchild.
        self.assertEqual(max_depth, 3)

    def test_contentnode_tree_singleton_grandchild(self):
        builder = ChannelBuilder(levels=5, num_children=2)
        builder.insert_into_default_db()
        models.ContentNode.objects.all().update(available=True)
        root = models.ContentNode.objects.get(id=builder.root_node["id"])
        first_grandchild = root.children.first().children.first()
        first_grandchild.available = False
        first_grandchild.save()
        response = self._get(
            reverse("publiccontentnode_tree-detail", kwargs={"pk": root.id})
        )
        max_depth = self._recurse_and_assert([response.data], [root])
        # Should recurse an extra level to find multiple descendants under the first child.
        self.assertEqual(max_depth, 3)


class ContentNodeAPITestCase(ContentNodeAPIBase, APITestCase):
    """
    Testcase for content API methods
    """

    def test_prerequisite_for_filter(self):
        response = self.client.get(
            reverse("publiccontentnode-list"),
            data={"prerequisite_for": self.has_prereq.id},
        )
        self.assertEqual(response.data[0]["id"], self.is_prereq.id)

    def test_has_prerequisite_filter(self):
        response = self.client.get(
            reverse("publiccontentnode-list"),
            data={"has_prerequisite": self.is_prereq.id},
        )
        self.assertEqual(response.data[0]["id"], self.has_prereq.id)

    def test_related_filter(self):
        self.has_prereq.related.add(self.is_prereq)
        response = self.client.get(
            reverse("publiccontentnode-list"), data={"related": self.has_prereq.id}
        )
        self.assertEqual(response.data[0]["id"], self.is_prereq.id)

    def test_contentnode_retrieve(self):
        node = models.ContentNode.objects.all().first()
        response = self.client.get(
            reverse("publiccontentnode-detail", kwargs={"pk": node.id})
        )
        self.assertEqual(response.data["id"], node.id)

    def test_contentnode_ids(self):
        nodes = models.ContentNode.objects.all()[:2]
        response = self.client.get(
            reverse("publiccontentnode-list"),
            data={"ids": ",".join([n.id for n in nodes])},
        )
        self.assertEqual(len(response.data), 2)
        for i, node in enumerate(nodes):
            self.assertEqual(response.data[i]["title"], node.title)

    def test_contentnode_parent(self):
        parent = models.ContentNode.objects.filter(kind=content_kinds.TOPIC).first()
        children = parent.get_children()
        response = self.client.get(
            reverse("publiccontentnode-list"),
            data={"parent": parent.id, "include_coach_content": False},
        )
        self.assertEqual(len(response.data), children.count())
        for i in range(len(children)):
            self.assertEqual(response.data[i]["title"], children[i].title)

    def test_contentnode_tags(self):
        tags = ["tag_1", "tag_2", "tag_3"]
        for tag_name in tags:
            tag = models.ContentTag.objects.create(
                id=uuid.uuid4().hex, tag_name=tag_name
            )
            self.root.tags.add(tag)

        response = self.client.get(
            reverse("publiccontentnode-detail", kwargs={"pk": self.root.id})
        )
        # added by channel builder
        tags.append(OKAY_TAG)
        self.assertEqual(set(response.data["tags"]), set(tags))

    def test_channelmetadata_list(self):
        response = self.client.get(reverse("publicchannel-list", kwargs={}))
        self.assertEqual(response.data[0]["name"], "testing")

    def test_channelmetadata_list_headers(self):
        channel = models.ChannelMetadata.objects.get()
        channel.last_updated = datetime.datetime.now()
        channel.save()
        response = self.client.get(reverse("publicchannel-list", kwargs={}))
        self._assert_headers(response, channel.last_updated)

    def test_channelmetadata_retrieve(self):
        data = models.ChannelMetadata.objects.values()[0]
        response = self.client.get(
            reverse("publicchannel-detail", kwargs={"pk": data["id"]})
        )
        self.assertEqual(response.data["name"], "testing")

    def test_channelmetadata_retrieve_headers(self):
        channel = models.ChannelMetadata.objects.get()
        channel.last_updated = datetime.datetime.now()
        channel.save()
        response = self.client.get(
            reverse("publicchannel-detail", kwargs={"pk": channel.id})
        )
        self._assert_headers(response, channel.last_updated)

    def test_channelmetadata_langfield(self):
        data = models.ChannelMetadata.objects.first()
        root_lang = models.Language.objects.first()
        data.root.lang = root_lang
        data.root.save()

        response = self.client.get(
            reverse("publicchannel-detail", kwargs={"pk": data.id})
        )
        self.assertEqual(response.data["lang_code"], root_lang.lang_code)
        self.assertEqual(response.data["lang_name"], root_lang.native_name)

    def test_channelmetadata_langfield_none(self):
        data = models.ChannelMetadata.objects.first()

        response = self.client.get(
            reverse("publicchannel-detail", kwargs={"pk": data.id})
        )
        self.assertEqual(response.data["lang_code"], None)
        self.assertEqual(response.data["lang_name"], None)

    def test_channelmetadata_content_available_param_filter_lowercase_true(self):
        response = self.client.get(reverse("publicchannel-list"), {"available": "true"})
        self.assertEqual(response.data[0]["id"], self.channel_data["id"])

    def test_channelmetadata_content_available_param_filter_uppercase_true(self):
        response = self.client.get(reverse("publicchannel-list"), {"available": True})
        self.assertEqual(response.data[0]["id"], self.channel_data["id"])

    def test_channelmetadata_content_unavailable_param_filter_false(self):
        models.ContentNode.objects.all().update(available=False)
        response = self.client.get(reverse("publicchannel-list"), {"available": False})
        self.assertEqual(response.data[0]["id"], self.channel_data["id"])

    def test_channelmetadata_content_available_field_true(self):
        response = self.client.get(reverse("publicchannel-list"))
        self.assertEqual(response.data[0]["available"], True)

    def test_channelmetadata_content_available_field_false(self):
        models.ContentNode.objects.all().update(available=False)
        response = self.client.get(reverse("publicchannel-list"))
        self.assertEqual(response.data[0]["available"], False)

    def test_channelmetadata_has_exercises_filter(self):
        # Has nothing else for that matter...
        no_exercise_channel = models.ContentNode.objects.create(
            pk="6a406ac66b224106aa2e93f73a94333d",
            channel_id="f8ec4a5d14cd4716890999da596032d2",
            content_id="ded4a083e75f4689b386fd2b706e792a",
            kind="topic",
            title="no exercise channel",
        )
        models.ChannelMetadata.objects.create(
            id="63acff41781543828861ade41dbdd7ff",
            name="no exercise channel metadata",
            root=no_exercise_channel,
            public=True,
        )
        models.ContentNode.objects.create(
            pk=uuid.uuid4().hex,
            channel_id=self.channel_data["id"],
            content_id=uuid.uuid4().hex,
            kind="exercise",
            title="exercise",
            parent=self.root,
            available=True,
        )
        no_filter_response = self.client.get(reverse("publicchannel-list"))
        self.assertEqual(len(no_filter_response.data), 2)
        with_filter_response = self.client.get(
            reverse("publicchannel-list"), {"has_exercise": True}
        )
        self.assertEqual(len(with_filter_response.data), 1)
        self.assertEqual(
            with_filter_response.data[0]["name"], self.channel_data["name"]
        )

    def test_filtering_coach_content_anon(self):
        response = self.client.get(
            reverse("publiccontentnode-list"),
            data={"include_coach_content": False},
        )
        total = models.ContentNode.objects.filter(coach_content=False).count()
        self.assertEqual(len(response.data), total)

    def tearDown(self):
        """
        clean up files/folders created during the test
        """
        cache.clear()
        super(ContentNodeAPITestCase, self).tearDown()
