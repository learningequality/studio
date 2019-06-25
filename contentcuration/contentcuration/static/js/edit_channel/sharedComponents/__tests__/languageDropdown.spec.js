import _ from 'underscore';
import Vue from 'vue';
import Vuetify from 'vuetify';
import { mount } from '@vue/test-utils';
import LanguageDropdown from '../LanguageDropdown.vue';
import Constants from 'edit_channel/constants';

Vue.use(Vuetify);

document.body.setAttribute('data-app', true); // Vuetify prints a warning without this

function makeWrapper(props = {}) {
  return mount(LanguageDropdown, {
    attachToDocument: true,
    propsData: props,
  });
}

let testLanguages = _.first(Constants.Languages, 10);

describe('languageDropdown', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  it('updating the language should emit changed event', () => {
    function test(language, i) {
      // It looks like v-autocomplete doesn't trigger correctly, so call
      // method directly until resolved
      // wrapper.find('input').setValue(language.id);

      wrapper.vm.selectedLanguage(language.id);
      expect(wrapper.emitted('changed')).toBeTruthy();
      expect(wrapper.emitted('changed')[i][0]).toEqual(language.id);
    }
    _.each(testLanguages, test);
  });
  it('setting readonly should prevent any edits', () => {
    expect(wrapper.find('input[readonly]').exists()).toBe(false);
    wrapper = makeWrapper({ readonly: true });
    expect(wrapper.find('input[readonly]').exists()).toBe(true);
  });
  it('setting required should make field required', () => {
    expect(wrapper.find('input:required').exists()).toBe(false);
    wrapper = makeWrapper({ required: true });
    expect(wrapper.find('input:required').exists()).toBe(true);
  });
});
