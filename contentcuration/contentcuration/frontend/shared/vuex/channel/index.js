import * as getters from './getters';
import * as mutations from './mutations';
import * as actions from './actions';
import { TABLE_NAMES, CHANGE_TYPES } from 'shared/data';

export default {
  namespaced: true,
  state: () => ({
    invitationsMap: {},
    channelUsersMap: {},
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
      [CHANGE_TYPES.DELETED]: 'REMOVE_CHANNEL',
    },
    [TABLE_NAMES.INVITATION]: {
      [CHANGE_TYPES.CREATED]: 'ADD_INVITATION',
      [CHANGE_TYPES.DELETED]: 'DELETE_INVITATION',
    },
  },
};
