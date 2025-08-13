import { mount } from '@vue/test-utils';
import VisibilityDropdown from '../VisibilityDropdown.vue';
import TestForm from './TestForm.vue';
import Roles from 'shared/leUtils/Roles';
import { constantStrings } from 'shared/mixins';

async function makeWrapper(propsData = {}) {
  const form = mount(TestForm);
  await form.vm.$nextTick();
  const field = mount(VisibilityDropdown, {
    attachTo: form.element,
    propsData,
  });
  return [form, field];
}

const RolesArray = Array.from(Roles);

describe('visibilityDropdown', () => {
  let wrapper;
  let formWrapper;
  beforeEach(async () => {
    [formWrapper, wrapper] = await makeWrapper();
  });

  describe('on load', () => {
    it.each(RolesArray)('all visibility options should be an option to select', async role => {
      await wrapper.find('.v-input__slot').trigger('click');
      expect(wrapper.findComponent('.v-list').text()).toContain(constantStrings.$tr(role));
    });

    it.each(RolesArray)('should render according to visibility prop %s', async visibility => {
      await wrapper.setProps({ value: visibility });
      expect(wrapper.vm.$refs.visibility.value).toEqual(visibility);
    });
  });

  describe('props', () => {
    it('setting readonly should prevent any edits', async () => {
      expect(wrapper.findComponent({ ref: 'visibility' }).classes()).not.toContain(
        'v-input--is-readonly',
      );
      await wrapper.setProps({ readonly: true });
      expect(wrapper.findComponent({ ref: 'visibility' }).classes()).toContain(
        'v-input--is-readonly',
      );
    });

    it('setting required should make fields required', async () => {
      expect(
        wrapper.findComponent({ ref: 'visibility' }).find('input').attributes('required'),
      ).toBeFalsy();
      await wrapper.setProps({ required: true });
      expect(
        wrapper.findComponent({ ref: 'visibility' }).find('input').attributes('required'),
      ).toEqual('required');
    });

    it('validation should flag empty required fields', async () => {
      formWrapper.vm.validate();
      await wrapper.vm.$nextTick();
      expect(wrapper.findComponent('.error--text').exists()).toBe(false);
      await wrapper.setProps({ required: true, value: null });
      formWrapper.vm.validate();
      await wrapper.vm.$nextTick();
      expect(wrapper.findComponent('.error--text').exists()).toBe(true);
    });

    it('setting disabled should make fields required', async () => {
      expect(
        wrapper.findComponent({ ref: 'visibility' }).find('input').attributes('disabled'),
      ).toBeFalsy();
      await wrapper.setProps({ disabled: true });
      expect(
        wrapper.findComponent({ ref: 'visibility' }).find('input').attributes('disabled'),
      ).toEqual('disabled');
    });
  });

  describe('emitted events', () => {
    it('should emit changed event when visibility is changed', () => {
      const firstRole = Roles.values().next().value;
      expect(wrapper.emitted('input')).toBeFalsy();
      wrapper.find('input').setValue(firstRole);
      expect(wrapper.emitted('input')).toBeTruthy();
      expect(wrapper.emitted('input')[0][0]).toEqual(firstRole);
    });
  });
});
