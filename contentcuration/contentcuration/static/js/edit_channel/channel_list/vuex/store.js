import Vue from 'vue';

const Vuex = require('vuex');
var mutations = require('./mutations');
var actions = require('./actions');
var getters = require('./getters');

Vue.use(Vuex);

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
      getters: getters,
      mutations: mutations,
      actions: actions,
    },
  },
});

export default store;
module.exports = store;
