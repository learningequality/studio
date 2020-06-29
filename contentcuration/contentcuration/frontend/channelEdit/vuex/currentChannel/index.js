import * as getters from './getters';
import * as actions from './actions';

export default {
  namespaced: true,
  state: () => ({
    currentChannelId: window.channel_id,
  }),
  getters,
  actions,
};
