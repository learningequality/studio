import * as getters from './getters';

export default {
  namespaced: true,
  state: () => ({
    currentChannelId: window.channel_id,
  }),
  getters,
};
