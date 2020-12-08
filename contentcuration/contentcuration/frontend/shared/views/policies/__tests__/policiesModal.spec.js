import { mount } from '@vue/test-utils';
import PoliciesModal from '../PoliciesModal.vue';
import { policies } from 'shared/constants';

const testPolicyData = {
  [`${policies.TERMS_OF_SERVICE}_2000_1_1`]: '01/01/2000 12:00',
};
window.user = {};

function makeWrapper(propsData = {}) {
  return mount(PoliciesModal, {
    propsData: {
      ignoreAcceptance: false,
      policy: policies.TERMS_OF_SERVICE,
      ...propsData,
    },
    computed: {
      getPolicyAcceptedData() {
        return () => testPolicyData;
      },
      isPolicyUnaccepted() {
        return () => testPolicyData;
      },
      showPolicy() {
        return () => testPolicyData;
      },
    },
  });
}

describe('policyModal', () => {
  let wrapper;

  describe('when policy is not required', () => {
    beforeEach(() => {
      wrapper = makeWrapper();
    });

    //TODO: fix below
    it('checkbox should be hidden', () => {
      expect(wrapper.find('[data-test="accept"]').exists()).toBe(false);
    });
    it('closing modal should just close the dialog', () => {
      wrapper.vm.submit().then(() => {
        expect(wrapper.emitted('input')[0][0]).toBe(false);
      });
    });
  });
  describe('when policy is required', () => {
    let acceptPolicy;
    beforeEach(() => {
      acceptPolicy = jest.fn().mockReturnValue(Promise.resolve());
      wrapper = makeWrapper({ requirePolicyAcceptance: true });
      wrapper.setMethods({ acceptPolicy });
    });
    it('checkbox should be visible', () => {
      expect(wrapper.find('[data-test="accept"]').exists()).toBe(true);
    });
    it('closing modal should not close the dialog if checkbox is not checked', () => {
      wrapper.vm.submit().then(() => {
        expect(wrapper.emitted('input')).toBeUndefined();
      });
    });
    it('closing modal should not call acceptPolicy if checkbox is not checked', () => {
      wrapper.vm.submit().then(() => {
        expect(acceptPolicy).not.toHaveBeenCalled();
      });
    });
    it('closing modal should close the dialog if checkbox is checked', () => {
      wrapper.setData({ policyAccepted: true });
      wrapper.vm.submit().then(() => {
        expect(wrapper.emitted('input')[0][0]).toBe(false);
      });
    });
    it('closing modal should call acceptPolicy if checkbox is checked', () => {
      wrapper.setData({ policyAccepted: true });
      wrapper.vm.submit().then(() => {
        expect(acceptPolicy).toHaveBeenCalled();
      });
    });
    it('closing modal should call acceptPolicy with policy data', () => {
      wrapper.setData({ policyAccepted: true });
      wrapper.vm.submit().then(() => {
        expect(acceptPolicy).toHaveBeenCalledWith(testPolicyData);
      });
    });
  });
});
