import Vue from 'vue';
import { mergeMapItem } from 'shared/vuex/utils';

export function ADD_CONTENTNODE(state, contentNode) {
  state.contentNodesMap = mergeMapItem(state.contentNodesMap, contentNode);
}

export function ADD_CONTENTNODES(state, contentNodes = []) {
  state.contentNodesMap = contentNodes.reduce((contentNodesMap, contentNode) => {
    return mergeMapItem(contentNodesMap, contentNode);
  }, state.contentNodesMap);
}

export function REMOVE_CONTENTNODE(state, contentNode) {
  Vue.delete(state.contentNodesMap, contentNode.id);
}

export function UPDATE_CONTENTNODE(state, { id, ...payload } = {}) {
  if (!id) {
    throw ReferenceError('id must be defined to update a contentNode set');
  }
  state.contentNodesMap[id] = {
    ...state.contentNodesMap[id],
    ...payload,
  };
}

export function UPDATE_CONTENTNODES(state, { ids, ...payload }) {
  ids.forEach(id => {
    UPDATE_CONTENTNODE(state, {
      id,
      ...payload,
    });
  });
}

export function SET_TAGS(state, { id, tags }) {
  state.contentNodesMap[id].tags = tags;
}

export function SET_FILES(state, { id, files }) {
  state.contentNodesMap[id].files = files;
}

export function SET_EXPANSION(state, { id, expanded }) {
  if (!expanded) {
    Vue.delete(state.expandedNodes, id);
  } else {
    state.expandedNodes[id] = true;
  }
  if (window.sessionStorage) {
    window.sessionStorage.setItem('expandedNodes', JSON.stringify(state.expandedNodes));
  }
}

export function TOGGLE_EXPANSION(state, id) {
  SET_EXPANSION(state, { id, expanded: !state.expandedNodes[id] });
}

export function ADD_TREENODE(state, treeNode) {
  state.treeNodesMap = mergeMapItem(state.treeNodesMap, treeNode);
}

export function ADD_TREENODES(state, treeNodes = []) {
  state.treeNodesMap = treeNodes.reduce((treeNodesMap, treeNode) => {
    return mergeMapItem(treeNodesMap, treeNode);
  }, state.treeNodesMap);
}

export function REMOVE_TREENODE(state, treeNode) {
  Vue.delete(state.treeNodesMap, treeNode.id);
}

export function UPDATE_TREENODE(state, { id, ...payload } = {}) {
  if (!id) {
    throw ReferenceError('id must be defined to update a tree node');
  }
  state.treeNodesMap[id] = {
    ...state.treeNodesMap[id],
    ...payload,
  };
}
