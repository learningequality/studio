import find from 'lodash/find';
import client from 'shared/client';
import { Channel, ContentNode } from 'shared/data/resources';

// Function that calls the get_nodes_by_ids_complete endpoint
export function getCompleteContentNode(context, nodeId) {
  return client.get(`/api/get_nodes_by_ids_complete/${nodeId}`).then(response => {
    return response.data[0];
  });
}

export function getTopicContentNode(context, nodeId) {
  return getCompleteContentNode(context, nodeId).then(node => {
    let ancestorsPromise;
    if (node.ancestors.length === 0) {
      ancestorsPromise = Promise.resolve([]);
    } else {
      ancestorsPromise = ContentNode.where({ id__in: node.ancestors });
    }
    return ancestorsPromise.then(ancestors => {
      return {
        ...node,
        ancestorNodes: ancestors,
      };
    });
  });
}

export function getChannelContentNode(context, channelId) {
  return Channel.get(channelId).then(channel => {
    return getCompleteContentNode(context, channel.root_id);
  });
}

// Function that calls the duplicate_nodes endpoint to add new nodes to the channel/topic
export function duplicateNodesToTarget(context, { nodeIds, targetNodeId }) {
  // get targetNodeId metadata.max_sort_order
  return getCompleteContentNode(context, targetNodeId).then(targetNode => {
    const maxSortOrder = targetNode.metadata.max_sort_order || 0;
    return client
      .post(`/api/duplicate_nodes/`, {
        node_ids: nodeIds,
        sort_order: maxSortOrder + 1,
        target_parent: targetNodeId,
        channel_id: context.rootState.currentChannel.currentChannelId,
      })
      .then(response => {
        return response.data;
      });
  });
}

export function fetchContentNodes(context, params) {
  const { topicId, channelId } = params;
  if (topicId && channelId) {
    return ContentNode.where({ parent: topicId, channel_id: channelId }).then(nodes => {
      return nodes;
    });
  } else {
    const { currentChannelId } = context.rootState.currentChannel;
    return Channel.requestCollection({}).then(channels => {
      const channelsRootIds = channels
        .filter(({ id }) => id !== currentChannelId)
        .map(({ root_id }) => root_id);
      // Need to make call to ContentNode resource to get resource_count field
      return ContentNode.where({ id__in: channelsRootIds }).then(channelNodes => {
        return channelNodes.map(node => {
          // need to merge description from the Channel resource call
          const channelMatch = find(channels, { root_id: node.id });
          return {
            ...node,
            isChannel: true,
            resource_count: channelMatch.count,
            description: channelMatch.description,
            language: channelMatch.language,
            // used for filters
            filterPublic: channelMatch.public,
            filterStarred: channelMatch.bookmark,
            filterMine: channelMatch.edit,
          };
        });
      });
    });
  }
}

// checks the task endpoint once
export function updateTaskProgress(context, taskId) {
  if (!taskId) {
    return Promise.resolve();
  }
  return client.get(`/api/task/${taskId}`).then(response => {
    return response.data;
  });
}

export function deleteTask(context, taskId) {
  if (!taskId) {
    return Promise.resolve();
  }
  return client.delete(`/api/task/${taskId}`).then(response => {
    return response.data;
  });
}

// Temporarily using the old search endpoint. Only returns resources, not topics.
export function fetchResourceSearchResults(context, { searchTerm, searchTopics }) {
  if (!searchTerm || searchTerm.trim() === '') {
    return Promise.resolve();
  }
  const url = searchTopics ? '/api/search/topics' : '/api/search/items';
  return client
    .get(url, {
      params: {
        q: searchTerm,
        exclude_channel: context.rootState.currentChannel.currentChannelId,
      },
    })
    .then(response => {
      return response.data;
    });
}
