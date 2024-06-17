from datetime import datetime
import json
import os

from rest_framework import serializers

from contentcuration.models import AssessmentItem
from contentcuration.models import Channel
from contentcuration.models import ContentNode
from contentcuration.models import File
from contentcuration.viewsets.assessmentitem import AssessmentItemSerializer
from contentcuration.viewsets.file import FileSerializer
from contentcuration.viewsets.file import retrieve_storage_url

# TASKS
################################################################################


def archive_channel_tree(channel_id, tree="main"):
    """
    Convert the `tree`_tree of `channel_id` to JSON and save it to archives dir.
    """
    channel = Channel.objects.get(id=channel_id)
    # 1. serialize tree
    root = getattr(channel, tree + "_tree")
    tree_serializer = ContentNodeArchiveSerializer(root)
    tree_data = tree_serializer.data

    # 2. get channel attributes
    channel_serializer = ChannelMetadataArchiveSerializer(channel)
    channel_data = channel_serializer.data

    # 3. manually transplant attributes from tree root node onto channel node
    # TODO: review if all these are necessay and archive-worthy
    channel_data["children"] = tree_data["children"]
    channel_data["tree_name"] = tree + "_tree"  # to know what we're archiving
    channel_data["tree_id"] = tree_data["tree_id"]  # to know what we're archiving
    channel_data["created"] = tree_data["created"]
    channel_data["modified"] = tree_data["modified"]
    channel_data["extra_fields"] = tree_data["extra_fields"]
    channel_data["publishing"] = tree_data["publishing"]
    channel_data["published"] = tree_data["published"]
    channel_data["complete"] = tree_data["complete"]
    channel_data["changed"] = tree_data["changed"]
    channel_data["freeze_authoring_data"] = tree_data["freeze_authoring_data"]

    # 4. dict -> json
    tree_data_json_str = json.dumps(channel_data, indent=4, ensure_ascii=False)

    # 5. save dat
    archive_time = datetime.now().strftime("%Y-%m-%d__%H%M")
    filename_ext = channel_id + "_" + tree + "_" + archive_time + ".json"
    save_to_path = tmpcontent_write(filename_ext, tree_data_json_str)
    return save_to_path


# ARCHIVAL SERIALIZERS
################################################################################

# NOTE: the NODE_ATTRIBUTES was obtained from node.__dict__.keys() and is a complete
# picture of a content node (maybe too complete!). This is because ContentNodeSerializer
# only ouputs a subset of fields
# https://github.com/learningequality/studio/blob/develop/contentcuration/contentcuration/viewsets/contentnode.py#L219-L238
# while for archival purposes we want ot have the complete picture.
# TODO: do not reinvent the wheel: try to ContentNodeSerializer if possible so as
#       not to create a "custom json" format but reuse same structure as API json.

NODE_ATTRIBUTES = [
    # ids
    "kind_id",
    "id",
    "source_domain",
    "source_id",
    "content_id",
    "node_id",
    # data
    "title",
    "description",
    "language",
    "author",
    "aggregator",
    "provider",
    "thumbnail_encoding",
    # licensing metadata
    "license_id",
    "license_description",
    "copyright_holder",
    # domain-specific metadata
    "role_visibility",
    # content provenance
    "original_node_id",
    "cloned_source_id",
    "original_channel_id",
    "source_channel_id",
    "original_source_node_id",
    "source_node_id",
    # workflows
    "publishing",
    "published",
    "complete",
    "changed",
    "freeze_authoring_data",  # needed?
    # structural
    "parent_id",
    "sort_order",
    # via MPTTModel
    "tree_id",
    "level",  # TODO: remove me (info not neeeded)
    "lft",
    "rght",  # TODO: remove me (info not neeeded)
    # timestamps
    "created",
    "modified",
    # kind-specific extended attributes
    "extra_fields",
]

NODE_RELATIONS = [
    "children",
    "files",
    "assessment_items",
]


# copied from
# https://github.com/learningequality/studio/blob/develop/contentcuration/contentcuration/viewsets/file.py#L74-L95


