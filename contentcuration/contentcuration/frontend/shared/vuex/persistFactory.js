import isEqual from 'lodash/isEqual';
import isArray from 'lodash/isArray';
import Storage from 'shared/utils/store2';

class PersistStorage {
  /**
   * @param {StoreAPI} storage
   * @param {Object} mutations
   */
  constructor(storage, mutations) {
    this.storage = storage;
    this.mutations = mutations;
  }

  /**
   * @param {String} ns
   * @param {Object} mutations
   * @returns {PersistStorage}
   */
  static namespace(ns, mutations) {
    return new PersistStorage(Storage.namespace(ns), mutations);
  }

  /**
   * @param {String} mutation
   * @return {mixed}
   */
  get(mutation) {
    return this.storage(this.mutations[mutation]);
  }

  /**
   * @param {String} mutation
   * @param {mixed} value
   */
  set(mutation, value) {
    this.storage(this.mutations[mutation], value);
  }

  /**
   * Returns whether or not the mutation and payload should be persisted in local storage
   *
   * @param {String} mutation
   * @param {mixed} value
   * @returns {boolean}
   */
  shouldPersist(mutation, value) {
    return Boolean(this.mutations[mutation]) && !isEqual(this.get(mutation), value);
  }

  /**
   * Listens for changes in local storage for each mutation, and triggers callback
   * if value changed
   *
   * @param {function(mutation: String, value: mixed):void} callback
   */
  addListener(callback) {
    Object.entries(this.mutations).forEach(([mutation, storageKey]) => {
      // Attach listener to storage events and trigger callback when value changed
      const listener = e => {
        if (!isEqual(e.oldValue, e.newValue)) {
          callback(mutation, e.newValue);
        }
      };
      this.storage.on(storageKey, listener);

      // Always initialize with current value
      const value = this.get(mutation);
      if (value) {
        callback(mutation, value);
      }
    });
  }
}

/**
 * @param {String} ns
 * @param {String[]} mutations
 * @param {Boolean} prefixMutations
 * @returns {Object}
 */
function prepareMutations(ns, mutations, prefixMutations) {
  const prefix = prefixMutations ? `${ns}/` : '';
  return mutations.reduce(
    (mutationMap, mutation) => ({ ...mutationMap, [prefix + mutation]: mutation }),
    {},
  );
}

/**
 * Creates a Vuex plugin that will subscribe to vuex mutations in `mutations` and store
 * the data in local storage. This is useful for preferences that only need to exist on the client
 * side. When reloading the state module or obtaining focus, after a preference has been set,
 * this will push the persisted value into the Vuex state.
 *
 * @param {String} ns -- Vuex and/or LocalStorage namespace
 * @param {String[]} mutations
 * @param {Boolean} [prefixMutations] -- Whether or not to use `ns` as Vuex module prefix
 * @return {function(...[*]=)} Vuex plugin
 */
export default function persistFactory(ns, mutations, prefixMutations = true) {
  const storage = PersistStorage.namespace(ns, prepareMutations(ns, mutations, prefixMutations));

  return function (store) {
    store.subscribe(({ type, payload }) => {
      // Only triggered when the mutation is one we've been told to persist
      if (storage.shouldPersist(type, payload)) {
        storage.set(type, payload);
      }
    });
    storage.addListener((mutation, value) => store.commit(mutation, value));
  };
}

/**
 * Creates a Vuex plugin that will subscribe to vuex mutations in `mutations` and store
 * the data in local storage. This factory persists all values committed to the mutations,
 * by saving them in an array in local storage
 *
 * @param {String} ns -- Vuex and/or LocalStorage namespace
 * @param {String[]} mutations
 * @param {Boolean} [prefixMutations] -- Whether or not to use `ns` as Vuex module prefix
 * @return {function(...[*]=)} Vuex plugin
 */
export function persistAllFactory(ns, mutations, prefixMutations = true) {
  const storage = PersistStorage.namespace(ns, prepareMutations(ns, mutations, prefixMutations));

  return function (store) {
    store.subscribe(({ type, payload }) => {
      // Only triggered when the mutation is one we've been told to persist
      if (storage.shouldPersist(type, payload)) {
        // Ensure payload not already in array
        const storageValue = storage.get(type) || [];
        if (!storageValue.find(value => isEqual(value, payload))) {
          storageValue.push(payload);
          storage.set(type, storageValue);
        }
      }
    });
    storage.addListener((mutation, value) => {
      if (isArray(value)) {
        value.forEach(val => store.commit(mutation, val));
      }
    });
  };
}
