import * as getters from './getters';
import * as mutations from './mutations';
import * as actions from './actions';
import { lastSavedStateFactory } from 'shared/utils';
import { TABLE_NAMES, CHANGE_TYPES } from 'shared/data';

export const channelLastSavedState = lastSavedStateFactory();

export default {
  namespaced: true,
  state: () => ({
    channelsMap: {},
  }),
  getters,
  mutations,
  actions,
  // Mutations that should be called for these events on the specified tables.
  listeners: {
    [TABLE_NAMES.CHANNEL]: {
      [CHANGE_TYPES.CREATED]: 'ADD_CHANNEL',
      [CHANGE_TYPES.UPDATED]: 'UPDATE_CHANNEL',
      [CHANGE_TYPES.DELETED]: 'DELETE_CHANNEL',
    },
  },
};
