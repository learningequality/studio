import Vue, { set } from 'vue';
import { applyMods } from 'shared/data/applyRemoteChanges';

// Saved search mutations
export function SET_SAVEDSEARCHES(state, searches) {
  searches.forEach(search => {
    UPDATE_SAVEDSEARCH(state, search);
  });
}

export function UPDATE_SAVEDSEARCH(state, search) {
  set(state.savedSearches, search.id, {
    ...(state.savedSearches[search.id] || {}),
    ...search,
  });
}

export function UPDATE_SAVEDSEARCH_FROM_INDEXEDDB(state, { id, ...updates }) {
  if (id && state.savedSearches[id]) {
    set(state.savedSearches, id, { ...applyMods(state.savedSearches[id], updates) });
  }
}

export function REMOVE_SAVEDSEARCH(state, searchId) {
  Vue.delete(state.savedSearches, searchId);
}

// Node selection mutations
export function SELECT_NODE(state, node) {
  state.selected.push(node);
}

export function SELECT_NODES(state, nodes) {
  nodes.forEach(node => SELECT_NODE(state, node));
}

export function DESELECT_NODE(state, node) {
  state.selected = state.selected.filter(n => n.id !== node.id);
}

export function DESELECT_NODES(state, nodes) {
  nodes.forEach(node => DESELECT_NODE(state, node));
}

export function CLEAR_NODES(state) {
  state.selected = [];
}

export function SET_RECOMMENDATIONS_DATA(state, data) {
  state.recommendationsData = data;
}
