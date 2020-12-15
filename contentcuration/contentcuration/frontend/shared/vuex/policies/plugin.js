/**
 * Policies vuex plugin that connects the Vuex state with the `window.user` variable
 *
 * @param store
 */
export default function PoliciesPlugin(store) {
  let userData = window.user;

  store.subscribeAction(action => {
    // An update to the policies, update `window.user` with new data
    if (action.type === 'policies/setPolicies') {
      userData.policies = {
        ...(userData['policies'] || {}),
        ...action.payload,
      };
    }
  });

  if (userData) {
    // Add policies data immediately
    if ('policies' in userData) {
      store.dispatch('policies/setPolicies', userData.policies);
    }
  } else {
    // Here `window.user` is not defined, so define it and hook into when it's
    // set so we can trigger Vuex mutation to add policy data
    Object.defineProperty(window, 'user', {
      get() {
        return userData;
      },
      set(data) {
        // Commit mutation when window.user is already set to avoid circular loop
        if (userData) {
          if ('policies' in data) {
            store.commit('policies/SET_POLICIES', data.policies);
          }
          userData = data;
        } else {
          userData = data;
          // Dispatch initial setPolicies when window.user is set for the first time
          if ('policies' in data) {
            // Will trigger subscribed action above
            store.dispatch('policies/setPolicies', data.policies);
          }
        }
      },
      enumerable: true,
      configurable: true,
    });
  }
}
