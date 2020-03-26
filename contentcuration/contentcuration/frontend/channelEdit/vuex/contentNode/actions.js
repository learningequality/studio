import difference from 'lodash/difference';
import union from 'lodash/union';
import { sanitizeFiles } from '../file/utils';
import { NOVALUE } from 'shared/constants';
import client from 'shared/client';
import { MOVE_POSITIONS } from 'shared/data/constants';
import { ContentNode, Tree, File } from 'shared/data/resources';

export function loadContentNodes(context, params = {}) {
  return ContentNode.where(params).then(contentNodes => {
    context.commit('ADD_CONTENTNODES', contentNodes);
    return contentNodes;
  });
}

export function loadContentNode(context, id) {
  return ContentNode.get(id)
    .then(contentNode => {
      context.commit('ADD_CONTENTNODE', contentNode);
      return contentNode;
    })
    .catch(() => {
      return;
    });
}

export function loadTree(context, channel_id) {
  return Tree.where({ channel_id }).then(nodes => {
    context.commit('ADD_TREENODES', nodes);
  });
}

export function loadChildren(context, { parent, channel_id }) {
  return Tree.where({ parent, channel_id }).then(nodes => {
    return loadContentNodes(context, { ids: nodes.map(node => node.id) });
  });
}

export function loadAncestors(context, { id, channel_id }) {
  let node = context.state.treeNodesMap[id];
  return Tree.where({ max_lft: node.sort_order, min_rght: node.rght, channel_id }).then(nodes => {
    return loadContentNodes(context, { ids: nodes.map(node => node.id) });
  });
}

/**
 * Retrieve related resources of a node from API.
 * Save all previous/next steps (pre/post-requisites)
 * to next steps map.
 * Fetch and save data of immediate related resources
 * and their parents.
 */
export async function loadRelatedResources(context, nodeId) {
  if (!nodeId) {
    throw ReferenceError('node id must be defined to load its related resources');
  }

  let response;

  try {
    response = await client.get(window.Urls['get_prerequisites']('true', nodeId));
  } catch (error) {
    return Promise.reject(error);
  }

  const prerequisite_tree_nodes = response.data.prerequisite_tree_nodes;
  const prerequisite_mapping = response.data.prerequisite_mapping;
  const postrequisite_mapping = response.data.postrequisite_mapping;

  context.commit('SAVE_NEXT_STEPS', {
    nodeId,
    prerequisite_mapping,
    postrequisite_mapping,
  });

  // Ids of immediate previous/next steps
  let relatedNodesIds = [
    ...Object.keys(prerequisite_mapping),
    ...Object.keys(postrequisite_mapping),
  ];
  // + ids of their parent nodes
  prerequisite_tree_nodes.forEach(node => {
    if (relatedNodesIds.includes(node.id)) {
      relatedNodesIds.push(node.parent);
    }
  });
  // remove duplicate ids if any
  relatedNodesIds = [...new Set(relatedNodesIds)];

  // Make sure that client has all related nodes data available
  try {
    await loadContentNodes(context, { ids: relatedNodesIds });
  } catch (error) {
    return Promise.reject(error);
  }

  return Promise.resolve();
}

/**
 * Remove a previous step from a target content node.
 *
 * @param {String} targetId ID of a target content node.
 * @param {String} previousStepId ID of a content node to be removed
 *                                from target's content node previous steps.
 */
export function removePreviousStepFromNode(context, { targetId, previousStepId }) {
  const targetNode = context.state.contentNodesMap[targetId];
  const targetNodePreviousSteps = targetNode.prerequisite
    ? targetNode.prerequisite.filter(id => id !== previousStepId)
    : [];

  context.commit('REMOVE_PREVIOUS_STEP', { targetId, previousStepId });
  context.commit('UPDATE_CONTENTNODE', {
    id: targetId,
    ...{ prerequisite: targetNodePreviousSteps },
  });

  ContentNode.update(targetId, { prerequisite: targetNodePreviousSteps });

  // (re)load the previous step node to be sure that we have its
  // `is_prerequisite_of` field up-to-date on client
  loadContentNode(context, previousStepId);
}

/**
 * Remove a next step from a target content node.
 *
 * @param {String} targetId ID of a target content node.
 * @param {String} nextStepId ID of a content node to be removed
 *                            from target's content node next steps.
 */
export function removeNextStepFromNode(context, { targetId, nextStepId }) {
  removePreviousStepFromNode(context, {
    targetId: nextStepId,
    previousStepId: targetId,
  });
}

