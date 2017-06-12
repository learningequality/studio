# Functions for recording various statistics
import newrelic.agent
from le_utils.constants import content_kinds

from contentcuration.models import ContentNode, Channel


def record_channel_stats(channel, original_channel):
    """
    :param channel: The channel the current action is being performed on.
    :param original_channel: The `channel` before the action was performed.
    """
    action_attributes = dict(channel_id=channel.id, content_type='Channel')
    # TODO: Determine the user_id when a human creates a channel
    if channel.editors.first() is not None:
        action_attributes['user_id'] = channel.editors.first().id

    if channel.ricecooker_version is not None:
        action_attributes['content_source'] = 'Ricecooker'
        if channel.staging_tree is not None:
            # Staging tree only exists on API calls (currently just Ricecooker)
            action_attributes['action_source'] = 'Ricecooker'
            action_attributes['channel_num_resources'] = original_channel.chef_tree.get_descendants().exclude(
                kind=content_kinds.TOPIC).count()
            action_attributes['channel_num_nodes'] = original_channel.chef_tree.get_descendant_count()
            action_attributes['num_resources_added'] = action_attributes['channel_num_resources']
            action_attributes['num_nodes_added'] = action_attributes['channel_num_nodes']

            if channel.previous_tree is None:
                action_attributes['action'] = 'Create'
                action_attributes['action_type'] = 'First'
            # TODO: Distinguish between ricecooker uploads to existing channels and channels that have been deleted
            else:
                action_attributes['action'] = 'Update'
                action_attributes['action_type'] = 'Content'
        else:
            # Ricecooker channel is being edited by user
            action_attributes['action_source'] = 'Human'
            action_attributes['channel_num_resources'] = channel.main_tree.get_descendants().exclude(
                kind=content_kinds.TOPIC).count()
            action_attributes['channel_num_nodes'] = channel.main_tree.get_descendant_count()

            if channel.deleted:
                action_attributes['action'] = 'Delete'
            # ricecooker uploads and publish actions result in multiple saves, so we filter here only for human updates
            # chef_tree only exists on ricecooker uploads
            # channel's main_tree differs from original_channel's on ricecooker uploads
            # channel's version differs from original_channel's on publish calls
            elif not channel.chef_tree and channel.main_tree == original_channel.main_tree \
                    and channel.version == original_channel.version:
                action_attributes['action'] = 'Update'
                action_attributes['action_type'] = 'Metadata'
    else:
        action_attributes['content_source'] = 'Human'
        action_attributes['action_source'] = 'Human'

        if channel.main_tree:
            action_attributes['channel_num_resources'] = channel.main_tree.get_descendants().exclude(
                kind=content_kinds.TOPIC).count()
            action_attributes['channel_num_nodes'] = channel.main_tree.get_descendant_count()
        else:
            action_attributes['channel_num_resources'] = 0
            action_attributes['channel_num_nodes'] = 0

        if original_channel is None:
            if channel.name:
                action_attributes['action'] = 'Create'
        elif channel.deleted:
            action_attributes['action'] = 'Delete'
        elif channel.version == original_channel.version:
            action_attributes['action'] = 'Update'
            action_attributes['action_type'] = 'Metadata'

    record_channel_action_stats(action_attributes)


def record_node_addition_stats(nodes_being_added, user_id):
    """
    :param nodes_being_added: The nodes being added to the human channel.
    :param user_id: The id of the user committing the action.
    """

    action_attributes = dict(action_source='Human', content_source='Human', user_id=user_id)

    # The first node to be added in this action.
    first_node = nodes_being_added.itervalues().next()
    action_attributes['content_type'] = first_node['kind'].kind.title()

    num_resources = 0
    if 'id' in first_node and ContentNode.objects.get(id=first_node['id']).parent is not None:
        action_attributes['action'] = 'Update'
    else:
        action_attributes['action'] = 'Create'
        action_attributes['num_nodes_added'] = len(nodes_being_added)
        for id, node in nodes_being_added.items():
            if node['kind'].kind != content_kinds.TOPIC:
                num_resources += 1
        action_attributes['num_resources_added'] = num_resources

    # The parent the new nodes are being added to.
    parent_node = first_node['parent']
    action_attributes['channel_id'] = parent_node.get_channel().id

    root_node = parent_node.get_root()
    action_attributes['channel_num_resources'] = root_node.get_descendants().exclude(kind=content_kinds.TOPIC).count() \
                                                 + num_resources
    action_attributes['channel_num_nodes'] = root_node.get_descendant_count() + num_resources

    record_channel_action_stats(action_attributes)


