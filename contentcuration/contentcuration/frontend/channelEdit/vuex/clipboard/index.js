import * as getters from './getters';
import * as actions from './actions';
import * as mutations from './mutations';
import persistFactory from 'shared/vuex/persistFactory';

export default {
  namespaced: true,
  state: () => ({
    selected: {},
    channelColors: {},
    channelMap: {},
  }),
  getters,
  actions,
  mutations,
  plugins: [persistFactory('clipboard', ['ADD_CHANNEL_COLOR'])],
};
