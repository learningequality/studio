import _ from 'underscore';
import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount } from '@vue/test-utils';
import LicenseDropdown from '../LicenseDropdown.vue';
import InfoModal from '../InfoModal.vue';
import TestForm from './TestForm.vue';
import { Licenses } from 'shared/constants';

Vue.use(Vuetify);

document.body.setAttribute('data-app', true); // Vuetify prints a warning without this

function makeWrapper() {
  return mount(TestForm, {
    slots: {
      testComponent: LicenseDropdown,
    },
  });
}

describe('licenseDropdown', () => {
  let specialPermissions = _.findWhere(Licenses, { is_custom: true });
  let wrapper;
  let formWrapper;
  beforeEach(() => {
    formWrapper = makeWrapper();
    wrapper = formWrapper.find(LicenseDropdown);
  });

  describe('on load', () => {
    it('all license options should be an option to select', () => {
      _.each(Licenses, license => {
        expect(wrapper.find('.v-list').text()).toContain(license.license_name);
      });
    });
    it('should render according to license prop', () => {
      function test(license) {
        wrapper.setProps({ value: { license: license.id } });
        expect(wrapper.vm.$refs.license.value).toEqual(license.id);
        expect(wrapper.find('.v-textarea').exists()).toBe(license.is_custom);
      }
      _.each(Licenses, test);
    });
    it('should display licenseDescription prop', () => {
      wrapper.setProps({
        value: { license: specialPermissions.id, license_description: 'test description' },
      });
      expect(wrapper.vm.$refs.description.value).toContain('test description');
    });
  });
  describe('props', () => {
    it('setting readonly should prevent any edits', () => {
      wrapper.setProps({ readonly: true, value: { license: specialPermissions.id } });
      expect(wrapper.find('input[readonly]').exists()).toBe(true);
      expect(wrapper.find('textarea[readonly]').exists()).toBe(true);
    });
    it('setting required should make fields required', () => {
      wrapper.setProps({
        required: true,
        value: { license: specialPermissions.id },
      });
      expect(wrapper.find('input:required').exists()).toBe(true);
      expect(wrapper.find('textarea:required').exists()).toBe(true);
    });
    it('setting disabled should make fields disabled', () => {
      wrapper.setProps({ disabled: true, value: { license: specialPermissions.id } });
      expect(wrapper.find('input:disabled').exists()).toBe(true);
      expect(wrapper.find('textarea:disabled').exists()).toBe(true);
    });
  });
  describe('license info modal', () => {
    it('should open the info modal when button is clicked', () => {
      wrapper.setProps({ value: { license: specialPermissions.id } });
      expect(wrapper.find('.v-dialog').isVisible()).toBe(false);
      let button = wrapper.find(InfoModal).find('.v-icon');
      button.trigger('click');
      expect(wrapper.find('.v-dialog').isVisible()).toBe(true);
    });
    it('should render the correct license description', () => {
      function test(license) {
        wrapper.setProps({ value: { license: license.id } });
        expect(wrapper.find('.v-dialog').text()).toContain(license.license_name);
        expect(wrapper.find('.v-dialog').text()).toContain(license.license_description);
      }
      _.each(Licenses, test);
    });
    it('should render a LEARN MORE link to the license information page', () => {
      function test(license) {
        wrapper.setProps({ value: { license: license.id } });
        if (license.license_url)
          expect(wrapper.find('.v-dialog a').attributes('href')).toContain(license.license_url);
        else expect(wrapper.find('.v-dialog a').exists()).toBe(false);
      }
      _.each(Licenses, test);
    });
  });
  describe('change events', () => {
    it('input should be emitted when license is changed', () => {
      expect(wrapper.emitted('input')).toBeFalsy();
      wrapper.find('input').setValue(specialPermissions.id);
      expect(wrapper.emitted('input')).toBeTruthy();
      expect(wrapper.emitted('input')[0][0].license).toEqual(specialPermissions.id.toString());
    });
    it('input should be emitted when description is changed', () => {
      wrapper.setProps({ value: { license: specialPermissions.id } });
      expect(wrapper.emitted('input')).toBeFalsy();
      wrapper.find('textarea').setValue('test license description');
      expect(wrapper.emitted('input')).toBeTruthy();
      expect(wrapper.emitted('input')[0][0].license_description).toEqual(
        'test license description'
      );
    });
  });
  describe('validation', () => {
    it('license is required by default', () => {
      expect(
        wrapper
          .find('.license-dropdown')
          .find('.error--text')
          .exists()
      ).toBe(false);
      formWrapper.vm.validate();
      expect(
        wrapper
          .find('.license-dropdown')
          .find('.error--text')
          .exists()
      ).toBe(true);
      wrapper.setProps({ value: { license: specialPermissions.id } });
      formWrapper.vm.validate();
      expect(
        wrapper
          .find('.license-dropdown')
          .find('.error--text')
          .exists()
      ).toBe(false);
    });
    it('license should not error out when not required', () => {
      wrapper.setProps({ required: false });
      formWrapper.vm.validate();
      expect(
        wrapper
          .find('.license-dropdown')
          .find('.error--text')
          .exists()
      ).toBe(false);
    });
    it('license description is required when license is custom', () => {
      wrapper.setProps({ value: { license: specialPermissions.id } });
      formWrapper.vm.validate();
      expect(
        wrapper
          .find('.v-textarea')
          .find('.error--text')
          .exists()
      ).toBe(true);
      wrapper.setProps({ value: { license: specialPermissions.id, license_description: 'test' } });
      formWrapper.vm.validate();
      expect(
        wrapper
          .find('.v-textarea')
          .find('.error--text')
          .exists()
      ).toBe(false);
      wrapper.setProps({
        value: { license: specialPermissions.id, license_description: null },
      });
      formWrapper.vm.validate();
      expect(
        wrapper
          .find('.v-textarea')
          .find('.error--text')
          .exists()
      ).toBe(true);
    });
  });
});
