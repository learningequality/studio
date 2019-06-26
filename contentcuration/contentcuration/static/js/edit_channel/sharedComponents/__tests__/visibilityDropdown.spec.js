import _ from 'underscore';
import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount } from '@vue/test-utils';
import InfoModal from '../InfoModal.vue';
import VisibilityDropdown from '../VisibilityDropdown.vue';
import TestForm from './TestForm.vue';
import { translate } from 'edit_channel/utils/string_helper';
import Constants from 'edit_channel/constants';

Vue.use(Vuetify);

document.body.setAttribute('data-app', true); // Vuetify prints a warning without this

function makeWrapper() {
  return mount(TestForm, {
    slots: {
      testComponent: VisibilityDropdown,
    },
  });
}

describe('visibilityDropdown', () => {
  let wrapper;
  let formWrapper;
  beforeEach(() => {
    formWrapper = makeWrapper();
    wrapper = formWrapper.find(VisibilityDropdown);
  });

  describe('on load', () => {
    it('all visibility options should be an option to select', () => {
      _.each(Constants.Roles, role => {
        expect(wrapper.find('.v-list').text()).toContain(translate(role));
      });
    });
    it('should render according to visibility prop', () => {
      function test(visibility) {
        wrapper.setProps({ role: visibility });
        expect(wrapper.vm.$refs.visibility.value).toEqual(visibility);
      }
      _.each(Constants.Roles, test);
    });
  });
  describe('props', () => {
    it('setting readonly should prevent any edits', () => {
      expect(wrapper.find({ ref: 'visibility' }).classes()).not.toContain('v-input--is-readonly');
      wrapper.setProps({ readonly: true });
      expect(wrapper.find({ ref: 'visibility' }).classes()).toContain('v-input--is-readonly');
    });
    it('setting required should make fields required', () => {
      expect(
        wrapper
          .find({ ref: 'visibility' })
          .find('input')
          .attributes('required')
      ).toBeFalsy();
      wrapper.setProps({ required: true });
      expect(
        wrapper
          .find({ ref: 'visibility' })
          .find('input')
          .attributes('required')
      ).toEqual('required');
    });
    it('validation should flag empty required fields', () => {
      formWrapper.vm.validate();
      expect(wrapper.find('.error--text').exists()).toBe(false);
      wrapper.setProps({ required: true, role: null });
      formWrapper.vm.validate();
      expect(wrapper.find('.error--text').exists()).toBe(true);
    });
    it('setting disabled should make fields required', () => {
      expect(
        wrapper
          .find({ ref: 'visibility' })
          .find('input')
          .attributes('disabled')
      ).toBeFalsy();
      wrapper.setProps({ disabled: true });
      expect(
        wrapper
          .find({ ref: 'visibility' })
          .find('input')
          .attributes('disabled')
      ).toEqual('disabled');
    });
  });
  describe('visibility info modal', () => {
    it('should open the info modal when button is clicked', () => {
      expect(wrapper.find('.v-dialog').isVisible()).toBe(false);
      let button = wrapper.find(InfoModal).find('.v-btn');
      button.trigger('click');
      expect(wrapper.find('.v-dialog').isVisible()).toBe(true);
    });
  });
  describe('emitted events', () => {
    it('should emit changed event when visibility is changed', () => {
      expect(wrapper.emitted('changed')).toBeFalsy();
      wrapper.find('input').setValue(Constants.Roles[0]);
      expect(wrapper.emitted('changed')).toBeTruthy();
      expect(wrapper.emitted('changed')[0][0]).toEqual(Constants.Roles[0]);
    });
  });
});
