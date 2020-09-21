import difference from 'lodash/difference';
import union from 'lodash/union';
import flatten from 'lodash/flatten';
import { NOVALUE } from 'shared/constants';
import client from 'shared/client';
import { RELATIVE_TREE_POSITIONS, CHANGES_TABLE, TABLE_NAMES } from 'shared/data/constants';
import { ContentNode } from 'shared/data/resources';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
import { findLicense, promiseChunk } from 'shared/utils';

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

  if (relatedNodesIds.length) {
    // Make sure that client has all related nodes data available
    try {
      await loadContentNodes(context, { id__in: relatedNodesIds });
    } catch (error) {
      return Promise.reject(error);
    }
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
export function createContentNode(context, { parent, kind = ContentKindsNames.TOPIC, ...payload }) {
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
    files: [],
    prerequisite: [],
    extra_fields: {},
    isNew: true,
    language: session.preferences ? session.preferences.language : session.currentLanguage,
    parent,
    ...contentDefaults,
    ...payload,
  };

  return ContentNode.put(contentNodeData).then(id => {
    // Add files to content node
    contentNodeData.files.forEach(file => {
      context.dispatch('file/updateFile', { id: file, contentnode: id }, { root: true });
    });
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
    if (extra_fields.type) {
      contentNodeData.extra_fields.type = extra_fields.type;
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
  { id, target, position = RELATIVE_TREE_POSITIONS.LAST_CHILD, deep = false, children = [] }
) {
  if (deep && children.length) {
    throw new TypeError('Cannot use deep and specify children');
  }
  // First, this will parse the tree and create the copy the local tree nodes,
  // with a `source_id` of the source node then create the content node copies
  return ContentNode.copy(id, target, position, deep).then(nodes => {
    context.commit('ADD_CONTENTNODES', nodes);

    return promiseChunk(nodes, 10, chunk => {
      // create a map of the source ID to the our new ID
      // this will help orchestrate file and assessessmentItem copying
      const nodeMap = chunk.reduce((nodeMap, node) => {
        if (node.source_id in nodeMap) {
          // I don't think this should happen
          throw new Error('Not implemented');
        }

        nodeMap[node.source_id] = node;
        return nodeMap;
      }, {});

      const contentnode__in = Object.keys(nodeMap);
      const updater = fileOrAssessment => {
        return {
          contentnode: nodeMap[fileOrAssessment.contentnode].id,
        };
      };

      return Promise.all([
        context.dispatch(
          'assessmentItem/copyAssessmentItems',
          {
            params: { contentnode__in },
            updater,
          },
          { root: true }
        ),
        context.dispatch(
          'file/copyFiles',
          {
            params: { contentnode__in },
            updater,
          },
          { root: true }
        ),
      ]);
    }).then(() => {
      if (children.length) {
        return Promise.all(
          children.map(child =>
            copyContentNode(context, {
              id: child.id,
              target: nodes[0].id,
              children: child.children,
            })
          )
        ).then(([childNodes]) => {
          return nodes.concat(childNodes);
        });
      }
      return nodes;
    });
  });
}

export function copyContentNodes(context, { id__in, target, deep = false }) {
  const position = RELATIVE_TREE_POSITIONS.LAST_CHILD;
  const chunkSize = deep ? 1 : 10;

  return promiseChunk(id__in, chunkSize, idChunk => {
    return Promise.all(
      idChunk.map(id => context.dispatch('copyContentNode', { id, target, position, deep }))
    );
  });
}

export function moveContentNodes(context, { id__in, parent: target }) {
  return Promise.all(
    id__in.map(id => {
      return ContentNode.move(id, target, RELATIVE_TREE_POSITIONS.LAST_CHILD).then(node => {
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
