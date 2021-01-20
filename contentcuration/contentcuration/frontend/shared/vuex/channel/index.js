import * as getters from './getters';
import * as mutations from './mutations';
import * as actions from './actions';
import { TABLE_NAMES, CHANGE_TYPES } from 'shared/data';

export default {
  namespaced: true,
  state: () => ({
    invitationsMap: {},
    // A lookup of user id to user object
    channelUsersMap: {},
    /* A lookup of channel id to map object
     * for all editors
     * {
     *   channel_id: {
     *     editor_user_id_1: true,
     *     editor_user_id_2: true,
     *   }
     * }
     */
    channelEditorsMap: {},
    /* A lookup of channel id to map object
     * for all viewers
     * {
     *   channel_id: {
     *     viewer_user_id_1: true,
     *     viewer_user_id_2: true,
     *   }
     * }
     */
    channelViewersMap: {},
    channelsMap: {},
    page: {
      next: null,
      previous: null,
      page_number: null,
      count: null,
      total_pages: null,
      results: [],
    },
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
    [TABLE_NAMES.EDITOR_M2M]: {
      [CHANGE_TYPES.CREATED]: 'ADD_EDITOR_TO_CHANNEL',
      [CHANGE_TYPES.DELETED]: 'REMOVE_EDITOR_FROM_CHANNEL',
    },
    [TABLE_NAMES.VIEWER_M2M]: {
      [CHANGE_TYPES.CREATED]: 'ADD_VIEWER_TO_CHANNEL',
      [CHANGE_TYPES.DELETED]: 'REMOVE_VIEWER_FROM_CHANNEL',
    },
  },
};
