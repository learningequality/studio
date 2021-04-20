import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import cloneDeep from 'lodash/cloneDeep';

import PoliciesModal from '../PoliciesModal.vue';
import { policies } from 'shared/constants';
import storeFactory from 'shared/vuex/baseStore';
import POLICIES_STORE_CONFIG from 'shared/vuex/policies';

const localVue = createLocalVue();
localVue.use(Vuex);

function getPolicyModal(wrapper) {
  return wrapper.find('[data-test="policies-modal"]');
}

function getRequiredPolicyModal(wrapper) {
  return wrapper.find('[data-test="policies-modal-required"]');
}

function getAcceptPolicyCheckbox(wrapper) {
  return wrapper.find('[data-test="accept-policy-checkbox"]');
}

function checkAcceptPolicyCheckbox(wrapper) {
  return getAcceptPolicyCheckbox(wrapper)
    .find('input')
    .setChecked(true);
}

function uncheckAcceptPolicyCheckbox(wrapper) {
  return getAcceptPolicyCheckbox(wrapper)
    .find('input')
    .setChecked(false);
}

function clickContinueButton(wrapper) {
  wrapper
    .find('[data-test="accept-policy-form"]')
    .find('form')
    .trigger('submit');
}

function makeWrapper({ propsData, store }) {
  return mount(PoliciesModal, {
    propsData,
    localVue,
    store,
  });
}

describe('PoliciesModal', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('smoke test', () => {
    const store = storeFactory();
    const wrapper = makeWrapper({ store });

    expect(wrapper.isVueInstance()).toBe(true);
  });

  describe('when policy is not required', () => {
    let wrapper;

    beforeEach(() => {
      const policiesStore = cloneDeep(POLICIES_STORE_CONFIG);
      jest
        .spyOn(policiesStore, 'state')
        .mockReturnValue({ selectedPolicy: policies.COMMUNITY_STANDARDS });

      const store = storeFactory({ modules: { policies: policiesStore } });
      wrapper = makeWrapper({
        propsData: {
          policy: policies.COMMUNITY_STANDARDS,
        },
        store,
      });
    });

    it('policy modal should show', () => {
      expect(getPolicyModal(wrapper).exists()).toBe(true);
    });

    it("required policy modal shouldn't show", () => {
      expect(getRequiredPolicyModal(wrapper).exists()).toBe(false);
    });

    it("accept policy checkbox shouldn't show", () => {
      expect(getAcceptPolicyCheckbox(wrapper).exists()).toBe(false);
    });

    it('clicking close button should close modal', () => {
      getPolicyModal(wrapper).vm.$emit('cancel');

      expect(getPolicyModal(wrapper).exists()).toBe(false);
    });
  });

  describe('when policy is required', () => {
    const POLICY_ACCEPTED_DATA = { terms_of_service_2020_12_10: '26/04/21 09:02' };
    let wrapper, acceptPolicy;

    beforeEach(() => {
      const policiesStore = cloneDeep(POLICIES_STORE_CONFIG);
      jest
        .spyOn(policiesStore, 'state')
        .mockReturnValue({ selectedPolicy: policies.TERMS_OF_SERVICE });
      jest
        .spyOn(policiesStore.getters, 'getPolicyAcceptedData')
        .mockReturnValue(() => POLICY_ACCEPTED_DATA);
      jest.spyOn(policiesStore.getters, 'isPolicyUnaccepted').mockReturnValue(() => true);
      acceptPolicy = jest.spyOn(policiesStore.actions, 'acceptPolicy');

      const store = storeFactory({ modules: { policies: policiesStore } });
      wrapper = makeWrapper({
        propsData: {
          policy: policies.TERMS_OF_SERVICE,
        },
        store,
      });
    });

    it('required policy modal should show', () => {
      expect(getRequiredPolicyModal(wrapper).exists()).toBe(true);
    });

    it("policy modal shouldn't show", () => {
      expect(getPolicyModal(wrapper).exists()).toBe(false);
    });

    it('accept policy checkbox should show', () => {
      expect(getAcceptPolicyCheckbox(wrapper).exists()).toBe(true);
    });

    describe('when accept policy checkbox is not checked', () => {
      beforeEach(() => {
        uncheckAcceptPolicyCheckbox(wrapper);
      });

      it('clicking continue button should not accept policy', () => {
        clickContinueButton(wrapper);

        expect(acceptPolicy).not.toHaveBeenCalled();
      });

      it("clicking continue button shouldn't close modal", () => {
        clickContinueButton(wrapper);

        expect(getRequiredPolicyModal(wrapper).exists()).toBe(true);
      });
    });

    describe('when accept policy checkbox is checked', () => {
      beforeEach(() => {
        checkAcceptPolicyCheckbox(wrapper);
      });

      it('clicking continue button should accept policy with correct policy data', () => {
        clickContinueButton(wrapper);

        expect(acceptPolicy).toHaveBeenCalledTimes(1);
        expect(acceptPolicy.mock.calls[0][1]).toEqual(POLICY_ACCEPTED_DATA);
      });
    });
  });
});
