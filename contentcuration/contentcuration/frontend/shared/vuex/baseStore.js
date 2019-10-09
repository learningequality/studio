import Vue from 'vue';
import Vuex from 'vuex';
import session from './session';

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
  return new Vuex.Store({
    state,
    actions,
    getters,
    mutations,
    plugins,
    modules: {
      session,
      ...modules,
    },
  });
}
