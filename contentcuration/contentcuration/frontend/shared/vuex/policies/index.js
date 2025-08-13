import { set } from 'vue';
import { policyDates, policyKeys, createPolicyKey, policies } from 'shared/constants';
import client from 'shared/client';

const ACCEPT_ORDER = [policies.TERMS_OF_SERVICE, policies.PRIVACY];

export const getters = {
  /**
   * Generate an object with information about policy, its version,
   * and current datetime as user acceptance date
   *
   * @returns Object in the format
   * { policy_year_month_day: day/month/year hour:minute' }
   * where key is a policy + its version, and value is the current UTC datetime
   */
  getPolicyAcceptedData() {
    return policyName => {
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
  /**
   * @returns A list of policy constants (e.g. policies.PRIVACY)
   * that have not been signed by the user
   */
  nonAcceptedPolicies(state) {
    return policyKeys
      .filter(key => !state.policies[key])
      .map(key => key.split('_').slice(0, -3).join('_'));
  },
  /**
   * @returns `true` if a policy hasn't been
   * accepted yet. Otherwise `false`.
   * Always returns `false` for logged out users.
   */
  isPolicyUnaccepted(state, getters, rootState, rootGetters) {
    return function (policy) {
      if (!rootGetters.loggedIn) {
        return false;
      }

      return getters.nonAcceptedPolicies.includes(policy);
    };
  },
  /**
   * @returns There can be more unaccepted policies.
   * This getter returns the first of them when sorted
   * by predefined order (see ACCEPT_ORDER).
   * Always returns `null` for logged out users.
   */
  firstUnacceptedPolicy(state, getters, rootState, rootGetters) {
    // acceptance information is only relevant to logged in users
    if (!rootGetters.loggedIn) {
      return null;
    }
    const unacceptedPolicies = getters.nonAcceptedPolicies;
    if (!unacceptedPolicies.length) {
      return null;
    }
    return ACCEPT_ORDER.find(policy => unacceptedPolicies.includes(policy));
  },
};

export const mutations = {
  SET_POLICIES(state, policies) {
    for (const policy in policies) {
      set(state.policies, policy, policies[policy]);
    }
  },
};

export const actions = {
  setPolicies(context, policies) {
    context.commit('SET_POLICIES', policies);
  },
  /**
   * Accept a policy
   *
   * @param {Object} policyAcceptedData Object with information about policy,
   * its version, and user acceptance date in the format
   * { policy_year_month_day: day/month/year hour:minute' }
   * @returns {Promise}
   */
  acceptPolicy(context, policyAcceptedData) {
    return client
      .post(window.Urls.policy_update(), { policy: JSON.stringify(policyAcceptedData) })
      .then(() => context.dispatch('setPolicies', policyAcceptedData));
  },
};

export default {
  namespaced: true,
  state() {
    return {
      policies: {},
    };
  },
  getters,
  actions,
  mutations,
};
