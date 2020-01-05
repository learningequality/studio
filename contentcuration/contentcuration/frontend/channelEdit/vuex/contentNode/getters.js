import flatMap from 'lodash/flatMap';
import uniq from 'lodash/uniq';
import uniqBy from 'lodash/uniqBy';
import { contentNodeLastSavedState } from './index';
import { isTempId } from 'shared/utils';

export function contentNodes(state) {
  return Object.values(state.contentNodesMap).filter(contentNode => !isTempId(contentNode.id));
}

export function getContentNode(state) {
  return function(contentNodeId) {
    return state.contentNodesMap[contentNodeId];
  };
}

export function getContentNodes(state) {
  return function (contentNodeIds) {
    return contentNodeIds.map(id => getContentNode(state)(id)).filter(node => node);
  };
}

export function getContentNodeChildren(state) {
  return function(contentNodeId) {
    return Object.values(state.contentNodesMap).filter(contentNode => contentNode.parent === contentNodeId);
  };
}

export function getContentNodeUnsaved(state) {
  return function(contentNodeId) {
    const contentNode = state.contentNodesMap[contentNodeId];
    return contentNode ? contentNodeLastSavedState.hasUnsavedChanges(contentNode) : false;
  };
}

export function getContentNodeIsValid(state) {
  return function(contentNodeId) {
    const contentNode = state.contentNodesMap[contentNodeId];
    return contentNode && contentNode.title && contentNode.title.length > 0;
  };
}


function uniqListByKey(state, key) {
  return uniqBy(Object.values(state.contentNodesMap), key).map(node => node[key]).filter(node => node);
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
  return uniq(flatMap(Object.values(state.contentNodesMap), node => node['tags']));
}
