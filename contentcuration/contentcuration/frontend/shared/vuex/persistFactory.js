import Storage from 'store2';

/**
 * Creates a Vuex plugin that will subscribe to vuex mutations in `persistMutations` and store
 * the data in local storage. This is useful for preferences that only need to exist on the client
 * side. When reloading the state module or obtaining focus, after a preference has been set,
 * this will push the persisted value into the Vuex state.
 *
 * @param {String} ns Local storage namespace
 * @param {String[]} persistMutations
 * @return {function(...[*]=)} Vuex plugin
 */
export default function persistFactory(ns, persistMutations) {
  const storage = Storage.namespace(ns);

  return function(store) {
    // Reusable so we can trigger now and attach to focus event
    const load = () => {
      persistMutations.forEach(mutation => {
        if (storage.has(mutation)) {
          const payloads = /^ADD/.test(mutation) ? storage(mutation) : [storage(mutation)];

          payloads.forEach(payload => store.commit(mutation, payload));
        }
      });
    };

    window.addEventListener('focus', load);
    load();

    // Subscribe to the mutations
    store.subscribe(mutation => {
      // Only triggered when the mutation is one we've been told to persist
      if (persistMutations.indexOf(mutation.type) >= 0) {
        let oldValue = storage(mutation.type);

        // If ADD vs SET, then we'll keep a list of payloads
        if (/^ADD/.test(mutation.type)) {
          // It's an ADD so we'll keep all values
          oldValue = oldValue || [];
          oldValue.push(mutation.payload);
          storage(mutation.type, oldValue);
        } else if (oldValue !== mutation.payload) {
          // Not a `ADD` so we assume it's just a single value
          storage(mutation.type, mutation.payload);
        }
      }
    });
  };
}
