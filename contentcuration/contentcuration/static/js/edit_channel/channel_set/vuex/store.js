import Vue from 'vue';

var Vuex = require('vuex');
var { PageTypes } = require('../constants');
var mutations = require('./mutations');
var actions = require('./actions');
var getters = require('./getters');

Vue.use(Vuex);

var store = new Vuex.Store({
  modules: {
    channel_set: {
      namespaced: true,
      state: {
        loadChannels: true,
        name: '',
        description: '',
        channels: [],
        allChannels: {},
        saving: false,
        closing: false,
        error: false,
        changed: false,
        channelSet: null,
        stopValidation: false,
        isNewSet: false,
        pageState: {
          pageType: PageTypes.VIEW_CHANNELS,
          data: {},
        },
      },
      actions: actions,
      mutations: mutations,
      getters: getters,
    },
  },
});

module.exports = store;
