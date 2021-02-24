import * as getters from './getters';
import * as actions from './actions';
import * as mutations from './mutations';
import { persistAllFactory } from 'shared/vuex/persistFactory';
import { TABLE_NAMES, CHANGE_TYPES } from 'shared/data';
import { commitListener, dispatchListener } from 'shared/vuex/indexedDBPlugin';

export default {
  namespaced: true,
  state: () => ({
    initializing: false,
    previewNode: null,
    /**
     * A map of node/channel/clipboard-root ID => Selection State, a bitmask of selection flags
     *
     * Selection flags (constants.js):
     *  NONE, SELECTED, INDETERMINATE, ALL_DESCENDANTS
     */
    selected: {},
    /**
     * A map of channel ID => color
     *
     * These are persisted in local storage through the persist plugin
     */
    channelColors: {},
    /**
     * A map of clipboard node ID => clipboard node
     */
    clipboardNodesMap: {},
    /**
     * A map of clipboard node ID => loaded status
     */
    preloadNodes: {},
  }),
  getters,
  actions,
  mutations,
  plugins: [persistAllFactory('clipboard', ['ADD_CHANNEL_COLOR'])],
  listeners: {
    [TABLE_NAMES.CLIPBOARD]: {
      [CHANGE_TYPES.CREATED]: dispatchListener('addClipboardNodeFromListener'),
      [CHANGE_TYPES.DELETED]: commitListener('REMOVE_CLIPBOARD_NODE'),
    },
  },
};
