import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import cloneDeep from 'lodash/cloneDeep';

import PolicyModals from '../PolicyModals.vue';
import PrivacyPolicyModal from '../PrivacyPolicyModal.vue';
import TermsOfServiceModal from '../TermsOfServiceModal.vue';
import CommunityStandardsModal from '../CommunityStandardsModal.vue';
import storeFactory from 'shared/vuex/baseStore';
import { policies } from 'shared/constants';
import POLICIES_MODULE_CONFIG from 'shared/vuex/policies';

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

function makeWrapper({ propsData, store }) {
  return mount(PolicyModals, {
    propsData,
    localVue,
    store,
  });
}

describe('policyModals', () => {
  it('smoke test', () => {
    const store = storeFactory();
    const wrapper = makeWrapper({ store });

    expect(wrapper.isVueInstance()).toBe(true);
    expect(wrapper.is(PolicyModals)).toBe(true);
    expect(wrapper.contains(PrivacyPolicyModal)).toBe(true);
    expect(wrapper.contains(TermsOfServiceModal)).toBe(true);
    expect(wrapper.contains(CommunityStandardsModal)).toBe(true);
  });

  it('should show the correct policy modal', () => {
    const policiesModule = cloneDeep(POLICIES_MODULE_CONFIG);
    jest.spyOn(policiesModule.getters, 'showPolicy').mockReturnValue(policies.PRIVACY);
    const store = storeFactory({ modules: { policies: policiesModule } });
    const wrapper = makeWrapper({ store });

    expect(getPrivacyModal(wrapper).exists()).toBe(true);
    expect(getTermsOfServiceModal(wrapper).exists()).toBe(false);
    expect(getCommunityStandardsModal(wrapper).exists()).toBe(false);
  });
});