def record_user_registration_stats(user):
    """
    :param user: The newly registered user.
    """
    record_channel_action_stats(dict(action="Register", action_source="Human", user_id=user.pk))


def record_node_duplication_stats(nodes_being_copied, target_parent_id, destination_channel_id):
    """
    :param nodes_being_copied: The nodes being duplicated.
    :param target_parent_id: The parent where the nodes are being copied to.
    :param destination_channel_id: The channel where the nodes are being copied to.
    """
    num_resources_duplicated = 0
    num_nodes_duplicated = 0

    for node_data in nodes_being_copied:
        orig_node = ContentNode.objects.get(pk=node_data['id'])

        num_resources_duplicated += orig_node.get_descendants(include_self=True).exclude(
            kind=content_kinds.TOPIC).count()
        num_nodes_duplicated += orig_node.get_descendant_count() + 1

    destination_channel = Channel.objects.get(pk=destination_channel_id)
    action_attributes = dict(action_source='Human', channel_id=destination_channel_id,
                             user_id=destination_channel.editors.first().id)

    source_channel = destination_channel
    parent = ContentNode.objects.get(pk=target_parent_id)
    if parent.user_clipboard.first() is not None:
        action_attributes['action'] = 'Copy'
        action_attributes['num_resources_added'] = 0
        action_attributes['num_nodes_added'] = 0
    else:
        node_to_copy = ContentNode.objects.get(pk=nodes_being_copied[0]['id'])
        source_channel = node_to_copy.get_channel()
        action_attributes['action'] = 'Import'
        action_attributes['num_resources_added'] = num_resources_duplicated
        action_attributes['num_nodes_added'] = num_nodes_duplicated
        action_attributes['original_channel'] = node_to_copy.original_channel_id

    action_attributes['content_source'] = 'Human' if source_channel.ricecooker_version is None else 'Ricecooker'

    action_attributes['source_channel'] = source_channel.id
    action_attributes['source_channel_num_resources'] = source_channel.main_tree.get_descendants().exclude(
        kind=content_kinds.TOPIC).count()
    action_attributes['source_channel_num_nodes'] = source_channel.main_tree.get_descendant_count()

    action_attributes['channel_num_resources'] = destination_channel.main_tree.get_descendants().exclude(
        kind=content_kinds.TOPIC).count() + action_attributes['num_resources_added']
    action_attributes['channel_num_nodes'] = destination_channel.main_tree.get_descendant_count() \
                                             + action_attributes['num_nodes_added']

    record_channel_action_stats(action_attributes)


def record_publish_stats(channel):
    """
    :param channel: The channel being published.
    """
    action_attributes = dict(action='Publish', action_source='Human', channel_id=channel.id, content_type='Channel')
    if channel.editors.first() is not None:
        action_attributes['user_id'] = channel.editors.first().id

    if channel.ricecooker_version is not None:
        action_attributes['content_source'] = 'Ricecooker'
    else:
        action_attributes['content_source'] = 'Human'

    action_attributes['channel_num_resources'] = channel.main_tree.get_descendants().exclude(
        kind=content_kinds.TOPIC).count()
    action_attributes['channel_num_nodes'] = channel.main_tree.get_descendant_count()

    record_channel_action_stats(action_attributes)


def record_channel_action_stats(action_attributes):
    """
    :param action_attributes: The attributes of the current action.
    """
    if 'action' in action_attributes:
        newrelic.agent.record_custom_event("ChannelStats", params=action_attributes)
