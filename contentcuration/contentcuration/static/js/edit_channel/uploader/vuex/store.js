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
        // <node ID> : <to be updated or new assessment items> map
        nodesAssessmentDrafts: {},
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
