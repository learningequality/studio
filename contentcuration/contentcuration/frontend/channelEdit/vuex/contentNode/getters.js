import flatMap from 'lodash/flatMap';
import sortBy from 'lodash/sortBy';
import uniq from 'lodash/uniq';
import uniqBy from 'lodash/uniqBy';

import { validateNodeDetails, validateNodeFiles } from './utils';

function sorted(nodes) {
  return sortBy(nodes, ['sort_order']);
}

export function getContentNode(state) {
  return function(contentNodeId) {
    return state.contentNodesMap[contentNodeId];
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

export function getContentNodeIsValid(state) {
  return function(contentNodeId) {
    const contentNode = state.contentNodesMap[contentNodeId];
    return (
      contentNode &&
      (contentNode.isNew ||
        (getContentNodeDetailsAreValid(state)(contentNodeId) &&
          getContentNodeFilesAreValid(state)(contentNodeId)))
    );
  };
}

export function getContentNodeDetailsAreValid(state) {
  return function(contentNodeId) {
    const contentNode = state.contentNodesMap[contentNodeId];
    return contentNode && (contentNode.isNew || !validateNodeDetails(contentNode).length);
  };
}

export function getContentNodeFilesAreValid(state) {
  return function(contentNodeId) {
    const contentNode = state.contentNodesMap[contentNodeId];
    return contentNode && !validateNodeFiles(contentNode).length;
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
