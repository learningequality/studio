import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import cloneDeep from 'lodash/cloneDeep';

import PolicyModals from '../PolicyModals.vue';
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
  });

  it(`should show only terms of service modal
    when terms of service policy is selected`, () => {
    const store = storeFactory();
    store.commit('policies/SET_SELECTED_POLICY', policies.TERMS_OF_SERVICE);
    const wrapper = makeWrapper({ store });

    expect(getTermsOfServiceModal(wrapper).exists()).toBe(true);
    expect(getTermsOfServiceModal(wrapper).isVisible()).toBe(true);
    expect(getPrivacyModal(wrapper).exists()).toBe(false);
    expect(getCommunityStandardsModal(wrapper).exists()).toBe(false);
  });

  it(`should show only terms of service modal
    when terms of service policy is the first unaccepted policy
    and there is no other selected policy`, () => {
    const policiesModule = cloneDeep(POLICIES_MODULE_CONFIG);
    jest
      .spyOn(policiesModule.getters, 'firstUnacceptedPolicy')
      .mockReturnValue(policies.TERMS_OF_SERVICE);
    const store = storeFactory({ modules: { policies: policiesModule } });
    const wrapper = makeWrapper({ store });
    // make sure that no policy is selected
    expect(wrapper.vm.$store.getters['policies/selectedPolicy']).toBeNull();

    expect(getTermsOfServiceModal(wrapper).exists()).toBe(true);
    expect(getTermsOfServiceModal(wrapper).isVisible()).toBe(true);
    expect(getPrivacyModal(wrapper).exists()).toBe(false);
    expect(getCommunityStandardsModal(wrapper).exists()).toBe(false);
  });

  it(`should show only privacy policy modal
    when privacy policy is selected`, () => {
    const store = storeFactory();
    store.commit('policies/SET_SELECTED_POLICY', policies.PRIVACY);
    const wrapper = makeWrapper({ store });

    expect(getPrivacyModal(wrapper).exists()).toBe(true);
    expect(getPrivacyModal(wrapper).isVisible()).toBe(true);
    expect(getTermsOfServiceModal(wrapper).exists()).toBe(false);
    expect(getCommunityStandardsModal(wrapper).exists()).toBe(false);
  });

  it(`should show only privacy policy modal
    when privacy policy is the first unaccepted policy
    and there is no other selected policy`, () => {
    const policiesModule = cloneDeep(POLICIES_MODULE_CONFIG);
    jest.spyOn(policiesModule.getters, 'firstUnacceptedPolicy').mockReturnValue(policies.PRIVACY);
    const store = storeFactory({ modules: { policies: policiesModule } });
    const wrapper = makeWrapper({ store });
    // make sure that no policy is selected
    expect(wrapper.vm.$store.getters['policies/selectedPolicy']).toBeNull();

    expect(getPrivacyModal(wrapper).exists()).toBe(true);
    expect(getPrivacyModal(wrapper).isVisible()).toBe(true);
    expect(getTermsOfServiceModal(wrapper).exists()).toBe(false);
    expect(getCommunityStandardsModal(wrapper).exists()).toBe(false);
  });

  it(`should should show only community standards modal
    when community standards policy is selected`, () => {
    const store = storeFactory();
    store.commit('policies/SET_SELECTED_POLICY', policies.COMMUNITY_STANDARDS);
    const wrapper = makeWrapper({ store });

    expect(getCommunityStandardsModal(wrapper).exists()).toBe(true);
    expect(getCommunityStandardsModal(wrapper).isVisible()).toBe(true);
    expect(getTermsOfServiceModal(wrapper).exists()).toBe(false);
    expect(getPrivacyModal(wrapper).exists()).toBe(false);
  });

  it(`a selected policy should have higher priority
    than the first unaccepted policy`, () => {
    // for example, when terms of service policy has been accepted already,
    // and is selected (user wants to preview it), terms of service modal
    // should be displayed, even when privacy policy has not been accepted yet
    const policiesModule = cloneDeep(POLICIES_MODULE_CONFIG);
    jest.spyOn(policiesModule.getters, 'firstUnacceptedPolicy').mockReturnValue(policies.PRIVACY);
    const store = storeFactory({ modules: { policies: policiesModule } });
    store.commit('policies/SET_SELECTED_POLICY', policies.TERMS_OF_SERVICE);
    const wrapper = makeWrapper({ store });

    expect(getTermsOfServiceModal(wrapper).exists()).toBe(true);
    expect(getTermsOfServiceModal(wrapper).isVisible()).toBe(true);
    expect(getPrivacyModal(wrapper).exists()).toBe(false);
    expect(getCommunityStandardsModal(wrapper).exists()).toBe(false);
  });
});
