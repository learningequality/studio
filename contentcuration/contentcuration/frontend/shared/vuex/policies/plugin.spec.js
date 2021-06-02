import { Store } from 'vuex';

import PoliciesPlugin from './plugin';

const store = new Store({
  modules: {
    policies: {
      namespaced: true,
      actions: {
        setPolicies: jest.fn(),
      },
      mutations: {
        SET_POLICIES: jest.fn(),
      },
    },
  },
  plugins: [PoliciesPlugin],
});

describe('PoliciesPlugin', () => {
  beforeEach(() => {
    window.user = {};
  });

  afterEach(() => {
    window.user = {};
  });

  it('should update `window.user` with new data on policies store update', () => {
    window.user.policies = { terms_of_service_2020_12_10: '01/01/2000 12:12' };
    store.dispatch('policies/setPolicies', { privacy_policy_2020_12_10: '12/05/2021 09:56' });

    expect(window.user.policies).toEqual({
      terms_of_service_2020_12_10: '01/01/2000 12:12',
      privacy_policy_2020_12_10: '12/05/2021 09:56',
    });
  });
});
