import Vuex from 'vuex';

var mutations = require('./mutations');
var actions = require('./actions');

var store = new Vuex.Store({
  modules: {
    publish: {
      namespaced: true,
      state: {
        channel: null,
      },
      actions: actions,
      mutations: mutations,
      getters: {
        channelCount(state) {
          return state.channel.main_tree.metadata.resource_count;
        },
        isPublishing(state) {
          return state.channel.main_tree.publishing;
        },
      },
    },
  },
});

module.exports = store;
