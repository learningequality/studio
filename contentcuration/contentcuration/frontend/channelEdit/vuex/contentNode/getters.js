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
