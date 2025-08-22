import { actions, getters } from './index';
import { policies, policyDates } from 'shared/constants';
import client from 'shared/client';

jest.mock('shared/client');

describe('policies store', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getters', () => {
    describe('nonAcceptedPolicies', () => {
      it('should return empty array if all policies have been accepted', () => {
        const state = {
          policies: {
            privacy_policy_2020_12_10: '01/01/2000 12:12',
            terms_of_service_2020_12_10: '01/01/2000 12:12',
            community_standards_2020_8_30: '01/01/2000 12:12',
          },
        };

        expect(getters.nonAcceptedPolicies(state)).toEqual([]);
      });

      it('should return array of all policies that still need to be accepted', () => {
        const state = {
          policies: {
            privacy_policy_2020_12_10: undefined,
            terms_of_service_2020_12_10: undefined,
            community_standards_2020_8_30: '01/01/2000 12:12',
          },
        };

        expect(getters.nonAcceptedPolicies(state)).toEqual(['privacy_policy', 'terms_of_service']);
      });

      it('should return array of policies that have been updated since they were last accepted', () => {
        const state = {
          policies: {
            terms_of_service_1900_2_2: '01/01/1901 12:12',
            terms_of_service_2020_12_10: undefined,
            privacy_policy_1900_2_2: '01/01/1901 12:12',
            privacy_policy_2020_12_10: '01/01/2021 12:12',
            community_standards_1900_2_2: '01/01/1901 12:12',
            community_standards_2020_8_30: '01/01/2021 12:12',
          },
        };

        expect(getters.nonAcceptedPolicies(state)).toEqual(['terms_of_service']);
      });
    });

    describe('firstUnacceptedPolicy', () => {
      it(`should return null when a user is logged in
        and all policies are accepted`, () => {
        expect(
          getters.firstUnacceptedPolicy(
            {}, // state
            { nonAcceptedPolicies: [] }, // getters
            {}, // rootState
            { loggedIn: true }, // rootGetters
          ),
        ).toBeNull();
      });

      it(`should return terms of service when a user is logged in
        and both terms of service and privacy policy are not accepted`, () => {
        expect(
          getters.firstUnacceptedPolicy(
            {}, // state
            { nonAcceptedPolicies: ['privacy_policy', 'terms_of_service'] }, // getters
            {}, // rootState
            { loggedIn: true }, // rootGetters
          ),
        ).toEqual('terms_of_service');
      });

      it('should return null when a user is logged out', () => {
        expect(
          getters.firstUnacceptedPolicy(
            {}, // state
            { nonAcceptedPolicies: ['privacy_policy', 'terms_of_service'] }, // getters
            {}, // rootState
            { loggedIn: false }, // rootGetters
          ),
        ).toBeNull();
      });
    });

    describe('getPolicyAcceptedData', () => {
      it(`should return data in the format {policy_year_month_day: day/month/year hour:minute
        where key is a policy and value is the current UTC datetime`, () => {
        // an example of the expected object:
        // { privacy_policy_2020_12_10: '30/04/21 16:45' }

        const testKey = policies.PRIVACY;
        const date = policyDates[testKey];
        const now = new Date();
        const day = ('0' + now.getUTCDate()).slice(-2);
        const month = ('0' + (now.getUTCMonth() + 1)).slice(-2);
        const year = String(now.getUTCFullYear()).slice(-2);
        const hour = ('0' + (now.getUTCHours() + 1)).slice(-2);
        const minute = ('0' + (now.getUTCMinutes() + 1)).slice(-2);

        const expectedKey = `${testKey}_${date.getUTCFullYear()}_${
          date.getUTCMonth() + 1
        }_${date.getUTCDate()}`;
        const expectedValue = `${day}/${month}/${year} ${hour}:${minute}`;

        expect(getters.getPolicyAcceptedData()(policies.PRIVACY)).toEqual({
          [expectedKey]: expectedValue,
        });
      });
    });
  });

  describe('actions', () => {
    describe('acceptPolicy', () => {
      let dispatch;

      beforeEach(() => {
        client.post.mockResolvedValue(Promise.resolve());
        dispatch = jest.fn().mockResolvedValue();
      });

      it('should call policy_update endpoint', async () => {
        const policyAcceptedData = { privacy_policy_2020_12_10: '12/05/2021 09:56' };
        await actions.acceptPolicy({ getters, dispatch }, policyAcceptedData);

        expect(client.post.mock.calls.length).toBe(1);
        expect(client.post.mock.calls[0][0]).toBe('policy_update');
        expect(client.post.mock.calls[0][1]).toEqual({
          policy: JSON.stringify(policyAcceptedData),
        });
      });

      it('should call setPolicies with the new data and closePolicy', async () => {
        const policyAcceptedData = { privacy_policy_2020_12_10: '12/05/2021 09:56' };
        await actions.acceptPolicy({ getters, dispatch }, policyAcceptedData);

        expect(dispatch.mock.calls.length).toBe(1);
        expect(dispatch.mock.calls[0]).toEqual(['setPolicies', policyAcceptedData]);
      });
    });
  });
});
