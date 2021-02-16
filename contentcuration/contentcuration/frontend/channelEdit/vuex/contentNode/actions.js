import flatMap from 'lodash/flatMap';
import flatten from 'lodash/flatten';
import uniq from 'lodash/uniq';
import { NEW_OBJECT, NOVALUE } from 'shared/constants';
import client from 'shared/client';
import { RELATIVE_TREE_POSITIONS, CHANGES_TABLE, TABLE_NAMES } from 'shared/data/constants';
import { ContentNode } from 'shared/data/resources';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
import { findLicense } from 'shared/utils/helpers';
import { RolesNames } from 'shared/leUtils/Roles';
import { isNodeComplete } from 'shared/utils/validation';

import db from 'shared/data/db';

export function loadContentNodes(context, params = {}) {
  return ContentNode.where(params).then(contentNodes => {
    context.commit('ADD_CONTENTNODES', contentNodes);
    return contentNodes;
  });
}

// Makes a HEAD request to the contentnode api just to see if exists
export function headContentNode(context, id) {
  return ContentNode.headModel(id);
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

export function loadContentNodeByNodeId(context, nodeId) {
  const channelId = context.rootState.currentChannel.currentChannelId;
  return loadContentNodes(context, { '[node_id+channel_id]__in': [[nodeId, channelId]] })
    .then(contentNodes => contentNodes[0])
    .then(contentNode => {
      context.commit('ADD_CONTENTNODE', contentNode);
      return contentNode;
    })
    .catch(() => {
      return;
    });
}

export function loadChildren(context, { parent }) {
  return loadContentNodes(context, { parent });
}

export function loadAncestors(context, { id }) {
  return ContentNode.getAncestors(id).then(contentNodes => {
    context.commit('ADD_CONTENTNODES', contentNodes);
    return contentNodes;
  });
}

/**
 * Retrieve related resources of a node from API.
 * Save all previous/next steps (pre/post-requisites)
 * to vuex state
 * Fetch and save data of immediate related resources
 * and their parents
 */
export function loadRelatedResources(context, nodeId) {
  if (!nodeId) {
    throw ReferenceError('node id must be defined to load its related resources');
  }
  return ContentNode.getRequisites(nodeId).then(data => {
    const mappings = data;
    context.commit('SAVE_NEXT_STEPS', {
      mappings,
    });
    const nodeIds = uniq(flatMap(data, d => [d.target_node, d.prerequisite]));
    if (nodeIds.length) {
      return context.dispatch('loadContentNodes', { id__in: nodeIds }).then(nodes => {
        const parents = uniq(nodes.map(n => n.parent)).filter(Boolean);
        if (parents.length) {
          return context.dispatch('loadContentNodes', { id__in: parents }).then(() => {
            return data;
          });
        }
        return data;
      });
    }
    return data;
  });
}

/**
 * Remove a previous step from a target content node.
 *
 * @param {String} targetId ID of a target content node.
 * @param {String} previousStepId ID of a content node to be removed
 *                                from target's content node previous steps.
 */
export function removePreviousStepFromNode(context, { targetId, previousStepId }) {
  context.commit('REMOVE_PREVIOUS_STEP', { target_node: targetId, prerequisite: previousStepId });
  return ContentNode.removePrerequisite(targetId, previousStepId);
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
export function addPreviousStepToNode(context, { targetId, previousStepId }) {
  context.commit('ADD_PREVIOUS_STEP', { target_node: targetId, prerequisite: previousStepId });
  return ContentNode.addPrerequisite(targetId, previousStepId);
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
export function createContentNode(context, { parent, kind, ...payload }) {
  if (!kind) {
    throw ReferenceError('Must specify a kind to create a content node');
  }
  const session = context.rootState.session;

  const channel = context.rootGetters['currentChannel/currentChannel'];
  let contentDefaults = Object.assign({}, channel.content_defaults);

  if (kind === ContentKindsNames.TOPIC) {
    // Topics shouldn't have license, language or copyright info assigned.
    contentDefaults = {};
  } else {
    // content_defaults for historical reason has stored the license as a string constant,
    // but the serializers and frontend now use the license ID. So make sure that we pass
    // a license ID when we create the content node.
    contentDefaults.license = findLicense(contentDefaults.license, { id: null }).id;
  }
  const contentNodeData = {
    title: '',
    description: '',
    kind,
    tags: {},
    extra_fields: {},
    [NEW_OBJECT]: true,
    total_count: 0,
    resource_count: 0,
    complete: false,
    changed: true,
    language: session.preferences ? session.preferences.language : session.currentLanguage,
    parent,
    ...contentDefaults,
    role_visibility: contentDefaults.role_visibility || RolesNames.LEARNER,
    ...payload,
  };

  contentNodeData.complete = isNodeComplete({
    nodeDetails: contentNodeData,
    assessmentItems: [],
    files: [],
  });
  return ContentNode.put(contentNodeData).then(id => {
    context.commit('ADD_CONTENTNODE', {
      id,
      ...contentNodeData,
    });
    return id;
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
  complete = NOVALUE,
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
    contentNodeData.extra_fields = contentNodeData.extra_fields || {};
    if (extra_fields.mastery_model) {
      contentNodeData.extra_fields.mastery_model = extra_fields.mastery_model;
    }
    if (extra_fields.m) {
      contentNodeData.extra_fields.m = extra_fields.m;
    }
    if (extra_fields.n) {
      contentNodeData.extra_fields.n = extra_fields.n;
    }
    if (extra_fields.randomize !== undefined) {
      contentNodeData.extra_fields.randomize = extra_fields.randomize;
    }
  }
  if (prerequisite !== NOVALUE) {
    contentNodeData.prerequisite = prerequisite;
  }
  if (complete !== NOVALUE) {
    contentNodeData.complete = complete;
  }
  if (Object.keys(contentNodeData).length) {
    contentNodeData.changed = true;
  }

  return contentNodeData;
}

export function updateContentNode(context, { id, ...payload } = {}) {
  if (!id) {
    throw ReferenceError('id must be defined to update a contentNode');
  }
  let contentNodeData = generateContentNodeData(payload);

  const node = context.getters.getContentNode(id);

  // Don't overwrite existing extra_fields data
  if (contentNodeData.extra_fields) {
    contentNodeData = {
      ...contentNodeData,
      extra_fields: {
        ...(node.extra_fields || {}),
        ...(contentNodeData.extra_fields || {}),
      },
    };
  }

  const newNode = {
    ...node,
    ...contentNodeData,
  };
  const complete = isNodeComplete({
    nodeDetails: newNode,
    assessmentItems: context.rootGetters['assessmentItem/getAssessmentItems'](id),
    files: context.rootGetters['file/getContentNodeFiles'](id),
  });
  contentNodeData = {
    ...contentNodeData,
    complete,
  };

  context.commit('UPDATE_CONTENTNODE', { id, ...contentNodeData });
  return ContentNode.update(id, contentNodeData);
}

export function addTags(context, { ids, tags }) {
  return Promise.all(
    ids.map(id => {
      const updates = {};
      for (let tag of tags) {
        context.commit('ADD_TAG', { id, tag });
        updates[`tags.${tag}`] = true;
      }
      return ContentNode.update(id, updates);
    })
  );
}

export function removeTags(context, { ids, tags }) {
  return Promise.all(
    ids.map(id => {
      const updates = {};
      for (let tag of tags) {
        context.commit('REMOVE_TAG', { id, tag });
        updates[`tags.${tag}`] = undefined;
      }
      return ContentNode.update(id, updates);
    })
  );
}

export function deleteContentNode(context, contentNodeId) {
  return ContentNode.delete(contentNodeId).then(() => {
    context.commit('REMOVE_CONTENTNODE', { id: contentNodeId });
  });
}

export function deleteContentNodes(context, contentNodeIds) {
  return Promise.all(
    contentNodeIds.map(id => {
      return deleteContentNode(context, id);
    })
  );
}

export function copyContentNode(
  context,
  { id, target, position = RELATIVE_TREE_POSITIONS.LAST_CHILD, excluded_descendants = null } = {}
) {
  // First, this will parse the tree and create the copy the local tree nodes,
  // with a `source_id` of the source node then create the content node copies
  return ContentNode.copy(id, target, position, excluded_descendants).then(node => {
    context.commit('ADD_CONTENTNODE', node);
  });
}

export function copyContentNodes(
  context,
  { id__in, target, position = RELATIVE_TREE_POSITIONS.LAST_CHILD }
) {
  return Promise.all(
    id__in.map(id => context.dispatch('copyContentNode', { id, target, position }))
  );
}

const PARENT_POSITIONS = [RELATIVE_TREE_POSITIONS.FIRST_CHILD, RELATIVE_TREE_POSITIONS.LAST_CHILD];
export function moveContentNodes(
  context,
  { id__in, parent, target = null, position = RELATIVE_TREE_POSITIONS.LAST_CHILD }
) {
  // Make sure use of parent vs target matches position param
  if (parent && !(PARENT_POSITIONS.indexOf(position) >= 0)) {
    return Promise.reject(new Error('Invalid position for parent move'));
  }

  if (!target) {
    target = parent;
  }

  return Promise.all(
    id__in.map(id => {
      return ContentNode.move(id, target, position).then(node => {
        context.commit('UPDATE_CONTENTNODE', node);
        return id;
      });
    })
  );
}

export function loadNodeDetails(context, nodeId) {
  return client.get(window.Urls.get_node_details(nodeId)).then(response => {
    return response.data;
  });
}

// Actions to check indexeddb saving status
export function checkSavingProgress(
  context,
  { contentNodeIds = [], fileIds = [], assessmentIds = [] }
) {
  const promises = [];
  promises.push(
    contentNodeIds.map(nodeId =>
      db[CHANGES_TABLE].where({ '[table+key]': [TABLE_NAMES.CONTENTNODE, nodeId] }).first()
    )
  );
  promises.push(
    fileIds.map(fileId =>
      db[CHANGES_TABLE].where({ '[table+key]': [TABLE_NAMES.FILE, fileId] }).first()
    )
  );
  promises.push(
    assessmentIds.map(assessmentItemId =>
      db[CHANGES_TABLE].where({
        '[table+key]': [TABLE_NAMES.ASSESSMENTITEM, assessmentItemId],
      }).first()
    )
  );

  return Promise.all(flatten(promises)).then(results => {
    return results.some(Boolean);
  });
}
