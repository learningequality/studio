import copy
import random
import uuid
from itertools import chain

from django.core.exceptions import FieldDoesNotExist
from kolibri_public import models as kolibri_public_models
from le_utils.constants import content_kinds
from le_utils.constants import format_presets
from le_utils.constants.labels.accessibility_categories import (
    ACCESSIBILITYCATEGORIESLIST,
)
from le_utils.constants.labels.learning_activities import LEARNINGACTIVITIESLIST
from le_utils.constants.labels.levels import LEVELSLIST
from le_utils.constants.labels.needs import NEEDSLIST
from le_utils.constants.labels.subjects import SUBJECTSLIST


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


OKAY_TAG = "okay_tag"
BAD_TAG = "tag_is_too_long_because_it_is_over_30_characters"

PROBLEMATIC_HTML5_NODE = "ab9d3fd905c848a6989936c609405abb"

BUILDER_DEFAULT_OPTIONS = {
    "problematic_tags": False,
    "problematic_nodes": False,
}


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

    def __init__(
        self, levels=3, num_children=5, models=kolibri_public_models, options=None
    ):
        self.levels = levels
        self.num_children = num_children
        self.models = models
        self.options = BUILDER_DEFAULT_OPTIONS.copy()
        if options:
            self.options.update(options)

        self.content_tags = {}
        self._excluded_channel_fields = None
        self._excluded_node_fields = None

        self.modified = set()

        try:
            self.load_data()
        except KeyError:
            self.generate_new_tree()
            self.save_data()

        self.generate_nodes_from_root_node()

    @property
    def cache_key(self):
        return "{}_{}_{}".format(self.levels, self.num_children, self.models)

    def generate_new_tree(self):
        self.channel = self.channel_data()
        self.files = {}
        self.localfiles = {}

        self.node_to_files_map = {}
        self.localfile_to_files_map = {}
        self.content_tag_map = {}

        tags = [OKAY_TAG]
        if self.options["problematic_tags"]:
            tags.append(BAD_TAG)
        for tag_name in tags:
            self.content_tag_data(tag_name)

        self.root_node = self.generate_topic()
        if "root_id" in self.channel:
            self.channel["root_id"] = self.root_node["id"]
        if "root_pk" in self.channel:
            self.channel["root_pk"] = self.root_node["id"]

        if self.levels:
            self.root_node["children"] = self.recurse_and_generate(
                self.root_node["id"], self.levels
            )
            if self.options["problematic_nodes"]:
                self.root_node["children"].extend(self.generate_problematic_nodes())

    def generate_problematic_nodes(self):
        nodes = []
        html5_not_a_topic = self.contentnode_data(
            node_id=PROBLEMATIC_HTML5_NODE,
            kind=content_kinds.HTML5,
            parent_id=self.root_node["id"],
        )
        # the problem: this node is not a topic, but it has children
        html5_not_a_topic["children"] = [
            self.contentnode_data(parent_id=PROBLEMATIC_HTML5_NODE)
        ]
        nodes.append(html5_not_a_topic)
        return nodes

    def load_data(self):
        try:
            data = copy.deepcopy(self.__TREE_CACHE[self.cache_key])

            for key in self.tree_keys:
                setattr(self, key, data[key])
        except KeyError:
            print(  # noqa: T201
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
        self._django_nodes = self.models.ContentNode.objects.build_tree_nodes(
            self.root_node
        )

        self.nodes = {n["id"]: n for n in map(to_dict, self._django_nodes)}

    def insert_into_default_db(self):
        self.models.ContentTag.objects.bulk_create(
            (self.models.ContentTag(**tag) for tag in self.content_tags.values())
        )
        self.models.ContentNode.objects.bulk_create(self._django_nodes)
        self.models.ContentNode.tags.through.objects.bulk_create(
            (
                self.models.ContentNode.tags.through(
                    contentnode_id=node["id"], contenttag_id=tag["id"]
                )
                for node in self.nodes.values()
                for tag in self.content_tags.values()
            )
        )
        self.models.ChannelMetadata.objects.create(**self.channel)
        self.models.LocalFile.objects.bulk_create(
            (self.models.LocalFile(**local) for local in self.localfiles.values())
        )
        self.models.File.objects.bulk_create(
            (self.models.File(**f) for f in self.files.values())
        )

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
            "content_contenttag": list(self.content_tags.values()),
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
        for tag_id in self.content_tags:
            self.content_tag_map[node["id"]] = [tag_id]
        return node

    def channel_data(self, channel_id=None, version=1):
        channel_data = {
            "root_id": None,
            "root_pk": None,
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
        if self._excluded_channel_fields is None:
            self._excluded_channel_fields = []
            for key in channel_data:
                try:
                    self.models.ChannelMetadata._meta.get_field(key)
                except FieldDoesNotExist:
                    self._excluded_channel_fields.append(key)
        for field in self._excluded_channel_fields:
            del channel_data[field]
        return channel_data

    def content_tag_data(self, tag_name):
        data = {
            "id": uuid4_hex(),
            "tag_name": tag_name,
        }
        self.content_tags[data["id"]] = data
        return data

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
        contentnode_data = {
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
        if self._excluded_node_fields is None:
            self._excluded_node_fields = []
            for key in contentnode_data:
                try:
                    self.models.ContentNode._meta.get_field(key)
                except FieldDoesNotExist:
                    self._excluded_node_fields.append(key)
        for field in self._excluded_node_fields:
            del contentnode_data[field]
        return contentnode_data