class FileArchiveSerializer(FileSerializer):
    class Meta:
        model = File
        fields = (
            "id",
            "checksum",
            "file_size",
            "language",
            "file_format",
            "contentnode_id",
            "assessment_item_id",
            "file_on_disk",
            "preset_id",
            "language_id",
            "original_filename",
            "uploaded_by",
        )
        field_map = {
            "url": retrieve_storage_url,
            "preset": "preset_id",
            "language": "language_id",
            "contentnode": "contentnode_id",
            "assessment_item": "assessment_item_id",
        }


# copied from
# https://github.com/learningequality/studio/blob/develop/contentcuration/contentcuration/viewsets/assessmentitem.py#L202-L218


class AssessmentItemArchiveSerializer(AssessmentItemSerializer):
    class Meta:
        model = AssessmentItem
        fields = (
            "question",
            "type",
            "answers",
            "contentnode_id",
            "assessment_id",
            "hints",
            "raw_data",
            "order",
            "source_url",
            "randomize",
            "deleted",
        )
        field_map = {
            "contentnode": "contentnode_id",
        }


class ContentNodeArchiveSerializer(serializers.ModelSerializer):
    """
    This is a read-only content node serializer used for channel archiving.
    """

    files = FileArchiveSerializer(many=True)
    assessment_items = AssessmentItemArchiveSerializer(many=True)
    # TODO: finish all fields (reusing existing serializers as much as possible)
    #  tags = TagField(required=False)?
    #  license as nested obj?
    #  prerequisites?

    class Meta:
        model = ContentNode
        fields = NODE_ATTRIBUTES + NODE_RELATIONS

    def get_fields(self):
        fields = super(ContentNodeArchiveSerializer, self).get_fields()
        fields["children"] = ContentNodeArchiveSerializer(many=True)
        return fields


CHANNEL_ATTRIBUTES = [
    "id",
    "name",
    "description",
    "tagline",
    "version",
    "thumbnail",
    "thumbnail_encoding",
    "language_id",
    "trash_tree_id",
    "clipboard_tree_id",
    "main_tree_id",
    "staging_tree_id",
    "chef_tree_id",
    "previous_tree_id",
    "deleted",
    "public",
    "preferences",
    "content_defaults",
    "priority",
    "last_published",
    "source_url",
    "demo_server_url",
    "source_id",
    "source_domain",
    "ricecooker_version",
    "published_data",
    "icon_encoding",
    "total_resource_count",
    "published_kind_count",
    "published_size",
]

CHANNEL_RELATIONS = []


class ChannelMetadataArchiveSerializer(serializers.ModelSerializer):
    """
    This is a read-only channel metadata serializer used for channel archiving.
    """

    # TODO: finish all fields
    #   editors?
    #   viewers?
    #   secret_tokens

    class Meta:
        model = Channel
        fields = CHANNEL_ATTRIBUTES + CHANNEL_RELATIONS


# SAVE
################################################################################

settings_ARCHIVES_ROOT = "tmpcontent/archives"
# TODO: move me to GCP bucket. This dir could be a sibling of content/databases
# and content/storage, like content/archives/jsontrees/{channel_id}/?/?.json

if not os.path.exists(settings_ARCHIVES_ROOT):
    os.makedirs(settings_ARCHIVES_ROOT, exist_ok=True)


def tmpcontent_write(filename_ext, jsondata):
    save_to_path = os.path.join(settings_ARCHIVES_ROOT, filename_ext)
    with open(save_to_path, "w") as outf:
        outf.write(jsondata)
    return save_to_path


# TODO (continued): replace tmpcontent_write; sample code below
# def write(self, *args, **kwargs):
#     try:
#         filepath = self.get_write_to_path()
#         self._write_details(filepath)
#         saved_filename = "{}.{}".format(self.filename, self.ext)
#         save_to_path = os.path.sep.join([settings_settings_ARCHIVES_ROOT, saved_filename])
#         # Write file to default storage
#         with open(filepath, 'rb') as fobj:
#             default_storage.save(save_to_path, fobj)
#         return save_to_path
#     finally:
#         self.delete_tempfiles()