/**
 * Add a previous step to a target content node.
 *
 * @param {String} targetId ID of a target content node.
 * @param {String} previousStepId ID of a content node to be added
 *                                to target's content node previous steps.
 */
export async function addPreviousStepToNode(context, { targetId, previousStepId }) {
  const targetNode = context.state.contentNodesMap[targetId];
  const targetNodePreviousSteps = targetNode.prerequisite || [];

  if (!targetNodePreviousSteps.includes(previousStepId)) {
    targetNodePreviousSteps.push(previousStepId);
  }

  await updateContentNode(context, {
    id: targetId,
    prerequisite: targetNodePreviousSteps,
  });

  // (re)load the previous step node to be sure that we have its
  // `is_prerequisite_of` field up-to-date on client
  loadContentNode(context, previousStepId);

  context.commit('ADD_PREVIOUS_STEP', { targetId, previousStepId });
}

/**
 * Add a next step to a target content node.
 *
 * @param {String} targetId ID of a target content node.
 * @param {String} nextStepId ID of a content node to be added
 *                            to target's content node next steps.
 */
export function addNextStepToNode(context, { targetId, nextStepId }) {
  addPreviousStepToNode(context, {
    targetId: nextStepId,
    previousStepId: targetId,
  });
}

/* CONTENTNODE EDITOR ACTIONS */
export function createContentNode(context, { parent, kind = 'topic', ...payload }) {
  const session = context.rootState.session;
  const contentNodeData = {
    title: '',
    description: '',
    kind,
    files: [],
    prerequisite: [],
    assessment_items: [],
    extra_fields: {},
    isNew: true,
    language: session.preferences ? session.preferences.language : session.currentLanguage,
    ...context.rootGetters['currentChannel/currentChannel'].content_defaults,
    ...payload,
  };

  return ContentNode.put(contentNodeData).then(id => {
    // Add files to content node
    contentNodeData.files.forEach(file => {
      context.dispatch('file/updateFile', { id: file, contentnode: id }, { root: true });
    });

    return Tree.move(id, parent, MOVE_POSITIONS.LAST_CHILD).then(treeNode => {
      context.commit('ADD_CONTENTNODE', {
        id,
        ...contentNodeData,
      });

      context.commit('ADD_TREENODE', treeNode);
      return id;
    });
  });
}

function generateContentNodeData({
  title = NOVALUE,
  description = NOVALUE,
  thumbnail_encoding = NOVALUE,
  language = NOVALUE,
  license = NOVALUE,
  license_description = NOVALUE,
  copyright_holder = NOVALUE,
  author = NOVALUE,
  role_visibility = NOVALUE,
  aggregator = NOVALUE,
  provider = NOVALUE,
  extra_fields = NOVALUE,
  prerequisite = NOVALUE,
} = {}) {
  const contentNodeData = {};
  if (title !== NOVALUE) {
    contentNodeData.title = title;
  }
  if (description !== NOVALUE) {
    contentNodeData.description = description;
  }
  if (thumbnail_encoding !== NOVALUE) {
    contentNodeData.thumbnail_encoding = JSON.stringify(thumbnail_encoding);
  }
  if (language !== NOVALUE) {
    contentNodeData.language = language;
  }
  if (license !== NOVALUE) {
    contentNodeData.license = license;
  }
  if (license_description !== NOVALUE) {
    contentNodeData.license_description = license_description;
  }
  if (copyright_holder !== NOVALUE) {
    contentNodeData.copyright_holder = copyright_holder;
  }
  if (author !== NOVALUE) {
    contentNodeData.author = author;
  }
  if (role_visibility !== NOVALUE) {
    contentNodeData.role_visibility = role_visibility;
  }
  if (aggregator !== NOVALUE) {
    contentNodeData.aggregator = aggregator;
  }
  if (provider !== NOVALUE) {
    contentNodeData.provider = provider;
  }
  if (extra_fields !== NOVALUE) {
    if (extra_fields.mastery_model) {
      contentNodeData.extra_fields.mastery_model = extra_fields.mastery_model;
    }
    if (extra_fields.m) {
      contentNodeData.extra_fields.m = extra_fields.m;
    }
    if (extra_fields.n) {
      contentNodeData.extra_fields.n = extra_fields.n;
    }
    if (extra_fields.randomize) {
      contentNodeData.extra_fields.randomize = extra_fields.randomize;
    }
  }
  if (prerequisite !== NOVALUE) {
    contentNodeData.prerequisite = prerequisite;
  }

  return contentNodeData;
}

