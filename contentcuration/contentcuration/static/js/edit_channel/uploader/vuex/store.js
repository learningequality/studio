import Vue from 'vue';

const Vuex = require('vuex');
var mutations = require('./mutations');
var actions = require('./actions');
var getters = require('./getters');

Vue.use(Vuex);

const store = new Vuex.Store({
  modules: {
    edit_modal: {
      namespaced: true,
      state: {
        nodes: [],
        selectedIndices: [],
        viewOnly: false,
        isClipboard: false,
      },
      getters: getters,
      mutations: mutations,
      actions: actions,
    },
  },
});

module.exports = store;
