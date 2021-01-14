import Vue from 'vue';
import Vuex, { Store } from 'vuex';
import session from './session';
import ConnectionPlugin from './connectionPlugin';
import snackbar from './snackbar';
import errors from './errors';
import contextMenu from './contextMenu';
import channel from './channel';
import file from './file';
import policies from './policies';
import SyncProgressPlugin from './syncProgressPlugin';
import PoliciesPlugin from './policies/plugin';
import { registerListener } from 'shared/data';

Vue.use(Vuex);

function createIndexedDBPlugin(listeners) {
  return store => {
    for (let [tableName, tableListeners] of Object.entries(listeners)) {
      for (let [changeType, mutation] of Object.entries(tableListeners)) {
        registerListener(tableName, changeType, obj => {
          store.commit(mutation, obj);
        });
      }
    }
  };
}

export default function storeFactory({
  state = {},
  actions = {},
  getters = {},
  mutations = {},
  modules = {},
  plugins = [],
  listeners = {},
} = {}) {
  modules = {
    session,
    errors,
    snackbar,
    contextMenu,
    channel,
    file,
    policies,
    ...modules,
  };
  for (let [moduleName, module] of Object.entries(modules)) {
    if (module.listeners) {
      const namespacePrefix = module.namespaced ? `${moduleName}/` : '';
      for (let [tableName, tableListeners] of Object.entries(module.listeners)) {
        if (!listeners[tableName]) {
          listeners[tableName] = {};
        }
        for (let [changeType, mutation] of Object.entries(tableListeners)) {
          listeners[tableName][changeType] = `${namespacePrefix}${mutation}`;
        }
      }
      delete module.listeners;
    }
  }
  return new Store({
    state,
    actions,
    getters,
    mutations,
    plugins: [
      ConnectionPlugin,
      SyncProgressPlugin,
      createIndexedDBPlugin(listeners),
      PoliciesPlugin,
      ...plugins,
    ],
    modules,
  });
}
