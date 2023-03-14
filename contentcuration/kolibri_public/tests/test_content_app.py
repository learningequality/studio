"""
To run this test, type this in command line <kolibri manage test -- kolibri.core.content>
"""
import copy
import datetime
import random
import uuid
from calendar import timegm
from itertools import chain

from django.core.cache import cache
from django.core.management import call_command
from django.urls import reverse
from django.utils.http import http_date
from kolibri_public import models
from le_utils.constants import content_kinds
from le_utils.constants import format_presets
from le_utils.constants.labels.accessibility_categories import (
    ACCESSIBILITYCATEGORIESLIST,
)
from le_utils.constants.labels.learning_activities import LEARNINGACTIVITIESLIST
from le_utils.constants.labels.levels import LEVELSLIST
from le_utils.constants.labels.needs import NEEDSLIST
from le_utils.constants.labels.subjects import SUBJECTSLIST
from rest_framework.test import APITestCase

from contentcuration.models import generate_storage_url


def to_dict(instance):
    opts = instance._meta
    data = {}
    for f in chain(opts.concrete_fields, opts.private_fields):
        data[f.name] = f.value_from_object(instance)
    return data


def uuid4_hex():
    return uuid.uuid4().hex


def choices(sequence, k):
    return [random.choice(sequence) for _ in range(0, k)]


