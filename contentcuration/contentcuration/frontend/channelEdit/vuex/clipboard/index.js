import * as getters from './getters';
import * as actions from './actions';
import * as mutations from './mutations';
import persistFactory from 'shared/vuex/persistFactory';

export default {
  namespaced: true,
  state: () => ({
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
     * A local map of channel ID => channel
     *
     * Having a local copy of this helps prevent a circular lookup issue
     * in the selection state management
     */
    channelMap: {},
    /**
     * A map of clipboard node ID => clipboard node
     *
     */
    clipboardNodesMap: {},
  }),
  getters,
  actions,
  mutations,
  plugins: [persistFactory('clipboard', ['ADD_CHANNEL_COLOR'])],
};
