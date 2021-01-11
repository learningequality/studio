import transform from 'lodash/transform';
import storeFactory from 'shared/vuex/baseStore';
import { policies, policyDates } from 'shared/constants';
import client from 'shared/client';

jest.mock('shared/client');
jest.mock('shared/vuex/connectionPlugin');

describe('policies store', () => {
  let store;
  beforeEach(() => {
    window.user = {};
    store = storeFactory();
  });

  describe('nonAcceptedPolicies getter', () => {
    it('should return empty array if all policies have been accepted', () => {
      const allPolicies = transform(
        policyDates,
        (result, value, key) => {
          const policyKey = `${key}_${value.getUTCFullYear()}_${value.getUTCMonth() +
            1}_${value.getUTCDate()}`;
          return (result[policyKey] = '01/01/2000 12:12');
        },
        {}
      );
      store.state.policies = {
        policies: allPolicies,
        selectedPolicy: null,
      };

      expect(store.getters['policies/nonAcceptedPolicies']).toEqual([]);
    });
    it('should return array of all policies that still need to be accepted', () => {
      expect(store.getters['policies/nonAcceptedPolicies']).toEqual(Object.values(policies));
    });
    it('should return array of policies that have been updated since they were last accepted', () => {
      const testTOSPolicyData = {
        [`${policies.TERMS_OF_SERVICE}_1900_2_2`]: '01/01/2000 12:12',
      };
      store.commit('policies/SET_POLICIES', testTOSPolicyData);
      expect(store.getters['policies/nonAcceptedPolicies']).toContain(policies.TERMS_OF_SERVICE);
    });
  });
  describe('getPolicyAcceptedData getter', () => {
    it('should return data in the format {policy_year_month_date: day/month/year hour:minute', () => {
      const testKey = policies.PRIVACY;
      const date = policyDates[testKey];
      const now = new Date();
      const day = ('0' + now.getUTCDate()).slice(-2);
      const month = ('0' + (now.getUTCMonth() + 1)).slice(-2);
      const year = String(now.getUTCFullYear()).slice(-2);
      const hour = ('0' + (now.getUTCHours() + 1)).slice(-2);
      const minute = ('0' + (now.getUTCMinutes() + 1)).slice(-2);

      const expectedKey = `${testKey}_${date.getUTCFullYear()}_${date.getUTCMonth() +
        1}_${date.getUTCDate()}`;
      const expectedValue = `${day}/${month}/${year} ${hour}:${minute}`;
      expect(store.getters['policies/getPolicyAcceptedData'](policies.PRIVACY)).toEqual({
        [expectedKey]: expectedValue,
      });
    });
  });
  describe('acceptPolicy action', () => {
    const testData = { testpolicy: 'test' };
    it('should call policy_update endpoint', () => {
      client.post.mockResolvedValue(Promise.resolve());
      return store.dispatch('policies/acceptPolicy', testData).then(() => {
        expect(client.post.mock.calls[0][0]).toBe('policy_update');
        expect(client.post.mock.calls[0][1]).toEqual({ policy: JSON.stringify(testData) });
      });
    });
    it('should update window.user with the new data', () => {
      window.user.policies = { policy: 'signed' };
      client.post.mockResolvedValue(Promise.resolve());
      return store.dispatch('policies/acceptPolicy', testData).then(() => {
        expect(window.user.policies).toEqual({
          policy: 'signed',
          ...testData,
        });
      });
    });
  });
});