export function updateContentNode(context, { id, ...payload } = {}) {
  if (!id) {
    throw ReferenceError('id must be defined to update a contentNode');
  }
  const contentNodeData = generateContentNodeData(payload);
  context.commit('UPDATE_CONTENTNODE', { id, ...contentNodeData });
  return ContentNode.update(id, contentNodeData);
}

export function updateContentNodes(context, { ids, ...payload } = {}) {
  if (!ids) {
    throw ReferenceError('ids must be defined to update contentNodes');
  }
  if (!Array.isArray(ids)) {
    throw TypeError('ids must be an array of ids');
  }
  const contentNodeData = generateContentNodeData(payload);
  context.commit('UPDATE_CONTENTNODES', { ids, ...contentNodeData });
  return ContentNode.modifyByIds(ids, contentNodeData);
}

export function addTags(context, { ids, tags }) {
  return ids.map(id => {
    const newTags = union(context.state.contentNodesMap[id].tags, tags);
    context.commit('SET_TAGS', { id, tags: newTags });
    return ContentNode.update(id, { tags: newTags });
  });
}

export function removeTags(context, { ids, tags }) {
  return ids.map(id => {
    const newTags = difference(context.state.contentNodesMap[id].tags, tags);
    context.commit('SET_TAGS', { id, tags: newTags });
    return ContentNode.update(id, { tags: newTags });
  });
}

export function addFiles(context, { id, files }) {
  let node = context.state.contentNodesMap[id];
  let currentFiles = context.rootGetters['file/getFiles'](node.files);
  let newFiles = currentFiles.map(file => {
    // Replace files with matching preset and language
    let match = files.find(
      f =>
        f.preset.id === file.preset.id &&
        (!file.preset.multi_language || file.language.id === f.language.id)
    );
    if (match) {
      File.delete(file.id);
      return match.id;
    }
    return file.id;
  });

  // Add new files
  files.forEach(file => {
    if (!newFiles.includes(file.id)) newFiles.push(file.id);
  });

  // Set contentnode on new files
  newFiles.forEach(file => {
    context.dispatch('file/updateFile', { id: file, contentnode: id }, { root: true });
  });

  context.commit('SET_FILES', { id, files: newFiles });
  return ContentNode.update(id, { files: newFiles });
}

export function removeFiles(context, { id, files }) {
  let currentFiles = context.state.contentNodesMap[id].files;
  let newFiles = currentFiles.filter(fileID => {
    return !files.find(f => f.id === fileID);
  });
  files.forEach(file => File.delete(file.id));

  context.commit('SET_FILES', { id, files: newFiles });
  return ContentNode.update(id, { files: newFiles });
}

export function deleteContentNode(context, contentNodeId) {
  return ContentNode.delete(contentNodeId).then(() => {
    return Tree.delete(contentNodeId).then(() => {
      context.commit('REMOVE_CONTENTNODE', { id: contentNodeId });
      context.commit('REMOVE_TREENODE', { id: contentNodeId });
    });
  });
}

export function deleteContentNodes(context, contentNodeIds) {
  return Promise.all(
    contentNodeIds.map(id => {
      return deleteContentNode(context, id);
    })
  );
}

export function copyContentNodes(context, contentNodeIds) {
  // TODO: Implement copy nodes endpoint
  return new Promise(resolve => resolve(context, contentNodeIds));
}

export function moveContentNodes(context, { ids, parent }) {
  return Promise.all(
    ids.map(id => {
      return Tree.move(id, parent, MOVE_POSITIONS.LAST_CHILD).then(treeNode => {
        context.commit('UPDATE_TREENODE', treeNode);
        return id;
      });
    })
  );
}

export function moveContentNodesToClipboard(context, contentNodeIds) {
  // TODO: Implement move to clipboard action
  return new Promise(resolve => resolve(context, contentNodeIds));
}

export function sanitizeContentNodes(context, contentNodeIds, removeInvalid = false) {
  let promises = [];
  context.getters.getContentNodes(contentNodeIds).forEach(node => {
    let files = context.rootGetters['file/getFiles'](node.files);
    let validFiles = sanitizeFiles(files);
    if (
      removeInvalid &&
      !validFiles.filter(f => !f.preset.supplementary).length &&
      node.kind !== 'topic' &&
      node.kind !== 'exercise'
    ) {
      promises.push(context.dispatch('deleteContentNode', node.id));
    } else if (files.length !== validFiles.length) {
      // Remove uploading and failed files
      promises.push(
        context.dispatch('updateContentNode', { id: node.id, files: validFiles.map(f => f.id) })
      );
    }
  });
  return Promise.all(promises);
}
