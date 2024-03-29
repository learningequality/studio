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
import IndexedDBPlugin, { Listener, commitListener } from 'shared/vuex/indexedDBPlugin';
import db from 'shared/data/db';

Vue.use(Vuex);

/**
 * @param {String} moduleName
 * @param {Object<String|Listener>} listeners
 * @param {Boolean} namespaced
 * @return {Listener[]}
 */
function parseListeners(moduleName, listeners, namespaced = false) {
  const parsedListeners = [];

  for (const [tableName, tableListeners] of Object.entries(listeners)) {
    /* eslint-disable-next-line prefer-const */
    for (let [changeType, listener] of Object.entries(tableListeners)) {
      if (!(listener instanceof Listener)) {
        listener = commitListener(listener);
      }
      parsedListeners.push(listener.bind(tableName, changeType, namespaced ? moduleName : null));
    }
  }

  return parsedListeners;
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

  const parsedListeners = parseListeners(null, listeners);
  for (const [moduleName, module] of Object.entries(modules)) {
    if (module.listeners) {
      parsedListeners.push(...parseListeners(moduleName, module.listeners, module.namespaced));
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
      IndexedDBPlugin(db, parsedListeners),
      PoliciesPlugin,
      ...plugins,
    ],
    modules,
  });
}
