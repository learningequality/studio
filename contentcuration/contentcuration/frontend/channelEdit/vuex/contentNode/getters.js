import flatMap from 'lodash/flatMap';
import sortBy from 'lodash/sortBy';
import uniq from 'lodash/uniq';
import uniqBy from 'lodash/uniqBy';

import { validateNodeFiles } from '../file/utils';
import { validateNodeDetails } from './utils';

function sorted(nodes) {
  return sortBy(nodes, ['sort_order']);
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

export function getContentNodeIsValid(state, getters, rootState, rootGetters) {
  return function(contentNodeId) {
    const contentNode = state.contentNodesMap[contentNodeId];
    return (
      contentNode &&
      (contentNode.isNew ||
        (getContentNodeDetailsAreValid(state)(contentNodeId) &&
          getContentNodeFilesAreValid(state, getters, rootState, rootGetters)(contentNodeId)))
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
      let files = rootGetters['file/getFiles'](contentNode.files);
      if (files.length) {
        // Don't count errros before files have loaded
        return !validateNodeFiles(files).length;
      }
    }
    return true;
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
