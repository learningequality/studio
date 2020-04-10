import template from './vuex/template';
import assessmentItem from './vuex/assessmentItem';
import clipboard from './vuex/clipboard';
import contentNode from './vuex/contentNode';
import currentChannel from './vuex/currentChannel';
import importFromChannels from './vuex/importFromChannels';
import task from './vuex/task';
import * as actions from './actions';
import * as getters from './getters';
import * as mutations from './mutations';
import storeFactory from 'shared/vuex/baseStore';
import persistFactory from 'shared/vuex/persistFactory';

const store = storeFactory({
  state() {
    return {
      viewMode: null,
      viewModeOverrides: [],
    };
  },
  actions,
  mutations,
  getters,
  plugins: [persistFactory('channelEdit', ['SET_VIEW_MODE'])],
  modules: {
    task,
    template,
    assessmentItem,
    clipboard,
    contentNode,
    currentChannel,
    importFromChannels,
  },
});

export default store;
