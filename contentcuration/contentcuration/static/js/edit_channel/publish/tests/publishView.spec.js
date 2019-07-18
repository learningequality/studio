import { shallowMount } from '@vue/test-utils';
import PublishView from './../views/PublishView.vue';
import { localStore, mockFunctions } from './data.js';
import LanguageDropdown from 'edit_channel/sharedComponents/LanguageDropdown.vue';

let testChannel = {
  id: 'test',
  name: 'Test Channel',
  version: 10,
  language: 'en',
  main_tree: {
    resource_count: 100,
  },
};

function makeWrapper(channel = {}) {
  localStore.commit('publish/SET_CHANNEL', {
    ...testChannel,
    ...channel,
  });
  return shallowMount(PublishView, {
    store: localStore,
  });
}

describe('publishView', () => {
  let wrapper;

  describe('on load', () => {
    beforeEach(() => {
      wrapper = makeWrapper();
    });
    it('should have the channel name in the header', () => {
      expect(wrapper.find('h1').text()).toEqual('Test Channel');
    });
    it('should contain the correct version and language native name', () => {
      let subtext = wrapper.find('p').text();
      expect(subtext).toContain('10');
      expect(subtext).toContain('English');
    });
    it('should not contain LanguageDropdown if language is set', () => {
      expect(wrapper.find(LanguageDropdown).exists()).toBe(false);
      expect(wrapper.find('.invalid-section').exists()).toBe(false);
      expect(wrapper.find('.valid-section').exists()).toBe(true);
    });
    it('should contain LanguageDropdown if no language is set', () => {
      let testWrapper = makeWrapper({ language: null });
      expect(testWrapper.find(LanguageDropdown).exists()).toBe(true);
      expect(testWrapper.find('.invalid-section').exists()).toBe(true);
      expect(testWrapper.find('.valid-section').exists()).toBe(false);
    });
  });

  describe('on LanguageDropdown emitting changed', () => {
    let languageDropdown;
    beforeEach(() => {
      wrapper = makeWrapper({ language: null });
      languageDropdown = wrapper.find(LanguageDropdown);
      mockFunctions.setChannelLanguage.mockReset();
    });
    it('should call setChannelLanguage', () => {
      languageDropdown.vm.$emit('changed', 'en');
      expect(mockFunctions.setChannelLanguage).toHaveBeenCalled();
    });
    it('should set saving to true', () => {
      languageDropdown.vm.$emit('changed', 'en');
      expect(wrapper.vm.saving).toBe(true);
      wrapper.vm.$nextTick(() => {
        expect(wrapper.vm.saving).toBe(false);
      });
    });
  });
});
