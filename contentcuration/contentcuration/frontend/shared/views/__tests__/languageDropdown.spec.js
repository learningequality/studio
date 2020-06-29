import _ from 'underscore';
import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount } from '@vue/test-utils';
import LanguageDropdown from '../LanguageDropdown.vue';
import TestForm from './TestForm.vue';
import { LanguagesList } from 'shared/leUtils/Languages';

Vue.use(Vuetify);

document.body.setAttribute('data-app', true); // Vuetify prints a warning without this

function makeWrapper() {
  return mount(TestForm, {
    slots: {
      testComponent: LanguageDropdown,
    },
  });
}

let testLanguages = _.first(LanguagesList, 10);

describe('languageDropdown', () => {
  let wrapper;
  let formWrapper;
  beforeEach(() => {
    formWrapper = makeWrapper();
    wrapper = formWrapper.find(LanguageDropdown);
  });
  it('updating the language should emit input event', () => {
    expect(wrapper.emitted('input')).toBeFalsy();
    function test(language, i) {
      // It looks like v-autocomplete doesn't trigger correctly, so call
      // method directly until resolved
      wrapper.find('.v-autocomplete').vm.$emit('input', language.id);
      expect(wrapper.emitted('input')).toBeTruthy();
      expect(wrapper.emitted('input')[i][0]).toEqual(language.id);
    }
    _.each(testLanguages, test);
  });
  it('setting readonly should prevent any edits', () => {
    expect(wrapper.find('input[readonly]').exists()).toBe(false);
    wrapper = mount(LanguageDropdown, {
      attrs: {
        readonly: true,
      },
    });
    expect(wrapper.find('input[readonly]').exists()).toBe(true);
  });
  it('setting required should make field required', () => {
    expect(wrapper.find('input:required').exists()).toBe(false);
    wrapper.setProps({ required: true });
    expect(wrapper.find('input:required').exists()).toBe(true);
  });
  it('validation should catch empty required languages', () => {
    formWrapper.vm.validate();
    expect(wrapper.find('.error--text').exists()).toBe(false);
    wrapper.setProps({ required: true });
    formWrapper.vm.validate();
    expect(wrapper.find('.error--text').exists()).toBe(true);
  });
});
