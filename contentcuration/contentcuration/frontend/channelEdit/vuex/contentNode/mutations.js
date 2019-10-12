import Vue from 'vue';
import { contentNodeLastSavedState } from './index';

function mergeContentNode(contentNodesMap, contentNode) {
  contentNodeLastSavedState.storeLastSavedState(contentNode);
  return {
    ...contentNodesMap,
    [contentNode.id]: {
      ...contentNodesMap[contentNode.id],
      ...contentNode,
      // Temporary hack to add children for Vuetify tree view
      children: contentNode.has_children ? [] : null,
    },
  };
}

export function ADD_CONTENTNODE(state, contentNode) {
  state.contentNodesMap = mergeContentNode(state.contentNodesMap, contentNode);
}

export function ADD_CONTENTNODES(state, contentNodes = []) {
  state.contentNodesMap = contentNodes.reduce((contentNodesMap, contentNode) => {
    return mergeContentNode(contentNodesMap, contentNode);
  }, state.contentNodesMap);
}

export function REMOVE_CONTENTNODE(state, contentNodeId) {
  Vue.delete(state.contentNodesMap, contentNodeId);
}

export function UPDATE_CONTENTNODE(
  state,
  { id, title = null, description = null, thumbnailData = null, language = null } = {}
) {
  if (!id) {
    throw ReferenceError('id must be defined to update a contentNode set');
  }
  const contentNode = state.contentNodesMap[id];
  if (title !== null) {
    contentNode.title = title;
  }
  if (description !== null) {
    contentNode.description = description;
  }
  if (
    thumbnailData !== null &&
    ['thumbnail', 'thumbnail_url', 'thumbnail_encoding'].every(attr => thumbnailData[attr])
  ) {
    contentNode.thumbnail = thumbnailData.thumbnail;
    contentNode.thumbnail_url = thumbnailData.thumbnail_url;
    contentNode.thumbnail_encoding = thumbnailData.thumbnail_encoding;
  }
  if (language !== null) {
    contentNode.language = language;
  }
}
