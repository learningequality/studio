import flatMap from 'lodash/flatMap';
import sortBy from 'lodash/sortBy';
import uniq from 'lodash/uniq';
import uniqBy from 'lodash/uniqBy';

import messages from '../../translator';
import { parseNode } from './utils';
import { getNodeDetailsErrors, getNodeFilesErrors } from 'shared/utils/validation';
import { ContentKindsNames } from 'shared/leUtils/ContentKinds';
import { NEW_OBJECT } from 'shared/constants';
import { COPYING_STATUS, COPYING_STATUS_VALUES } from 'shared/data/constants';

function sorted(nodes) {
  return sortBy(nodes, ['lft']);
}

export function getContentNode(state, getters) {
  return function(contentNodeId) {
    const node = state.contentNodesMap[contentNodeId];
    if (node) {
      const children =
        node.kind === ContentKindsNames.TOPIC
          ? getters.getContentNodeChildren(contentNodeId)
          : null;
      return parseNode(node, children);
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

export function hasChildren(state, getters) {
  return function(id) {
    return getters.getContentNode(id).total_count > 0;
  };
}

/**
 * Whether the contentnode's interactivity should be disabled or not while copying?
 * When the contentnode is copying or the copying has failed, we need
 * to keep interactivity disabled. Hence, the FAILED condition is also there.
 */
export function isNodeInCopyingState(state, getters) {
  return function(contentNodeId) {
    const contentNode = getters.getContentNode(contentNodeId);
    return (
      contentNode[COPYING_STATUS] === COPYING_STATUS_VALUES.COPYING ||
      contentNode[COPYING_STATUS] === COPYING_STATUS_VALUES.FAILED
    );
  };
}

/**
 * Whether the contentnode's copying has errored or not?
 */
export function hasNodeCopyingErrored(state, getters) {
  return function(contentNodeId) {
    const contentNode = getters.getContentNode(contentNodeId);
    return contentNode[COPYING_STATUS] === COPYING_STATUS_VALUES.FAILED;
  };
}

export function countContentNodeDescendants(state, getters) {
  return function(contentNodeId) {
    return getters.getContentNodeDescendants(contentNodeId).length;
  };
}

export function getContentNodes(state, getters) {
  return function(contentNodeIds) {
    return sorted(contentNodeIds.map(id => getters.getContentNode(id)).filter(node => node));
  };
}

export function getTopicAndResourceCounts(state, getters) {
  return function(contentNodeIds) {
    return getters.getContentNodes(contentNodeIds).reduce(
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

export function getSelectedTopicAndResourceCountText(state, getters) {
  return function(contentNodeIds) {
    const { topicCount, resourceCount } = getters.getTopicAndResourceCounts(contentNodeIds);
    return messages.$tr('selectionCount', { topicCount, resourceCount });
  };
}

export function getContentNodeChildren(state, getters) {
  return function(contentNodeId) {
    return sorted(
      Object.values(state.contentNodesMap)
        .filter(contentNode => contentNode.parent === contentNodeId)
        .map(node => getters.getContentNode(node.id))
        .filter(Boolean)
    );
  };
}

export function getContentNodeAncestors(state, getters) {
  return function(id, includeSelf = false) {
    const node = getters.getContentNode(id);

    if (!node || !node.parent) {
      return [node].filter(Boolean);
    }

    const self = includeSelf ? [node] : [];
    return getters.getContentNodeAncestors(node.parent, true).concat(self);
  };
}

export function getContentNodeIsValid(state, getters, rootState, rootGetters) {
  return function(contentNodeId) {
    const contentNode = state.contentNodesMap[contentNodeId];
    return (
      contentNode &&
      (contentNode[NEW_OBJECT] ||
        (getContentNodeDetailsAreValid(state)(contentNodeId) &&
          getContentNodeFilesAreValid(state, getters, rootState, rootGetters)(contentNodeId) &&
          rootGetters['assessmentItem/getAssessmentItemsAreValid']({
            contentNodeId,
            // Because this is called after items have been created,
            // and it is not used within a form to run field validations,
            //  it's okay to set this to false. This also accounts for
            // any async delays with the node creation
            ignoreDelayed: false,
          })))
    );
  };
}

export function getContentNodeDetailsAreValid(state) {
  return function(contentNodeId) {
    const contentNode = state.contentNodesMap[contentNodeId];
    return contentNode && (contentNode[NEW_OBJECT] || !getNodeDetailsErrors(contentNode).length);
  };
}

export function getNodeDetailsErrorsList(state) {
  return function(contentNodeId) {
    const contentNode = state.contentNodesMap[contentNodeId];
    return getNodeDetailsErrors(contentNode);
  };
}

export function getContentNodeFilesAreValid(state, getters, rootState, rootGetters) {
  return function(contentNodeId) {
    const contentNode = state.contentNodesMap[contentNodeId];
    if (
      contentNode.kind === ContentKindsNames.TOPIC ||
      contentNode.kind === ContentKindsNames.EXERCISE
    ) {
      return true;
    }
    if (contentNode && contentNode.kind !== ContentKindsNames.TOPIC) {
      const files = rootGetters['file/getContentNodeFiles'](contentNode.id);
      if (files.length) {
        // Don't count errors before files have loaded
        return !getNodeFilesErrors(files).length;
      } else {
        return false;
      }
    }
    return true;
  };
}

function getStepDetail(state, getters, contentNodeId) {
  const stepDetail = {
    id: contentNodeId,
    title: '',
    kind: '',
    learning_activities: '',
    parentTitle: '',
  };

  const node = getters.getContentNode(contentNodeId);

  if (!node) {
    return stepDetail;
  }

  stepDetail.title = node.title;
  stepDetail.kind = node.kind;
  stepDetail.learning_activities = node.learning_activities;

  const parentNodeId = state.contentNodesMap[contentNodeId].parent;

  if (parentNodeId) {
    const parentNode = getters.getContentNode(parentNodeId);
    if (parentNode) {
      stepDetail.parentTitle = parentNode.title;
    }
  }

  return stepDetail;
}

/* eslint-disable no-unused-vars */
function getImmediatePreviousStepsIds(state) {
  return function(contentNodeId) {
    return Object.keys(state.previousStepsMap[contentNodeId] || {});
  };
}

function getImmediateNextStepsIds(state) {
  return function(contentNodeId) {
    return Object.keys(state.nextStepsMap[contentNodeId] || {});
  };
}

/**
 * Return a list of immediate previous steps of a node
 * where a step has following interface:
 * { id, title, kind, parentTitle }
 */
export function getImmediatePreviousStepsList(state, getters) {
  return function(contentNodeId) {
    return getImmediatePreviousStepsIds(state)(contentNodeId).map(stepId =>
      getStepDetail(state, getters, stepId)
    );
  };
}

/**
 * Return a list of immediate next steps of a node
 * where a step has following interface:
 * { id, title, kind, parentTitle }
 */
export function getImmediateNextStepsList(state, getters) {
  return function(contentNodeId) {
    return getImmediateNextStepsIds(state)(contentNodeId).map(stepId =>
      getStepDetail(state, getters, stepId)
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

function findNodeInMap(map, rootNodeId, nodeId) {
  if (rootNodeId === nodeId) {
    return false;
  }
  function recurseMaps(targetId, visitedNodes = []) {
    // Copy the visitedNodes set so that we
    // handle it differently for each branch of the graph
    visitedNodes = new Set(visitedNodes);
    if (visitedNodes.has(targetId)) {
      // Immediately return false if we have already
      // visited this node, to prevent a cyclic recursion.
      return false;
    }
    visitedNodes.add(targetId);
    const nextSteps = map[targetId];
    if (nextSteps) {
      for (const nextStep in nextSteps) {
        if (nextStep === nodeId) {
          return true;
        } else {
          if (recurseMaps(nextStep, visitedNodes)) {
            return true;
          }
        }
      }
    }
    return false;
  }
  return recurseMaps(rootNodeId);
}

/**
 * Does a node belongs to next steps of a root node?
 */
export function isNextStep(state) {
  return function({ rootNodeId, nodeId }) {
    return findNodeInMap(state.nextStepsMap, rootNodeId, nodeId);
  };
}

/**
 * Does a node belongs to previous steps of a root node?
 */
export function isPreviousStep(state) {
  return function({ rootNodeId, nodeId }) {
    return findNodeInMap(state.previousStepsMap, rootNodeId, nodeId);
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
  return uniq(
    flatMap(Object.values(state.contentNodesMap), node => Object.keys(node['tags'] || {})).filter(
      t => t
    )
  ).sort();
}

export function nodeExpanded(state) {
  return function(id) {
    return Boolean(state.expandedNodes[id]);
  };
}

export function getQuickEditModalOpen(state) {
  return function() {
    return state.quickEditModalOpen;
  };
}

export function getContentNodesCount(state) {
  return function(nodeId) {
    return state.contentNodesCountMap[nodeId];
  };
}
