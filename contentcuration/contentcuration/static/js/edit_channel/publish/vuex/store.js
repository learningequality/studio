import Vuex from 'vuex';

var mutations = require('./mutations');
var actions = require('./actions');

var store = new Vuex.Store({
  modules: {
    publish: {
      namespaced: true,
      state: {
        channel: null,

        /* TODO: Update with actual task logic

          I have created two different ways to handle this:
          1. Store the task on this store, in which case you can
            rename this variable to publishingTaskID or something.
            This will be set under the mutation SET_TASK.
            I'm not sure how vue-y this is though since it can be
            assumed that the task will be available elsewhere on
            the store, so that leads to...
          2. Just use the taskID getter to return the correct task id,
            effectively getting rid of this variable and the SET_TASK
            mutation.

          Since I don't have all the context on the task module, I'll
          leave it up to you to determine the best course of action
        */
        tempTaskID: null,
      },
      actions: actions,
      mutations: mutations,
      getters: {
        taskID(state) {
          return state.tempTaskID;
        },
      },
    },
  },
});

module.exports = store;
