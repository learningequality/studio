import { mount } from '@vue/test-utils';
import PolicyModals from '../PolicyModals.vue';
import { policies } from 'shared/constants';

function makeWrapper(nonAcceptedPolicies = []) {
  return mount(PolicyModals, {
    computed: {
      nonAcceptedPolicies() {
        return nonAcceptedPolicies;
      },
      loggedIn() {
        return true;
      },
    },
  });
}

// TODO: update
describe('policyUpdates', () => {
  let wrapper;
  it('should not show any policy modals if all policies have been accepted', () => {
    wrapper = makeWrapper();
    expect(wrapper.vm.showPrivacyPolicy).toBe(false);
    expect(wrapper.vm.showTermsOfService).toBe(false);
  });
  it('should show terms of service policy modal if it has not been accepted', () => {
    wrapper = makeWrapper([policies.TERMS_OF_SERVICE]);
    expect(wrapper.vm.showPrivacyPolicy).toBe(false);
    expect(wrapper.vm.showTermsOfService).toBe(true);
  });
  it('should show privacy policy modal if it has not been accepted', () => {
    wrapper = makeWrapper([policies.PRIVACY]);
    expect(wrapper.vm.showPrivacyPolicy).toBe(true);
    expect(wrapper.vm.showTermsOfService).toBe(false);
  });
});
