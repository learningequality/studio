import Storage from 'store2';

/**
 * @param {String} ns Local storage namespace
 * @param {String[]} persistMutations
 * @return {function(...[*]=)} Vuex plugin
 */
export default function persistFactory(ns, persistMutations) {
  const storage = Storage.namespace(ns);

  return function(store) {
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

    store.subscribe(mutation => {
      if (persistMutations.indexOf(mutation.type) >= 0) {
        let oldValue = storage(mutation.type);

        // If ADD vs SET, then we'll keep a list of payloads
        if (/^ADD/.test(mutation.type)) {
          oldValue = oldValue || [];
          oldValue.push(mutation.payload);
          storage(mutation.type, oldValue);
        } else if (oldValue !== mutation.payload) {
          storage(mutation.type, mutation.payload);
        }
      }
    });
  };
}
