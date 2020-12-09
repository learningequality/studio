from datetime import datetime
import json
import os

from rest_framework import serializers

from contentcuration.models import Channel
from contentcuration.models import ContentNode


# TASKS
################################################################################

def archive_channel(channel_id, tree='main'):
    # channel_id = '79137650868d58a89f12f28aaceec690'
    channel = Channel.objects.get(id=channel_id)
    root = getattr(channel, tree + '_tree')
    serializer = ContentNodeArchiveSerializer(root)
    channel_data = serializer.data
    channel_data_json_str = json.dumps(serializer.data, indent=4, ensure_ascii=False)
    archive_time = datetime.now().strftime("%Y-%m-%d__%H%M")
    filename_ext = channel_id + '_' + tree + '_' + archive_time + '.json'
    tmpcontent_write(filename_ext, channel_data_json_str)






# ARCHIVAL SERIALIZERS
################################################################################

NODE_ATTRIBUTES = [
    # ids
    'kind_id',
    'id',
    'source_domain',
    'source_id',
    'content_id',
    'node_id',
    # data
    'title',
    'description',
    'language',
    'author',
    'aggregator',
    'provider',
    'thumbnail_encoding',
    # licensing metadata
    'license_id',
    'license_description',
    'copyright_holder',
    # domain-specific metadata
    'role_visibility',
    # content provenance
    'original_node_id',
    'cloned_source_id',
    'original_channel_id',
    'source_channel_id',
    'original_source_node_id',
    'source_node_id',
    # workflows
    'publishing',
    'published',
    'complete',
    'changed',
    'freeze_authoring_data',
    # structural
    'parent_id',
    'sort_order',
    # via MPTTModel
    'tree_id',
    'level',
    'lft', 'rght',
    # timestamps
    'created',
    'modified',
    # kind-specific extended attributes
    'extra_fields',
]

NODE_RELATIONS = [
    'children',
]



class ContentNodeArchiveSerializer(serializers.ModelSerializer):
    """
    This is a read-only serializer used for channel archiving.
    """

    class Meta:
        model = ContentNode
        fields = NODE_ATTRIBUTES + NODE_RELATIONS

    def get_fields(self):
        fields = super(ContentNodeArchiveSerializer, self).get_fields()
        fields['children'] = ContentNodeArchiveSerializer(many=True)
        return fields




# SAVE
################################################################################

settings_ARCHIVES_ROOT = 'tmpcontent/archives'  # TODO: move me to GCP bucket
                                                # i'm thinking archives could be
                                                # a sibling of content/databases
                                                # and content/storage
if not os.path.exists(settings_ARCHIVES_ROOT):
    os.makedirs(settings_ARCHIVES_ROOT, exist_ok=True)


def tmpcontent_write(filename_ext, jsondata):
    save_to_path = os.path.join(settings_ARCHIVES_ROOT, filename_ext)
    with open(save_to_path, 'w') as outf:
        outf.write(jsondata)

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
