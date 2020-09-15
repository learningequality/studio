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
