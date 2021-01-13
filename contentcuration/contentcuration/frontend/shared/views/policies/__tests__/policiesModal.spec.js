import { mount } from '@vue/test-utils';
import PoliciesModal from '../PoliciesModal.vue';
import { policies } from 'shared/constants';

const testPolicyData = {
  [`${policies.TERMS_OF_SERVICE}_2000_1_1`]: '01/01/2000 12:00',
};
window.user = {};

function makeWrapper({ propsData = {}, computedValues = {}, methods = {} }) {
  const { showPolicy, isPolicyUnaccepted = true } = computedValues;

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
        return () => isPolicyUnaccepted;
      },
      showPolicy() {
        return showPolicy ? policies.TERMS_OF_SERVICE : null;
      },
    },
    methods,
  });
}

describe('policiesModal', () => {
  let wrapper;

  describe('when policy is not required', () => {
    let closePolicy = null;

    beforeEach(() => {
      closePolicy = jest.fn();
      wrapper = makeWrapper({
        computedValues: {
          isPolicyUnaccepted: false,
          showPolicy: true,
        },
        methods: {
          closePolicy,
        },
      });
    });

    it('modal shows', () => {
      expect(wrapper.find('[data-test="policies-modal"]').exists()).toBe(true);
    });
    it('checkbox should be hidden', () => {
      expect(wrapper.find('[data-test="accept"]').exists()).toBe(false);
    });
    it('closing modal should just close the dialog', () => {
      expect(closePolicy).not.toHaveBeenCalled();
      wrapper.vm.submit().then(() => {
        expect(closePolicy).toHaveBeenCalled();
      });
    });
  });
  describe('when policy is required', () => {
    let acceptPolicy;

    beforeEach(() => {
      acceptPolicy = jest.fn().mockReturnValue(Promise.resolve());
      wrapper = makeWrapper({
        propsData: { requirePolicyAcceptance: true },
        methods: {
          acceptPolicy,
        },
      });
    });
    it('checkbox should be visible', () => {
      expect(wrapper.find('[data-test="accept"]').exists()).toBe(true);
    });
    it('closing modal should not close the dialog if checkbox is not checked', () => {
      wrapper.vm.submit().then(() => {
        expect(acceptPolicy).not.toHaveBeenCalled();
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
        expect(acceptPolicy).toHaveBeenCalled();
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
