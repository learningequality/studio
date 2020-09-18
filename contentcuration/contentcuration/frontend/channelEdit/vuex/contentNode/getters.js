import flatMap from 'lodash/flatMap';
import sortBy from 'lodash/sortBy';
import uniq from 'lodash/uniq';
import uniqBy from 'lodash/uniqBy';

import { validateNodeDetails, validateNodeFiles } from '../../utils';
import { isSuccessor } from 'shared/utils';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';

function sorted(nodes) {
  return sortBy(nodes, ['lft']);
}

export function getContentNode(state) {
  return function(contentNodeId) {
    let node = state.contentNodesMap[contentNodeId];
    if (node) {
      let thumbnail_encoding = JSON.parse(node.thumbnail_encoding || '{}');
      return {
        ...node,
        thumbnail_encoding,
      };
    }
  };
}

export function getContentNodeDescendants(state, getters) {
  return function(contentNodeId) {
    // First find the immediate children of the target tree node
    return getters.getContentNodeChildren(contentNodeId).reduce((descendants, contentNode) => {
      // Then recursively call ourselves again for each child, so for this structure:
      // (target)
      //  > (child-1)
      //     > (grandchild-1)
      //  > (child-2)
      //
      // it should map out to: [(child-1), (grandchild-1), (child-2)]
      descendants.push(contentNode, ...getters.getContentNodeDescendants(contentNode.id));
      return descendants;
    }, []);
  };
}

export function hasChildren(state) {
  return function(id) {
    return getContentNode(state)(id).total_count > 0;
  };
}

export function countContentNodeDescendants(state, getters) {
  return function(contentNodeId) {
    return getters.getContentNodeDescendants(contentNodeId).length;
  };
}

export function getContentNodes(state) {
  return function(contentNodeIds) {
    return sorted(contentNodeIds.map(id => getContentNode(state)(id)).filter(node => node));
  };
}

export function getTopicAndResourceCounts(state) {
  return function(contentNodeIds) {
    return getContentNodes(state)(contentNodeIds).reduce(
      (totals, node) => {
        const isTopic = node.kind === ContentKindsNames.TOPIC;
        const subtopicCount = node.total_count - node.resource_count;
        const resourceCount = isTopic ? node.resource_count : 1;
        const topicCount = isTopic ? 1 : 0;
        return {
          topicCount: totals.topicCount + topicCount + subtopicCount,
          resourceCount: totals.resourceCount + resourceCount,
        };
      },
      { topicCount: 0, resourceCount: 0 }
    );
  };
}

export function getContentNodeChildren(state) {
  return function(contentNodeId) {
    return sorted(
      Object.values(state.contentNodesMap)
        .filter(contentNode => contentNode.parent === contentNodeId)
        .map(node => getContentNode(state)(node.id))
        .filter(Boolean)
    );
  };
}

export function getContentNodeAncestors(state) {
  return function(id, includeSelf = false) {
    let node = getContentNode(state)(id);

    if (!node || !node.parent) {
      return [node].filter(Boolean);
    }

    const self = includeSelf ? [node] : [];
    return getContentNodeAncestors(state)(node.parent, true).concat(self);
  };
}

export function getContentNodeIsValid(state, getters, rootState, rootGetters) {
  return function(contentNodeId) {
    const contentNode = state.contentNodesMap[contentNodeId];
    return (
      contentNode &&
      (contentNode.isNew ||
        (getContentNodeDetailsAreValid(state)(contentNodeId) &&
          getContentNodeFilesAreValid(state, getters, rootState, rootGetters)(contentNodeId) &&
          rootGetters['assessmentItem/getAssessmentItemsAreValid']({
            contentNodeId,
            ignoreNew: true,
          })))
    );
  };
}

export function getContentNodeDetailsAreValid(state) {
  return function(contentNodeId) {
    const contentNode = state.contentNodesMap[contentNodeId];
    return contentNode && (contentNode.isNew || !validateNodeDetails(contentNode).length);
  };
}

