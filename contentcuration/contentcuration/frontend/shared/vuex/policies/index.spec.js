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
  describe('getNonAcceptedPolicies getter', () => {
    it('should return empty array if all policies have been accepted', () => {
      const allPolicies = transform(
        policyDates,
        (result, value, key) => {
          const policyKey = `${key}_${value.getFullYear()}_${value.getMonth() +
            1}_${value.getDate()}`;
          return (result[policyKey] = '01/01/2000 12:12');
        },
        {}
      );
      console.log(allPolicies)
      expect(store.getters['policies/getNonAcceptedPolicies'](allPolicies)).toEqual([]);
    });
    it('should return array of all policies that still need to be accepted', () => {
      expect(store.getters['policies/getNonAcceptedPolicies']({})).toEqual(Object.values(policies));
    });
    it('should return array of policies that have been updated since they were last accepted', () => {
      expect(
        store.getters['policies/getNonAcceptedPolicies']({
          [`${policies.TERMS_OF_SERVICE}_1900_2_2`]: '01/01/2000 12:12',
        })
      ).toContain(policies.TERMS_OF_SERVICE);
    });
  });
  describe('getPolicyAcceptedData getter', () => {
    it('should return data in the format {policy_year_month_date: day/month/year hour:minute', () => {
      const testKey = policies.PRIVACY;
      const date = policyDates[testKey];
      const now = new Date();
      const day = ('0' + now.getDate()).slice(-2);
      const month = ('0' + (now.getMonth() + 1)).slice(-2);
      const year = String(now.getFullYear()).slice(-2);
      const hour = ('0' + (now.getHours() + 1)).slice(-2);
      const minute = ('0' + (now.getMinutes() + 1)).slice(-2);

      const expectedKey = `${testKey}_${date.getFullYear()}_${date.getMonth() +
        1}_${date.getDate()}`;
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
