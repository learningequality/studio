import * as getters from './getters';
import * as actions from './actions';
import * as mutations from './mutations';

export default {
  namespaced: true,
  state: () => ({
    currentChannelId: window.channel_id,
    currentChannelStagingDiff: {},
    selectedNodeIds: [],
  }),
  getters,
  mutations,
  actions,
};
