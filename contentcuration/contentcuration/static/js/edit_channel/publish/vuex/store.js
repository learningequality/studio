import Vuex from 'vuex';

var mutations = require('./mutations');
var actions = require('./actions');

var store = new Vuex.Store({
  modules: {
    publish: {
      namespaced: true,
      state: {
        channel: null,
        tempTaskID: null, // Depending on task logic, set using mutation
        // on publishChannel action success callback
        // or update getter logic to get task info
      },
      actions: actions,
      mutations: mutations,
      getters: {
        taskID(state) {
          // TODO: Replace with task logic
          return state.tempTaskID;
        },
      },
    },
  },
});

module.exports = store;
