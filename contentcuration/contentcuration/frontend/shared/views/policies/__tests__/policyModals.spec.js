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

function getTermsOfServiceModal(wrapper) {
  return wrapper.find('[data-test="tos-modal"]');
}

function getPrivacyModal(wrapper) {
  return wrapper.find('[data-test="privacy-modal"]');
}

function getCommunityStandardsModal(wrapper) {
  return wrapper.find('[data-test="community-standards-modal"]');
}

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
      expect(getPrivacyModal(wrapper).exists()).toBe(true);
      expect(getTermsOfServiceModal(wrapper).exists()).toBe(false);
      expect(getCommunityStandardsModal(wrapper).exists()).toBe(false);
    });
    it('should show terms of service policy modal if it has not been accepted', () => {
      wrapper = makeWrapper({
        getters: {
          isPolicyUnaccepted: () => () => policies.TERMS_OF_SERVICE,
          showPolicy: () => policies.TERMS_OF_SERVICE,
        },
      });
      expect(getTermsOfServiceModal(wrapper).exists()).toBe(true);
    });
    it('should show privacy policy modal if it has not been accepted', () => {
      wrapper = makeWrapper({
        getters: {
          isPolicyUnaccepted: () => () => policies.PRIVACY,
          showPolicy: () => policies.PRIVACY,
        },
      });
      expect(getPrivacyModal(wrapper).exists()).toBe(true);
    });
  });
});
