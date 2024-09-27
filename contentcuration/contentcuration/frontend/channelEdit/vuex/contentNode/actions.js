import flatMap from 'lodash/flatMap';
import uniq from 'lodash/uniq';
import isEmpty from 'lodash/isEmpty';
import { NEW_OBJECT, NOVALUE, DescendantsUpdatableFields } from 'shared/constants';
import client from 'shared/client';
import {
  RELATIVE_TREE_POSITIONS,
  CHANGES_TABLE,
  TABLE_NAMES,
  COPYING_STATUS,
  COPYING_STATUS_VALUES,
} from 'shared/data/constants';
import { ContentNode } from 'shared/data/resources';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
import { findLicense, getMergedMapFields } from 'shared/utils/helpers';
import { RolesNames } from 'shared/leUtils/Roles';
import { isNodeComplete } from 'shared/utils/validation';
import * as publicApi from 'shared/data/public';

import db from 'shared/data/db';

export function loadContentNodes(context, params = {}) {
  return ContentNode.where(params).then(response => {
    const contentNodes = response.results ? response.results : response;
    context.commit('ADD_CONTENTNODES', contentNodes);
    return response;
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

/**
 * @param context
 * @param {string} id
 * @param {string} nodeId - Note: this is `node_id` not `id`
 * @param {string} rootId
 * @param {string} parent - The `id` not `node_id` of the parent
 * @return {Promise<{}>}
 */
export async function loadPublicContentNode(context, { id, nodeId, rootId, parent }) {
  const publicNode = await publicApi.getContentNode(nodeId);
  const localNode = publicApi.convertContentNodeResponse(id, rootId, parent, publicNode);
  context.commit('ADD_CONTENTNODE', localNode);
  return localNode;
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

export function loadChildren(context, { parent, published = null, complete = null }) {
  const params = { parent, max_results: 25 };
  if (published !== null) {
    params.published = published;
  }
  if (complete !== null) {
    params.complete = complete;
  }
  return loadContentNodes(context, params);
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
    accessibility_labels: {},
    grade_levels: {},
    learner_needs: {},
    learning_activities: {},
    categories: {},
    suggested_duration: 0,
    channel_id: channel.id,
    ...payload,
  };

  contentNodeData.complete = isNodeComplete({
    nodeDetails: contentNodeData,
    assessmentItems: [],
    files: [],
  });
  return ContentNode.add(contentNodeData).then(id => {
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
  accessibility_labels = NOVALUE,
  grade_levels = NOVALUE,
  learner_needs = NOVALUE,
  learning_activities = NOVALUE,
  categories = NOVALUE,
  suggested_duration = NOVALUE,
  [COPYING_STATUS]: copy_status_value = NOVALUE,
} = {}) {
  const contentNodeData = {};
  if (copy_status_value !== NOVALUE) {
    contentNodeData[COPYING_STATUS] = copy_status_value;
  }
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
  /*
   * New metadata fields
   */
  if (accessibility_labels !== NOVALUE) {
    contentNodeData.accessibility_labels = accessibility_labels;
  }
  if (grade_levels !== NOVALUE) {
    contentNodeData.grade_levels = grade_levels;
  }
  if (learner_needs !== NOVALUE) {
    contentNodeData.learner_needs = learner_needs;
  }
  if (learning_activities !== NOVALUE) {
    contentNodeData.learning_activities = learning_activities;
  }
  if (categories !== NOVALUE) {
    contentNodeData.categories = categories;
  }
  if (suggested_duration !== NOVALUE) {
    contentNodeData.suggested_duration = suggested_duration;
  }
  if (extra_fields !== NOVALUE) {
    contentNodeData.extra_fields = contentNodeData.extra_fields || {};
    if (extra_fields.randomize !== undefined) {
      contentNodeData.extra_fields.randomize = extra_fields.randomize;
    }
    if (extra_fields.options) {
      contentNodeData.extra_fields.options = extra_fields.options;
    }
    if (extra_fields.suggested_duration_type) {
      contentNodeData.extra_fields.suggested_duration_type = extra_fields.suggested_duration_type;
    }
    if (extra_fields.inherited_metadata) {
      contentNodeData.extra_fields.inherited_metadata = { ...extra_fields.inherited_metadata };
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

export function updateContentNode(
  context,
  { id, mergeMapFields, checkComplete = false, ...payload } = {}
) {
  if (!id) {
    throw ReferenceError('id must be defined to update a contentNode');
  }
  if (isEmpty(payload)) {
    return Promise.resolve();
  }
  let contentNodeData = generateContentNodeData(payload);

  const node = context.getters.getContentNode(id);

  // Don't overwrite existing extra_fields data
  if (contentNodeData.extra_fields) {
    const extraFields = node.extra_fields || {};

    // Don't overwrite existing options data
    if (contentNodeData.extra_fields.options) {
      contentNodeData.extra_fields.options = {
        ...(extraFields.options || {}),
        ...contentNodeData.extra_fields.options,
      };
    }

    if (contentNodeData.extra_fields.inherited_metadata) {
      // Don't set inherited_metadata on non-topic nodes
      // as they cannot have children to bequeath metadata to
      if (node.kind !== ContentKindsNames.TOPIC) {
        delete contentNodeData.extra_fields.inherited_metadata;
      }
    }

    contentNodeData = {
      ...contentNodeData,
      extra_fields: {
        ...extraFields,
        ...contentNodeData.extra_fields,
      },
    };
  }

  if (mergeMapFields) {
    contentNodeData = {
      ...contentNodeData,
      ...getMergedMapFields(node, contentNodeData),
    };
  }

  if (checkComplete) {
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
  }

  context.commit('ADD_CONTENTNODE', { id, ...contentNodeData });
  return ContentNode.update(id, contentNodeData);
}

/**
 * Update a content node and all its descendants with the given payload.
 * @param {*} context
 * @param {string} param.id Id of the parent content to edit. It must be a topic.
 */
export function updateContentNodeDescendants(context, { id, ...payload } = {}) {
  if (!id) {
    throw ReferenceError('id must be defined to update a contentNode and its descendants');
  }

  const node = context.getters.getContentNode(id);
  if (!node || node.kind !== ContentKindsNames.TOPIC) {
    throw TypeError('Only topics can have descendants');
  }

  for (const field in payload) {
    if (!DescendantsUpdatableFields.includes(field)) {
      throw TypeError(`Cannot update field ${field} on all descendants`);
    }
  }

  const contentNodeData = generateContentNodeData(payload);

  const descendants = context.getters.getContentNodeDescendants(id);
  const contentNodes = [node, ...descendants];

  const contentNodesData = contentNodes.map(contentNode => ({
    id: contentNode.id,
    ...contentNodeData,
    ...getMergedMapFields(contentNode, contentNodeData),
  }));

  context.commit('ADD_CONTENTNODES', contentNodesData);
  return ContentNode.updateDescendants(id, contentNodeData);
}

export function addTags(context, { ids, tags }) {
  return Promise.all(
    ids.map(id => {
      const updates = {};
      for (const tag of tags) {
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
      for (const tag of tags) {
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

export function waitForCopyingStatus(context, { contentNodeId, startingRev }) {
  return ContentNode.waitForCopying(contentNodeId, startingRev).catch(e => {
    context.dispatch('updateContentNode', {
      id: contentNodeId,
      [COPYING_STATUS]: COPYING_STATUS_VALUES.FAILED,
    });
    return Promise.reject(e);
  });
}

export function copyContentNode(
  context,
  {
    id,
    target,
    position = RELATIVE_TREE_POSITIONS.LAST_CHILD,
    excluded_descendants = null,
    sourceNode = null,
  } = {}
) {
  // First, this will parse the tree and create the copy the local tree nodes,
  // with a `source_id` of the source node then create the content node copies
  return ContentNode.copy(id, target, position, excluded_descendants, sourceNode).then(node => {
    context.commit('ADD_CONTENTNODE', node);
    context.commit('ADD_INHERITING_NODE', node);
    setContentNodesCount(context, [node]);
    return node;
  });
}

export function copyContentNodes(
  context,
  { id__in, target, position = RELATIVE_TREE_POSITIONS.LAST_CHILD, sourceNodes = null }
) {
  return Promise.all(
    id__in.map(id => {
      let sourceNode = null;
      if (sourceNodes) {
        sourceNode = sourceNodes.find(n => n.id === id);
      }
      return context.dispatch('copyContentNode', { id, target, position, sourceNode });
    })
  );
}

const PARENT_POSITIONS = [RELATIVE_TREE_POSITIONS.FIRST_CHILD, RELATIVE_TREE_POSITIONS.LAST_CHILD];
export function moveContentNodes(
  context,
  { id__in, parent, target = null, position = RELATIVE_TREE_POSITIONS.LAST_CHILD, inherit = true }
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
        context.commit('ADD_CONTENTNODE', node);
        if (inherit) {
          context.commit('ADD_INHERITING_NODE', node);
        }
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
export async function checkSavingProgress(
  context,
  { contentNodeIds = [], fileIds = [], assessmentIds = [] }
) {
  if (!contentNodeIds.length && !fileIds.length && !assessmentIds.length) {
    return false;
  }
  const idsToCheck = {
    [TABLE_NAMES.CONTENTNODE]: contentNodeIds,
    [TABLE_NAMES.FILE]: fileIds,
    [TABLE_NAMES.ASSESSMENTITEM]: assessmentIds,
  };
  const query = await db[CHANGES_TABLE].toCollection()
    .filter(c => !c.synced && idsToCheck[c.table] && idsToCheck[c.table].includes(c.key))
    .first();
  return Boolean(query);
}

export function setQuickEditModal(context, open) {
  context.commit('SET_QUICK_EDIT_MODAL', open);
}

export function setContentNodesCount(context, nodes) {
  for (const node of nodes) {
    const { id, assessment_item_count, resource_count } = node;
    context.commit('SET_CONTENTNODES_COUNT', { id, resource_count, assessment_item_count });
  }
}

export function removeContentNodes(context, { parentId }) {
  return new Promise(resolve => {
    context.commit('REMOVE_CONTENTNODES_BY_PARENT', parentId);
    resolve(true);
  });
}
