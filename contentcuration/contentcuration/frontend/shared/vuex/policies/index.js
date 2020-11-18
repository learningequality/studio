import { policyDates, policyKeys, createPolicyKey } from 'shared/constants';
import client from 'shared/client';

export default {
  namespaced: true,
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
    getNonAcceptedPolicies() {
      return policies => {
        return policyKeys
          .filter(key => !policies[key])
          .map(key =>
            key
              .split('_')
              .slice(0, -3)
              .join('_')
          );
      };
    },
  },
  actions: {
    acceptPolicy(context, policy) {
      return client
        .post(window.Urls.policy_update(), { policy: JSON.stringify(policy) })
        .then(() => {
          window.user.policies = {
            ...(window.user.policies || {}),
            ...policy,
          };
        });
    },
  },
};
