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
          store.commit(mutation, storage(mutation));
        }
      });
    };

    window.addEventListener('focus', load);
    load();

    store.subscribe(mutation => {
      if (
        persistMutations.indexOf(mutation.type) >= 0 &&
        storage(mutation.type) !== mutation.payload
      ) {
        storage(mutation.type, mutation.payload);
      }
    });
  };
}
