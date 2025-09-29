import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import cloneDeep from 'lodash/cloneDeep';
import router from '../../../../accounts/router';

import PolicyModals from '../PolicyModals.vue';
import storeFactory from 'shared/vuex/baseStore';
import { policies } from 'shared/constants';
import POLICIES_MODULE_CONFIG from 'shared/vuex/policies';

const localVue = createLocalVue();
localVue.use(Vuex);
localVue.use(VueRouter);

function getTermsOfServiceModal(wrapper) {
  return wrapper.find('[data-test="tos-modal"]');
}

function getPrivacyModal(wrapper) {
  return wrapper.find('[data-test="privacy-modal"]');
}

function getCommunityStandardsModal(wrapper) {
  return wrapper.find('[data-test="community-standards-modal"]');
}

function makeWrapper({ propsData, store, showPolicy }) {
  if (showPolicy) {
    router.replace({ query: { showPolicy } });
  } else {
    router.replace({ query: {} });
  }
  return mount(PolicyModals, {
    propsData,
    localVue,
    router,
    store,
  });
}

describe('policyModals', () => {
  it('smoke test', () => {
    const store = storeFactory();
    const wrapper = makeWrapper({
      store: { ...store, state: { ...store.state, loggedIn: false } },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.is(PolicyModals)).toBe(true);
  });

  it(`should show only terms of service modal
    when terms of service policy is selected`, () => {
    const store = storeFactory();
    const wrapper = makeWrapper({ store, showPolicy: policies.TERMS_OF_SERVICE });

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
    // make sure that the selected policy defaults to first unaccepted policy
    expect(wrapper.vm.selectedPolicy).toBe(policies.TERMS_OF_SERVICE);

    expect(getTermsOfServiceModal(wrapper).exists()).toBe(true);
    expect(getTermsOfServiceModal(wrapper).isVisible()).toBe(true);
    expect(getPrivacyModal(wrapper).exists()).toBe(false);
    expect(getCommunityStandardsModal(wrapper).exists()).toBe(false);
  });

  it(`should show only privacy policy modal
    when privacy policy is selected`, () => {
    const store = storeFactory();
    const wrapper = makeWrapper({ store, showPolicy: policies.PRIVACY });

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
    // make sure that the selected policy defaults to first unaccepted policy
    expect(wrapper.vm.selectedPolicy).toBe(policies.PRIVACY);

    expect(getPrivacyModal(wrapper).exists()).toBe(true);
    expect(getPrivacyModal(wrapper).isVisible()).toBe(true);
    expect(getTermsOfServiceModal(wrapper).exists()).toBe(false);
    expect(getCommunityStandardsModal(wrapper).exists()).toBe(false);
  });

  it(`should should show only community standards modal
    when community standards policy is selected`, () => {
    const store = storeFactory();
    const wrapper = makeWrapper({ store, showPolicy: policies.COMMUNITY_STANDARDS });

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
    const wrapper = makeWrapper({ store, showPolicy: policies.TERMS_OF_SERVICE });

    expect(getTermsOfServiceModal(wrapper).exists()).toBe(true);
    expect(getTermsOfServiceModal(wrapper).isVisible()).toBe(true);
    expect(getPrivacyModal(wrapper).exists()).toBe(false);
    expect(getCommunityStandardsModal(wrapper).exists()).toBe(false);
  });
});
