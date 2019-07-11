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
  it('selected language should be set to language from props', () => {
    function test(language) {
      let wrapper = makeWrapper({ language: language.id });
      expect(wrapper.vm.selected).toBe(language.id);
    }
    _.each(testLanguages, test);
  });
  it('updating the language should emit changed event', () => {
    function test(language) {
      let wrapper = makeWrapper();
      wrapper.vm.selectedLanguage(language.id);
      expect(wrapper.emitted().changed).toBeTruthy();
      expect(wrapper.emitted().changed[0][0]).toEqual(language.id);
    }
    _.each(testLanguages, test);
  });
});
