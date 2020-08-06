import Vue from 'vue';

export function SET_SAVEDSEARCHES(state, searches) {
  searches.forEach(search => {
    UPDATE_SAVEDSEARCH(state, search);
  });
}

export function UPDATE_SAVEDSEARCH(state, search) {
  Vue.set(state.savedSearches, search.id, {
    ...(state.savedSearches[search.id] || {}),
    ...search,
  });
}

export function REMOVE_SAVEDSEARCH(state, searchId) {
  Vue.delete(state.savedSearches, searchId);
}