export function getContentNodeFilesAreValid(state, getters, rootState, rootGetters) {
  return function(contentNodeId) {
    const contentNode = state.contentNodesMap[contentNodeId];
    if (contentNode && contentNode.kind !== ContentKindsNames.TOPIC) {
      let files = rootGetters['file/getContentNodeFiles'](contentNode.id);
      if (files.length) {
        // Don't count errors before files have loaded
        return !validateNodeFiles(files).length;
      } else {
        return false;
      }
    }
    return true;
  };
}

function getStepDetail(state, contentNodeId) {
  const stepDetail = {
    id: contentNodeId,
    title: '',
    kind: '',
    parentTitle: '',
  };

  const node = getContentNode(state)(contentNodeId);

  if (!node) {
    return stepDetail;
  }

  stepDetail.title = node.title;
  stepDetail.kind = node.kind;

  const parentNodeId = state.contentNodesMap[contentNodeId].parent;

  if (parentNodeId) {
    const parentNode = getContentNode(state)(parentNodeId);
    stepDetail.parentTitle = parentNode.title;
  }

  return stepDetail;
}

/* eslint-disable no-unused-vars */
function getImmediatePreviousStepsIds(state) {
  return function(contentNodeId) {
    return state.nextStepsMap
      .filter(([_, nextStepId]) => nextStepId === contentNodeId)
      .map(([targetId]) => targetId);
  };
}

function getImmediateNextStepsIds(state) {
  return function(contentNodeId) {
    return state.nextStepsMap
      .filter(([targetId]) => targetId === contentNodeId)
      .map(([_, nextStepId]) => nextStepId);
  };
}
/* eslint-enable no-unused-vars */

/**
 * Return a list of immediate previous steps of a node
 * where a step has following interface:
 * { id, title, kind, parentTitle }
 */
export function getImmediatePreviousStepsList(state) {
  return function(contentNodeId) {
    return getImmediatePreviousStepsIds(state)(contentNodeId).map(stepId =>
      getStepDetail(state, stepId)
    );
  };
}

/**
 * Return a list of immediate next steps of a node
 * where a step has following interface:
 * { id, title, kind, parentTitle }
 */
export function getImmediateNextStepsList(state) {
  return function(contentNodeId) {
    return getImmediateNextStepsIds(state)(contentNodeId).map(stepId =>
      getStepDetail(state, stepId)
    );
  };
}

/**
 * Return count of immediate previous and next steps
 * of a node.
 */
export function getImmediateRelatedResourcesCount(state) {
  return function(contentNodeId) {
    const previousStepsCount = getImmediatePreviousStepsIds(state)(contentNodeId).length;
    const nextStepsCount = getImmediateNextStepsIds(state)(contentNodeId).length;

    return previousStepsCount + nextStepsCount;
  };
}

/**
 * Does a node belongs to next steps of a root node?
 */
export function isNextStep(state) {
  return function({ rootNodeId, nodeId }) {
    return isSuccessor({
      rootVertex: rootNodeId,
      vertexToCheck: nodeId,
      graph: state.nextStepsMap,
    });
  };
}

/**
 * Does a node belongs to previous steps of a root node?
 */
export function isPreviousStep(state) {
  return function({ rootNodeId, nodeId }) {
    return isNextStep(state)({
      rootNodeId: nodeId,
      nodeId: rootNodeId,
    });
  };
}

function uniqListByKey(state, key) {
  return uniqBy(Object.values(state.contentNodesMap), key)
    .map(node => node[key])
    .filter(node => node);
}

export function authors(state) {
  return uniqListByKey(state, 'author');
}

export function providers(state) {
  return uniqListByKey(state, 'provider');
}

export function aggregators(state) {
  return uniqListByKey(state, 'aggregator');
}

export function copyrightHolders(state) {
  return uniqListByKey(state, 'copyright_holder');
}

export function tags(state) {
  return uniq(flatMap(Object.values(state.contentNodesMap), node => node['tags']).filter(t => t));
}

export function nodeExpanded(state) {
  return function(id) {
    return Boolean(state.expandedNodes[id]);
  };
}
