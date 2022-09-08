import * as mutations from './mutations';
import * as actions from './actions';
import * as getters from './getters';
import { TABLE_NAMES, CHANGE_TYPES } from 'shared/data';

export default {
  namespaced: true,
  state: () => ({
    channelSetsMap: {},
  }),
  actions,
  mutations,
  getters,
  // Mutations that should be called for these events on the specified tables.
  listeners: {
    [TABLE_NAMES.CHANNELSET]: {
      [CHANGE_TYPES.CREATED]: 'ADD_CHANNELSET',
      [CHANGE_TYPES.UPDATED]: 'UPDATE_CHANNELSET_FROM_INDEXEDDB',
      [CHANGE_TYPES.DELETED]: 'REMOVE_CHANNELSET',
    },
  },
};
