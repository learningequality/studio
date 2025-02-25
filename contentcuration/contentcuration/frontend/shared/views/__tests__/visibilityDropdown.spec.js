import { mount } from '@vue/test-utils';
import VisibilityDropdown from '../VisibilityDropdown.vue';
import TestForm from './TestForm.vue';
import Roles from 'shared/leUtils/Roles';
import { constantStrings } from 'shared/mixins';

document.body.setAttribute('data-app', true); // Vuetify prints a warning without this

function makeWrapper() {
  return mount(TestForm, {
    slots: {
      testComponent: VisibilityDropdown,
    },
  });
}

const RolesArray = Array.from(Roles);

describe('visibilityDropdown', () => {
  let wrapper;
  let formWrapper;
  beforeEach(() => {
    formWrapper = makeWrapper();
    wrapper = formWrapper.find(VisibilityDropdown);
  });

  describe('on load', () => {
    it.each(RolesArray)('all visibility options should be an option to select', async role => {
      await wrapper.find('.v-input__slot').trigger('click');
      expect(wrapper.find('.v-list').text()).toContain(constantStrings.$tr(role));
    });
    it.each(RolesArray)('should render according to visibility prop %s', visibility => {
      wrapper.setProps({ value: visibility });
      expect(wrapper.vm.$refs.visibility.value).toEqual(visibility);
    });
  });
  describe('props', () => {
    it('setting readonly should prevent any edits', () => {
      expect(wrapper.find({ ref: 'visibility' }).classes()).not.toContain('v-input--is-readonly');
      wrapper.setProps({ readonly: true });
      expect(wrapper.find({ ref: 'visibility' }).classes()).toContain('v-input--is-readonly');
    });
    it('setting required should make fields required', () => {
      expect(wrapper.find({ ref: 'visibility' }).find('input').attributes('required')).toBeFalsy();
      wrapper.setProps({ required: true });
      expect(wrapper.find({ ref: 'visibility' }).find('input').attributes('required')).toEqual(
        'required',
      );
    });
    it('validation should flag empty required fields', () => {
      formWrapper.vm.validate();
      expect(wrapper.find('.error--text').exists()).toBe(false);
      wrapper.setProps({ required: true, value: null });
      formWrapper.vm.validate();
      expect(wrapper.find('.error--text').exists()).toBe(true);
    });
    it('setting disabled should make fields required', () => {
      expect(wrapper.find({ ref: 'visibility' }).find('input').attributes('disabled')).toBeFalsy();
      wrapper.setProps({ disabled: true });
      expect(wrapper.find({ ref: 'visibility' }).find('input').attributes('disabled')).toEqual(
        'disabled',
      );
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
