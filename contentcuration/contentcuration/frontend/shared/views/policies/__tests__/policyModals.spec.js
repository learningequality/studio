import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';

import PolicyModals from '../PolicyModals.vue';
import PrivacyPolicyModal from '../PrivacyPolicyModal.vue';
import TermsOfServiceModal from '../TermsOfServiceModal.vue';
import CommunityStandardsModal from '../CommunityStandardsModal.vue';
import storeFactory from 'shared/vuex/baseStore';
import { policies } from 'shared/constants';

const localVue = createLocalVue();
localVue.use(Vuex);

const makeWrapper = ({ getters = {} } = {}) => {
  const store = storeFactory({
    modules: {
      policies: {
        namespaced: true,
        getters: {
          showPolicy: () => null,
          isPolicyUnaccepted: () => jest.fn(),
          getPolicyAcceptedData: () => jest.fn(),
          nonAcceptedPolicies: () => [],
          ...getters,
        },
      },
    },
  });

  return mount(PolicyModals, {
    localVue,
    store,
  });
};

describe('policyModals', () => {
  it('smoke test', () => {
    const wrapper = makeWrapper();
    expect(wrapper.isVueInstance()).toBe(true);
    expect(wrapper.is(PolicyModals)).toBe(true);
    expect(wrapper.contains(PrivacyPolicyModal)).toBe(true);
    expect(wrapper.contains(TermsOfServiceModal)).toBe(true);
    expect(wrapper.contains(CommunityStandardsModal)).toBe(true);
  });

  describe('when mounted', () => {
    let wrapper;
    it('should show the correct policy modal', () => {
      wrapper = makeWrapper({
        getters: {
          showPolicy: () => policies.PRIVACY,
        },
      });
      expect(wrapper.find(PrivacyPolicyModal).attributes('aria-hidden')).toBe('false');
      expect(wrapper.find(TermsOfServiceModal).attributes('aria-hidden')).toBe('true');
      expect(wrapper.find(CommunityStandardsModal).attributes('aria-hidden')).toBe('true');
    });
    it('should show terms of service policy modal if it has not been accepted', () => {
      wrapper = makeWrapper({
        getters: {
          isPolicyUnaccepted: () => () => policies.TERMS_OF_SERVICE,
          showPolicy: () => policies.TERMS_OF_SERVICE,
        },
      });
      expect(wrapper.find(TermsOfServiceModal).attributes('persistent')).toBe('terms_of_service');
      expect(wrapper.find(TermsOfServiceModal).attributes('aria-hidden')).toBe('false');
      expect(wrapper.find(PrivacyPolicyModal).attributes('aria-hidden')).toBe('true');
    });
    it('should show privacy policy modal if it has not been accepted', () => {
      wrapper = makeWrapper({
        getters: {
          isPolicyUnaccepted: () => () => policies.PRIVACY,
          showPolicy: () => policies.PRIVACY,
        },
      });
      expect(wrapper.find(PrivacyPolicyModal).attributes('persistent')).toBe('privacy_policy');
      expect(wrapper.find(PrivacyPolicyModal).attributes('aria-hidden')).toBe('false');
      expect(wrapper.find(TermsOfServiceModal).attributes('aria-hidden')).toBe('true');
    });
  });
});
