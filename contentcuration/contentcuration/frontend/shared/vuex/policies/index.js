import findKey from 'lodash/findKey';
import transform from 'lodash/transform';
import { policyDates } from 'shared/constants';

function _parseDateFormat(dateString) {
  const [date, time] = dateString.split(' ');
  const [day, month, year] = date.split('/');
  return date && new Date(`${month}/${day}/${year} ${time}`);
}

function _parsePolicyDate(policyName, key) {
  return new Date(policyName.replace(`${key}_`, '').replaceAll('_', '-'));
}

export default {
  namespaced: true,
  getters: {
    // getPolicies takes an object of accepted policies from the user.
    // returns an object with all the policies, and when the user has
    // last signed them.
    getPolicies() {
      return acceptedPolicies => {
        return transform(
          policyDates,
          (result, latest, key) => {
            const lastPolicyKey = findKey(acceptedPolicies, (v, k) => k.startsWith(key));
            const lastPolicy = acceptedPolicies[lastPolicyKey];

            result[key] = {
              latest,
              signedOn: (lastPolicy && _parseDateFormat(lastPolicy)) || null,
              lastSignedPolicy: (lastPolicyKey && _parsePolicyDate(lastPolicyKey, key)) || null,
            };
          },
          {}
        );
      };
    },
    getPolicyAcceptedData() {
      return policyName => {
        // Get current date string
        const date = new Date();
        const day = ('0' + date.getDate()).slice(-2);
        const month = ('0' + (date.getMonth() + 1)).slice(-2);
        const year = String(date.getFullYear()).slice(-2);
        const dateStr = `${day}/${month}/${year} ${date.getHours()}:${date.getMinutes()}`;

        // Get policy string
        const policyDate = policyDates[policyName];
        const policyYear = policyDate.getFullYear();
        const policyMonth = policyDate.getMonth() + 1;
        const policyDay = policyDate.getDate();
        const policyStr = `${policyName}_${policyYear}_${policyMonth}_${policyDay}`;
        return { [policyStr]: dateStr };
      };
    },
    // returns a list of policy constants (e.g. policies.PRIVACY)
    // that have not been signed by the user.
    getNonAcceptedPolicies(state, getters) {
      return policies => {
        var policiesList = getters.getPolicies(policies);
        return Object.entries(policiesList)
          .map(([key, value]) => {
            if (
              !value.lastSignedPolicy || // if they never signed anything, or...
              // the last thing they signed isn't equal to the latest policy
              value.latest.getTime() != value.lastSignedPolicy.getTime()
            ) {
              return key;
            }
          })
          .filter(Boolean); // remove any undefined in the list
      };
    },
  },
};
