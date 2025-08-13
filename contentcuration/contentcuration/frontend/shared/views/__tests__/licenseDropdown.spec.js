import { mount } from '@vue/test-utils';
import LicenseDropdown from '../LicenseDropdown.vue';
import TestForm from './TestForm.vue';
import { LicensesList } from 'shared/leUtils/Licenses';

async function makeWrapper(opts = {}) {
  const formWrapper = mount(TestForm);
  await formWrapper.vm.$nextTick();
  const wrapper = mount(LicenseDropdown, {
    attachTo: formWrapper.element,
    ...opts,
  });
  return [wrapper, formWrapper];
}

describe('licenseDropdown', () => {
  const specialPermissions = LicensesList.find(l => l.is_custom);
  let wrapper;
  let formWrapper;

  beforeEach(async () => {
    [wrapper, formWrapper] = await makeWrapper();
  });

  describe('on load', () => {
    it.each(LicensesList)('%s license option should be an option to select', async license => {
      await wrapper.findComponent('.v-input__slot').trigger('click');
      expect(wrapper.findComponent('.v-list').text()).toContain(license.license_name);
    });

    it.each(LicensesList)(
      'should render license when value is set to a license id $id',
      async license => {
        await wrapper.setProps({ value: { license: license.id } });
        expect(wrapper.vm.$refs.license.value).toEqual(license.id);
        expect(wrapper.findComponent('.v-textarea').exists()).toBe(license.is_custom);
      },
    );

    it.each(LicensesList)(
      'should render license when value is set to a license name $name',
      async license => {
        await wrapper.setProps({ value: { license: license.license_name } });
        expect(wrapper.vm.$refs.license.value).toEqual(license.id);
        expect(wrapper.findComponent('.v-textarea').exists()).toBe(license.is_custom);
      },
    );

    it('should display licenseDescription prop', async () => {
      await wrapper.setProps({
        value: { license: specialPermissions.id, license_description: 'test description' },
      });
      expect(wrapper.vm.$refs.description.value).toContain('test description');
    });
  });

  describe('props', () => {
    it('setting readonly should prevent any edits', async () => {
      await wrapper.setProps({ readonly: true, value: { license: specialPermissions.id } });
      expect(wrapper.find('input[readonly]').exists()).toBe(true);
      expect(wrapper.find('textarea[readonly]').exists()).toBe(true);
    });

    it('setting required should make fields required', async () => {
      await wrapper.setProps({
        required: true,
        value: { license: specialPermissions.id },
      });
      expect(wrapper.find('input:required').exists()).toBe(true);
      expect(wrapper.find('textarea:required').exists()).toBe(true);
    });

    it('setting disabled should make fields disabled', async () => {
      await wrapper.setProps({ disabled: true, value: { license: specialPermissions.id } });
      expect(wrapper.find('input:disabled').exists()).toBe(true);
      expect(wrapper.find('textarea:disabled').exists()).toBe(true);
    });
  });

  describe('change events', () => {
    it('input should be emitted when license is changed', async () => {
      expect(wrapper.emitted('input')).toBeFalsy();
      wrapper.find('input').setValue(specialPermissions.id);
      expect(wrapper.emitted('input')).toBeTruthy();
      expect(wrapper.emitted('input')[0][0].license).toEqual(specialPermissions.id);
    });

    it('input should be emitted when description is changed', async () => {
      await wrapper.setProps({ value: { license: specialPermissions.id } });
      expect(wrapper.emitted('input')).toBeFalsy();
      await wrapper.find('textarea').setValue('test license description');

      expect(wrapper.emitted('input')).toBeTruthy();
      expect(wrapper.emitted('input')[0][0].license_description).toEqual(
        'test license description',
      );
    });
  });

  describe('validation', () => {
    it('license is required by default', async () => {
      expect(wrapper.find('.error--text').exists()).toBe(false);
      await wrapper.setProps({ value: { license: null } });
      formWrapper.vm.validate();
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.error--text').exists()).toBe(true);

      await wrapper.setProps({ value: { license: specialPermissions.id } });
      formWrapper.vm.validate();
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.error--text').exists()).toBe(false);
    });

    it('license should not error out when not required', async () => {
      await wrapper.setProps({ required: false });
      formWrapper.vm.validate();
      await wrapper.vm.$nextTick();
      expect(wrapper.find('.error--text').exists()).toBe(false);
    });

    it.skip('license description is required when license is custom', async () => {
      await wrapper.setProps({
        required: true,
        readonly: false,
        value: { license: specialPermissions.id, license_description: '' },
      });
      expect(wrapper.vm.license).toEqual(specialPermissions.id);
      expect(wrapper.vm.isCustom).toBe(true);
      expect(wrapper.vm.description).toEqual('');

      const description = wrapper.findComponent({ ref: 'description' });
      await description.find('textarea').setValue('');
      await description.trigger('blur');
      description.vm.blur();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      formWrapper.vm.validate();
      await wrapper.vm.$nextTick();
      await wrapper.vm.$nextTick();
      // TODO: the following could not be achieved
      expect(description.classes('error--text')).toBe(true);

      await wrapper.setProps({
        value: { license: specialPermissions.id, license_description: 'test' },
      });
      formWrapper.vm.validate();
      await wrapper.vm.$nextTick();
      expect(description.classes('error--text')).toBe(false);

      await wrapper.setProps({
        value: { license: specialPermissions.id, license_description: null },
      });
      formWrapper.vm.validate();
      await wrapper.vm.$nextTick();
      expect(description.classes('error--text')).toBe(true);
    });
  });
});
