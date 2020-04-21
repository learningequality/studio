import flatMap from 'lodash/flatMap';
import sortBy from 'lodash/sortBy';
import uniq from 'lodash/uniq';
import uniqBy from 'lodash/uniqBy';

import { validateNodeFiles } from '../file/utils';
import { validateNodeDetails } from './utils';
import { isSuccessor } from 'shared/utils';

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

export function getTreeNode(state) {
  return function(contentNodeId) {
    return state.treeNodesMap[contentNodeId];
  };
}
export function getContentNodes(state) {
  return function(contentNodeIds) {
    return sorted(contentNodeIds.map(id => getContentNode(state)(id)).filter(node => node));
  };
}

export function getContentNodeChildren(state) {
  return function(contentNodeId) {
    return getContentNodes(state)(
      sorted(
        Object.values(state.treeNodesMap).filter(
          contentNode => contentNode.parent === contentNodeId
        )
      ).map(node => node.id)
    );
  };
}

export function getContentNodeAncestors(state) {
  return function(contentNodeId) {
    let node = state.treeNodesMap[contentNodeId];
    if (node) {
      return getContentNodes(state)(
        sorted(
          Object.values(state.treeNodesMap).filter(n => n.lft <= node.lft && n.rght >= node.rght)
        ).map(node => node.id)
      );
    }
    return [];
  };
}

/**
 * Returns an array of all parent nodes of a node.
 * Parent nodes are sorted from the immmediate parent
 * to the most distant parent.
 */
export function getContentNodeParents(state) {
  return function(contentNodeId) {
    const getParentId = nodeId => {
      const treeNode = Object.values(state.treeNodesMap).find(
        contentNode => contentNode.id === nodeId
      );

      if (!treeNode || !treeNode.parent) {
        return null;
      }

      return treeNode.parent;
    };

    const parents = [];
    let parentId = getParentId(contentNodeId);

    while (parentId !== null) {
      parents.push(getContentNode(state)(parentId));
      parentId = getParentId(parentId);
    }

    return parents;
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
          rootGetters['assessmentItem/getAssessmentItemsAreValid'](contentNodeId)))
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
    if (contentNode) {
      let files = rootGetters['file/getContentNodeFiles'](contentNode.id);
      if (files.length) {
        // Don't count errors before files have loaded
        return !validateNodeFiles(files).length;
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

  const parentNodeId = state.treeNodesMap[contentNodeId].parent;

  if (parentNodeId) {
    const parentNode = getContentNode(state)(parentNodeId);
    stepDetail.parentTitle = parentNode.title;
  }

  return stepDetail;
}

function getImmediatePreviousStepsIds(state) {
  return function(contentNodeId) {
    return state.nextStepsMap
      .filter(([, nextStepId]) => nextStepId === contentNodeId)
      .map(([targetId]) => targetId);
  };
}

function getImmediateNextStepsIds(state) {
  return function(contentNodeId) {
    return state.nextStepsMap
      .filter(([targetId]) => targetId === contentNodeId)
      .map(([, nextStepId]) => nextStepId);
  };
}

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
