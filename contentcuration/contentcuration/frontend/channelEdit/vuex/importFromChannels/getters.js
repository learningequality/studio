import isEqual from 'lodash/isEqual';
import sortBy from 'lodash/sortBy';

export function savedSearches(state) {
  // Ensure new searches are also properly sorted
  return sortBy(Object.values(state.savedSearches), 'created').reverse();
}

export function getSavedSearch(state) {
  return params => savedSearches(state).find(search => isEqual(search.params, params));
}
