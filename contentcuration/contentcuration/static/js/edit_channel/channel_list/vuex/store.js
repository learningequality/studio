import Vuex from 'vuex';

var mutations = require('./mutations');
var actions = require('./actions');
var getters = require('./getters');

const store = new Vuex.Store({
  modules: {
    channel_list: {
      namespaced: true,
      state: {
        channels: [],
        activeChannel: null,
        changed: false,
        channelChanges: {},
        channelSets: [],
        invitations: [],
      },
      getters,
      mutations,
      actions,
    },
  },
});

export default store;
module.exports = store;
