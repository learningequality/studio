/**
 * Policies vuex plugin that connects the Vuex state with the `window.user` variable
 *
 * @param store
 */
export default function PoliciesPlugin(store) {
  store.subscribeAction(action => {
    // An update to the policies, update `window.user` with new data
    if (action.type === 'policies/setPolicies') {
      window.user = window.user || {};
      window.user.policies = {
        ...(window.user.policies || {}),
        ...action.payload,
      };
    }
  });

  if ('user' in window) {
    // Add policies data immediately
    if (window.user) {
      store.commit('policies/SET_POLICIES', window.user['policies'] || {});
    }
  } else {
    let userData = {},
      initial = true;

    // Here `window.user` is not defined, so define it and hook into when it's
    // set so we can trigger Vuex mutation to add policy data
    Object.defineProperty(window, 'user', {
      get() {
        return userData;
      },
      set(data) {
        userData = data;

        if (initial && data && 'policies' in data) {
          store.commit('policies/SET_POLICIES', data.policies);
          initial = false;
        }
      },
      enumerable: true,
      configurable: true,
    });
  }
}
