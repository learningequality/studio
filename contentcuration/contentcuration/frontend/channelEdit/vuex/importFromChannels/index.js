import * as actions from './actions';
import * as getters from './getters';
import * as mutations from './mutations';
import { TABLE_NAMES, CHANGE_TYPES } from 'shared/data';

export default {
  namespaced: true,
  state() {
    return {
      savedSearches: {},
      selected: [],
      recommendationsData: {},
    };
  },
  getters,
  mutations,
  actions,
  // Mutations that should be called for these events on the specified tables.
  listeners: {
    [TABLE_NAMES.SAVEDSEARCH]: {
      [CHANGE_TYPES.CREATED]: 'UPDATE_SAVEDSEARCH',
      [CHANGE_TYPES.UPDATED]: 'UPDATE_SAVEDSEARCH_FROM_INDEXEDDB',
      [CHANGE_TYPES.DELETED]: 'REMOVE_SAVEDSEARCH',
    },
  },
};
