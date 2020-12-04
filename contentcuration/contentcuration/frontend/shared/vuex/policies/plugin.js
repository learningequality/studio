export default function PoliciesPlugin(store) {
  let userData = window.user;

  store.subscribeAction(action => {
    if (action.type === 'policies/setPolicies') {
      userData.policies = {
        ...(userData.policies || {}),
        ...action.payload,
      };
    }
  });

  if (userData) {
    store.dispatch('policies/setPolicies', userData.policies);
  } else {
    // `window.user` is not defined, so define it and hook into when it's set
    // so we can trigger Vuex mutation to add policy data
    Object.defineProperty(window, 'user', {
      get() {
        return userData;
      },
      set(data) {
        // Commit mutation when user data is already set to avoid circular loop
        if (userData) {
          store.commit('policies/SET_POLICIES', data.policies);
        } else {
          store.dispatch('policies/setPolicies', data.policies);
        }
        userData = data;
      },
      enumerable: true,
      configurable: true,
    });
  }
}