class ChannelBuilder(object):
    """
    This class is purely to generate all the relevant data for a single
    channel for use during testing.
    """

    __TREE_CACHE = {}

    tree_keys = (
        "channel",
        "files",
        "localfiles",
        "node_to_files_map",
        "localfile_to_files_map",
        "root_node",
    )

    def __init__(self, levels=3, num_children=5):
        self.levels = levels
        self.num_children = num_children

        self.modified = set()

        try:
            self.load_data()
        except KeyError:
            self.generate_new_tree()
            self.save_data()

        self.generate_nodes_from_root_node()

    @property
    def cache_key(self):
        return "{}_{}".format(self.levels, self.num_children)

    def generate_new_tree(self):
        self.channel = self.channel_data()
        self.files = {}
        self.localfiles = {}
        self.node_to_files_map = {}
        self.localfile_to_files_map = {}

        self.root_node = self.generate_topic()
        self.channel["root_id"] = self.root_node["id"]

        if self.levels:
            self.root_node["children"] = self.recurse_and_generate(
                self.root_node["id"], self.levels
            )

    def load_data(self):
        try:
            data = copy.deepcopy(self.__TREE_CACHE[self.cache_key])

            for key in self.tree_keys:
                setattr(self, key, data[key])
        except KeyError:
            print(
                "No tree cache found for {} levels and {} children per level".format(
                    self.levels, self.num_children
                )
            )
            raise

    def save_data(self):
        data = {}

        for key in self.tree_keys:
            data[key] = getattr(self, key)

        self.__TREE_CACHE[self.cache_key] = copy.deepcopy(data)

    def generate_nodes_from_root_node(self):
        self._django_nodes = models.ContentNode.objects.build_tree_nodes(self.root_node)

        self.nodes = {n["id"]: n for n in map(to_dict, self._django_nodes)}

    def insert_into_default_db(self):
        models.ContentNode.objects.bulk_create(self._django_nodes)
        models.ChannelMetadata.objects.create(**self.channel)
        models.LocalFile.objects.bulk_create(
            (models.LocalFile(**local) for local in self.localfiles.values())
        )
        models.File.objects.bulk_create((models.File(**f) for f in self.files.values()))

    def recurse_tree_until_leaf_container(self, parent):
        if not parent.get("children"):
            parent["children"] = []
            return parent
        child = random.choice(parent["children"])
        if child["kind"] != content_kinds.TOPIC:
            return parent
        return self.recurse_tree_until_leaf_container(child)

    @property
    def resources(self):
        return filter(lambda x: x["kind"] != content_kinds.TOPIC, self.nodes.values())

    def get_resource_localfiles(self, ids):
        localfiles = {}
        for r in ids:
            for f in self.node_to_files_map.get(r, []):
                file = self.files[f]
                localfile = self.localfiles[file["local_file_id"]]
                localfiles[localfile["id"]] = localfile
        return list(localfiles.values())

    @property
    def data(self):
        return {
            "content_channel": [self.channel],
            "content_contentnode": list(self.nodes.values()),
            "content_file": list(self.files.values()),
            "content_localfile": list(self.localfiles.values()),
        }

    def recurse_and_generate(self, parent_id, levels):
        children = []
        for i in range(0, self.num_children):
            if levels == 0:
                node = self.generate_leaf(parent_id)
            else:
                node = self.generate_topic(parent_id=parent_id)
                node["children"] = self.recurse_and_generate(node["id"], levels - 1)
            children.append(node)
        return children

    def generate_topic(self, parent_id=None):
        data = self.contentnode_data(
            kind=content_kinds.TOPIC, root=parent_id is None, parent_id=parent_id
        )
        thumbnail = self.localfile_data(extension="png")
        self.file_data(
            data["id"],
            thumbnail["id"],
            thumbnail=True,
            preset=format_presets.TOPIC_THUMBNAIL,
        )
        return data

    def generate_leaf(self, parent_id):
        node = self.contentnode_data(parent_id=parent_id, kind=content_kinds.VIDEO)
        localfile = self.localfile_data()
        thumbnail = self.localfile_data(extension="png")
        self.file_data(node["id"], localfile["id"], preset=format_presets.VIDEO_LOW_RES)
        self.file_data(
            node["id"],
            thumbnail["id"],
            thumbnail=True,
            preset=format_presets.VIDEO_THUMBNAIL,
        )
        return node

    def channel_data(self, channel_id=None, version=1):
        return {
            "root_id": None,
            "last_updated": None,
            "version": 1,
            "author": "Outis",
            "description": "Test channel",
            "tagline": None,
            "min_schema_version": "1",
            "thumbnail": "",
            "name": "testing",
            "public": True,
            "id": channel_id or uuid4_hex(),
        }

    def localfile_data(self, extension="mp4"):
        data = {
            "file_size": random.randint(1, 1000),
            "extension": extension,
            "available": False,
            "id": uuid4_hex(),
        }

        self.localfiles[data["id"]] = data

        return data

    def file_data(
        self,
        contentnode_id,
        local_file_id,
        thumbnail=False,
        preset=None,
        supplementary=False,
    ):
        data = {
            "priority": None,
            "supplementary": supplementary or thumbnail,
            "id": uuid4_hex(),
            "local_file_id": local_file_id or uuid4_hex(),
            "contentnode_id": contentnode_id,
            "thumbnail": thumbnail,
            "preset": preset,
            "lang_id": None,
        }
        self.files[data["id"]] = data
        if contentnode_id not in self.node_to_files_map:
            self.node_to_files_map[contentnode_id] = []
        self.node_to_files_map[contentnode_id].append(data["id"])
        if local_file_id not in self.localfile_to_files_map:
            self.localfile_to_files_map[local_file_id] = []
        self.localfile_to_files_map[local_file_id].append(data["id"])
        return data

    def contentnode_data(
        self, node_id=None, content_id=None, parent_id=None, kind=None, root=False
    ):
        # First kind in choices is Topic, so exclude it here.
        kind = kind or random.choice(content_kinds.choices[1:])[0]
        return {
            "options": "{}",
            "content_id": content_id or uuid4_hex(),
            "channel_id": self.channel["id"],
            "description": "Blah blah blah",
            "id": node_id or uuid4_hex(),
            "license_name": "GNU",
            "license_owner": "",
            "license_description": None,
            "lang_id": None,
            "author": "",
            "title": "Test",
            "parent_id": None if root else parent_id or uuid4_hex(),
            "kind": kind,
            "coach_content": False,
            "available": False,
            "learning_activities": ",".join(
                set(choices(LEARNINGACTIVITIESLIST, k=random.randint(1, 3)))
            ),
            "accessibility_labels": ",".join(
                set(choices(ACCESSIBILITYCATEGORIESLIST, k=random.randint(1, 3)))
            ),
            "grade_levels": ",".join(set(choices(LEVELSLIST, k=random.randint(1, 2)))),
            "categories": ",".join(set(choices(SUBJECTSLIST, k=random.randint(1, 10)))),
            "learner_needs": ",".join(set(choices(NEEDSLIST, k=random.randint(1, 5)))),
        }


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
        self.assertEqual(set(response.data["tags"]), set(tags))

    def test_channelmetadata_list(self):
        response = self.client.get(reverse("publicchannel-list", kwargs={}))
        self.assertEqual(response.data[0]["name"], "testing")

    def test_channelmetadata_retrieve(self):
        data = models.ChannelMetadata.objects.values()[0]
        response = self.client.get(
            reverse("publicchannel-detail", kwargs={"pk": data["id"]})
        )
        self.assertEqual(response.data["name"], "testing")

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
        response = self.client.get(
            reverse("publicchannel-list"), {"available": "true"}
        )
        self.assertEqual(response.data[0]["id"], self.channel_data["id"])

    def test_channelmetadata_content_available_param_filter_uppercase_true(self):
        response = self.client.get(
            reverse("publicchannel-list"), {"available": True}
        )
        self.assertEqual(response.data[0]["id"], self.channel_data["id"])

    def test_channelmetadata_content_unavailable_param_filter_false(self):
        models.ContentNode.objects.all().update(available=False)
        response = self.client.get(
            reverse("publicchannel-list"), {"available": False}
        )
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
        self.assertEqual(with_filter_response.data[0]["name"], self.channel_data["name"])

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
