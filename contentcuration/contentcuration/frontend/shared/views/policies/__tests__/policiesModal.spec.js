import { mount } from '@vue/test-utils';

import PoliciesModal from '../PoliciesModal.vue';
import { policies, policyDates } from 'shared/constants';

describe('PoliciesModal', () => {
  it('smoke test', () => {
    const wrapper = mount(PoliciesModal, {
      propsData: {
        policy: policies.TERMS_OF_SERVICE,
      },
    });

    expect(wrapper.exists()).toBe(true);
  });

  it('renders a policy title', () => {
    const wrapper = mount(PoliciesModal, {
      propsData: {
        title: 'Updated Terms Of Service',
        policy: policies.TERMS_OF_SERVICE,
      },
    });

    expect(wrapper.text()).toContain('Updated Terms Of Service');
  });

  it("renders a date of a policy's last update", () => {
    const wrapper = mount(PoliciesModal, {
      propsData: {
        policy: policies.TERMS_OF_SERVICE,
      },
    });
    const formattedDate = wrapper.vm.$formatDate(policyDates[policies.TERMS_OF_SERVICE]);

    expect(wrapper.text()).toContain(`Last updated ${formattedDate}`);
  });

  describe("when a policy doesn't need acceptance", () => {
    let wrapper;

    beforeEach(() => {
      wrapper = mount(PoliciesModal, {
        propsData: {
          needsAcceptance: false,
          policy: policies.TERMS_OF_SERVICE,
        },
      });
    });

    it("accept checkbox shouldn't show", () => {
      expect(wrapper.find('[data-test="accept-checkbox"]').exists()).toBe(false);
    });

    it("continue button shouldn't show", () => {
      expect(wrapper.find('[data-test="continue-button"]').exists()).toBe(false);
    });

    it('close button should show', () => {
      expect(wrapper.find('[data-test="close-button"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="close-button"]').isVisible()).toBe(true);
    });

    it('clicking close button should emit close event', () => {
      wrapper.find('[data-test="close-button"]').trigger('click');

      expect(wrapper.emitted().close).toBeTruthy();
      expect(wrapper.emitted().close.length).toBe(1);
    });
  });

  describe('when a policy needs acceptance', () => {
    let wrapper;

    beforeEach(() => {
      wrapper = mount(PoliciesModal, {
        propsData: {
          needsAcceptance: true,
          policy: policies.TERMS_OF_SERVICE,
        },
      });
    });

    it("close button shouldn't show", () => {
      expect(wrapper.find('[data-test="close-button"]').exists()).toBe(false);
    });

    it('accept checkbox should show', () => {
      expect(wrapper.find('[data-test="accept-checkbox"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="accept-checkbox"]').isVisible()).toBe(true);
    });

    it('continue button should show', () => {
      expect(wrapper.find('[data-test="continue-button"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="continue-button"]').isVisible()).toBe(true);
    });

    describe('when accept policy checkbox is not checked', () => {
      it('disable continue button', () => {
        expect(wrapper.find('[data-test="continue-button"]').attributes().disabled).toEqual(
          'disabled',
        );
      });
    });

    describe('when accept policy checkbox is checked', () => {
      beforeEach(() => {
        wrapper.find('[data-test="accept-checkbox"]').vm.$emit('change');
      });

      it("clicking continue button shouldn't display validation error", () => {
        wrapper.find('[data-test="continue-button"]').trigger('click');

        expect(wrapper.text()).not.toContain('Field is required');
      });

      it('clicking continue button should emit accept event', () => {
        wrapper.find('[data-test="continue-button"]').trigger('click');

        expect(wrapper.emitted().accept).toBeTruthy();
        expect(wrapper.emitted().accept.length).toBe(1);
      });
    });
  });
});
