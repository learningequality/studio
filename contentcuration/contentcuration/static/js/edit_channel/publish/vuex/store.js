import Vuex from 'vuex';
import _ from 'underscore';

var mutations = require('./mutations');
var actions = require('./actions');

var store = new Vuex.Store({
  modules: {
    publish: {
      namespaced: true,
      state: {
        channel: null,
        nodes: [],
      },
      actions: actions,
      mutations: mutations,
      getters: {
        channelCount(state) {
          return state.channel.main_tree.metadata.resource_count;
        },
        nodes(state) {
          return state.nodes;
        },
        getNode(state) {
          return function(nodeID) {
            return _.findWhere(state.nodes, { id: nodeID });
          };
        },
      },
    },
  },
});

module.exports = store;
