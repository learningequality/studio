import _ from 'underscore';
import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount } from '@vue/test-utils';
import LicenseDropdown from '../LicenseDropdown.vue';
import InfoModal from '../InfoModal.vue';
import Constants from 'edit_channel/constants';

Vue.use(Vuetify);

document.body.setAttribute('data-app', true); // Vuetify prints a warning without this

function makeWrapper(props = {}) {
  return mount(LicenseDropdown, {
    attachToDocument: true,
    propsData: props,
  });
}

describe('licenseDropdown', () => {
  let specialPermissions = _.findWhere(Constants.Licenses, { is_custom: true });

  describe('on load', () => {
    it('all license options should be an option to select', () => {
      let wrapper = makeWrapper();
      _.each(Constants.Licenses, license => {
        expect(wrapper.find('.v-list').text()).toContain(license.license_name);
      });
    });
    it('should render according to license prop', () => {
      function test(license) {
        let wrapper = makeWrapper({ selectedID: license.id });
        expect(wrapper.vm.$refs.license.value).toEqual(license.id);
        expect(wrapper.find('.v-textarea').exists()).toBe(license.is_custom);
      }
      _.each(Constants.Licenses, test);
    });
    it('should display licenseDescription prop', () => {
      let wrapper = makeWrapper({
        licenseDescription: 'test description',
        selectedID: specialPermissions.id,
      });
      expect(wrapper.vm.$refs.description.value).toContain('test description');
    });
  });
  describe('props', () => {
    it('setting readonly should prevent any edits', () => {
      let wrapper = makeWrapper({ readonly: true, selectedID: specialPermissions.id });
      expect(wrapper.find('input[readonly]').exists()).toBe(true);
      expect(wrapper.find('textarea[readonly]').exists()).toBe(true);
    });
    it('setting required should make fields required', () => {
      let wrapper = makeWrapper({
        required: true,
        selectedID: specialPermissions.id,
        descriptionRequired: true,
      });
      expect(wrapper.find('input:required').exists()).toBe(true);
      expect(wrapper.find('textarea:required').exists()).toBe(true);
    });
    it('setting disabled should make fields disabled', () => {
      let wrapper = makeWrapper({ disabled: true, selectedID: specialPermissions.id });
      expect(wrapper.find('input:disabled').exists()).toBe(true);
      expect(wrapper.find('textarea:disabled').exists()).toBe(true);
    });
  });
  describe('license info modal', () => {
    it('should open the info modal when button is clicked', () => {
      let wrapper = makeWrapper({ selectedID: specialPermissions.id });
      expect(wrapper.find('.v-dialog').isVisible()).toBe(false);
      let button = wrapper.find(InfoModal).find('.v-btn');
      button.trigger('click');
      expect(wrapper.find('.v-dialog').isVisible()).toBe(true);
    });
    it('should render the correct license description', () => {
      function test(license) {
        let wrapper = makeWrapper({ selectedID: license.id });
        expect(wrapper.find('.v-dialog').text()).toContain(license.license_name);
        expect(wrapper.find('.v-dialog').text()).toContain(license.license_description);
      }
      _.each(Constants.Licenses, test);
    });
    it('should render a LEARN MORE link to the license information page', () => {
      function test(license) {
        let wrapper = makeWrapper({ selectedID: license.id });
        if (license.license_url)
          expect(wrapper.find('.v-dialog a').attributes('href')).toContain(license.license_url);
        else expect(wrapper.find('.v-dialog a').exists()).toBe(false);
      }
      _.each(Constants.Licenses, test);
    });
  });
  describe('change events', () => {
    it('licensechanged should be emitted when license is changed', () => {
      let wrapper = makeWrapper();
      expect(wrapper.emitted('licensechanged')).toBeFalsy();
      wrapper.find('input').setValue(specialPermissions.id);
      expect(wrapper.emitted('licensechanged')).toBeTruthy();
      expect(wrapper.emitted('licensechanged')[0][0]).toEqual(specialPermissions.id.toString());
    });
    it('descriptionchanged should be emitted when description is changed', () => {
      let wrapper = makeWrapper({ selectedID: specialPermissions.id });
      expect(wrapper.emitted('descriptionchanged')).toBeFalsy();
      wrapper.find('textarea').setValue('test license description');
      expect(wrapper.emitted('descriptionchanged')).toBeTruthy();
      expect(wrapper.emitted('descriptionchanged')[0][0]).toEqual('test license description');
    });
  });
});
