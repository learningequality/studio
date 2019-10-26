import Vue from 'vue';

import { modes } from './../constants';
import State from 'edit_channel/state';

const Vuex = require('vuex');
var mutations = require('./mutations');
var actions = require('./actions');
var getters = require('./getters');

Vue.use(Vuex);

if (State.current_channel) {
  State.current_channel.fetch({ async: false });
}

const store = new Vuex.Store({
  modules: {
    edit_modal: {
      namespaced: true,
      state: {
        nodes: [],
        selectedIndices: [],
        changes: {},
        mode: modes.VIEW_ONLY,
        /* Nodes validation errors in form of an array consisting
           of objects with the following interface:
           {
              // index of a node in state.nodes
              // (TODO - switch to node and assessment items IDs when possible
              // will require migration to a new data structure since everything
              // is currently built on indexes)
              nodeIdx: <Number>,
              errors: {
                // errors related to node details like title, licence, etc.
                details: [],
                assessment_items: [
                  [], // first assessment item errors
                  []  // second assessment item errors
                ]
              }
            }
        */
        validation: [],
        dialog: {
          open: false,
          title: '',
          message: '',
          submitLabel: '',
          onSubmit: () => {},
          onCancel: () => {},
        },
      },
      getters: getters,
      mutations: mutations,
      actions: actions,
    },
  },
});

export default store;
module.exports = store;
