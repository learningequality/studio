import Vue from 'vue';
import Vuex, { Store } from 'vuex';
import session from './session';
import ConnectionPlugin from './connectionPlugin';
import snackbar from './snackbar';
import channel from './channel';

Vue.use(Vuex);

export default function storeFactory(
  { state, actions, getters, mutations, modules, plugins } = {
    state: {},
    actions: {},
    getters: {},
    mutations: {},
    modules: {},
    plugins: [],
  }
) {
  return new Store({
    state,
    actions,
    getters,
    mutations,
    plugins: [ConnectionPlugin, ...(plugins || [])],
    modules: {
      session,
      snackbar,
      channel,
      ...modules,
    },
  });
}
