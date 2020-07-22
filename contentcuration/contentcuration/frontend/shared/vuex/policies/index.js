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
  },
};
// privacy_policy_2018_5_25
