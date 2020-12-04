import Vue from 'vue';
import { policyDates, policyKeys, createPolicyKey, policies } from 'shared/constants';
import client from 'shared/client';

const acceptOrder = [policies.TERMS_OF_SERVICE, policies.PRIVACY];

export default {
  namespaced: true,
  state() {
    return {
      policies: {},
      selectedPolicy: null,
    };
  },
  getters: {
    getPolicyAcceptedData() {
      return policyName => {
        // what should the format be?
        // {policy_name}_{year}_{month}_{day}
        // Get current date string
        const date = new Date();
        // this data is what we send to the server,
        // and converting it to a string makes it lose
        // timezone data. Ensure that we standardize on
        // UTC before sending that to the server.
        // part of the fix for issue #2508 and #2317.
        const day = ('0' + date.getUTCDate()).slice(-2);
        const month = ('0' + (date.getUTCMonth() + 1)).slice(-2);
        const year = String(date.getUTCFullYear()).slice(-2);
        const hour = ('0' + (date.getUTCHours() + 1)).slice(-2);
        const minute = ('0' + (date.getUTCMinutes() + 1)).slice(-2);
        const dateStr = `${day}/${month}/${year} ${hour}:${minute}`;

        // Get policy string
        const policyDate = policyDates[policyName];
        return { [createPolicyKey(policyName, policyDate)]: dateStr };
      };
    },
    // returns a list of policy constants (e.g. policies.PRIVACY)
    // that have not been signed by the user.
    nonAcceptedPolicies(state, getters, rootState, rootGetters) {
      if (!rootGetters.loggedIn) {
        console.log('not logged in', rootGetters.loggedIn);
        return [];
      }

      return policyKeys
        .filter(key => !state.policies[key])
        .map(key =>
          key
            .split('_')
            .slice(0, -3)
            .join('_')
        );
    },
    isPolicyUnaccepted(state, getters) {
      return function(policy) {
        return getters.nonAcceptedPolicies.includes(policy);
      };
    },
    showPolicy(state, getters, rootState, rootGetters) {
      if (state.selectedPolicy) {
        return state.selectedPolicy;
      }

      if (!rootGetters.loggedIn) {
        return null;
      }

      const unacceptedPolicies = getters.nonAcceptedPolicies;
      if (unacceptedPolicies.length) {
        return acceptOrder.find(policy => unacceptedPolicies.includes(policy));
      }
    },
  },
  actions: {
    setPolicies(context, policies) {
      context.commit('SET_POLICIES', policies);
    },
    openPolicy(context, policy) {
      context.commit('SET_SELECTED_POLICY', policy);
    },
    closePolicy(context, policy) {
      if (context.state.selectedPolicy === policy) {
        context.commit('SET_SELECTED_POLICY', null);
      }
    },
    acceptPolicy(context, policyData) {
      return client
        .post(window.Urls.policy_update(), { policy: JSON.stringify(policyData) })
        .then(() => {
          return context
            .dispatch('setPolicies', policyData)
            .then(() => context.dispatch('closePolicy'));
        });
    },
  },
  mutations: {
    SET_SELECTED_POLICY(state, policy) {
      state.selectedPolicy = policy;
    },
    /**
     * @param state
     * @param {Object} policies
     * @constructor
     */
    SET_POLICIES(state, policies) {
      for (let policy in policies) {
        Vue.set(state.policies, policy, policies[policy]);
      }
    },
  },
};
