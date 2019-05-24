import { mount } from '@vue/test-utils';
import ChannelEditor from './../views/ChannelEditor.vue';
import { localStore, mockFunctions } from './data.js';

require('handlebars/helpers'); // Needed for image uploader

let testChannel = {
  id: 'test',
  name: 'channel',
  description: 'description',
  language: 'en',
  thumbnail: 'abc',
  thumbnail_encoding: '16bit',
};

function makeWrapper(props = {}) {
  let channel = {
    ...testChannel,
    ...props,
  };
  localStore.commit('channel_list/RESET_STATE');
  localStore.commit('channel_list/ADD_CHANNEL', channel);
  localStore.commit('channel_list/SET_ACTIVE_CHANNEL', channel.id);
  return mount(ChannelEditor, {
    store: localStore,
  });
}

describe('channelEditor', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });

  describe('on load', () => {
    it('changed is false', () => {
      expect(wrapper.vm.activeChannelHasBeenModified).toBe(false);
    });
    it('thumbnail is shown', () => {
      let thumbnail = 'thumbnail.png';
      let thumbnailWrapper = makeWrapper({ thumbnail_url: thumbnail });
      expect(thumbnailWrapper.find('img').attributes('src')).toContain(thumbnail);
    });
    it('default thumbnail is shown if channel has no thumbnail', () => {
      expect(wrapper.find('img').attributes('src')).toContain('kolibri_placeholder.png');
    });
    it('.channel-name is set to channel.name', () => {
      expect(wrapper.find('.channel-name').element.value).toEqual(testChannel.name);
    });
    it('.channel-description is set to channel.description', () => {
      expect(wrapper.find('.channel-description').element.value).toEqual(testChannel.description);
    });
    it('#select-language is set to channel.language_id', () => {
      expect(wrapper.find('#select-language').element.value).toEqual(testChannel.language);
    });
  });

  describe('changes registered', () => {
    beforeEach(() => {
      localStore.commit('channel_list/SET_CHANGED', false);
    });
    it('setChannelThumbnail sets channel.thumbnail', () => {
      let thumbnail = 'newthumbnail.png';
      wrapper.vm.setChannelThumbnail(
        thumbnail,
        { 'new encoding': thumbnail },
        thumbnail,
        thumbnail
      );
      expect(wrapper.vm.activeChannelHasBeenModified).toBe(true);
      expect(wrapper.vm.channel.thumbnail).toEqual(thumbnail);
      expect(wrapper.vm.channel.thumbnail_encoding).toEqual({ 'new encoding': thumbnail });
    });
    it('removeChannelThumbnail removes channel.thumbnail', () => {
      let thumbnailWrapper = makeWrapper({
        thumbnail: 'thumbnail.png',
        thumbnail_encoding: { test: 'test' },
      });
      thumbnailWrapper.vm.removeChannelThumbnail();
      expect(wrapper.vm.activeChannelHasBeenModified).toBe(true);
      expect(wrapper.vm.channel.thumbnail).toEqual('');
      expect(wrapper.vm.channel.thumbnail_encoding).toEqual({});
    });
    it('typing in .channel-name sets channel.name', () => {
      let newName = 'new channel name';
      let nameInput = wrapper.find('.channel-name');
      nameInput.element.value = newName;
      nameInput.trigger('input');
      nameInput.trigger('change');
      expect(wrapper.vm.activeChannelHasBeenModified).toBe(true);
      expect(wrapper.vm.channel.name).toEqual(newName);
    });
    it('setting .channel-description sets channel.description', () => {
      let newDescription = 'new channel description';
      let descriptionInput = wrapper.find('.channel-description');
      descriptionInput.element.value = newDescription;
      descriptionInput.trigger('input');
      descriptionInput.trigger('change');
      expect(wrapper.vm.activeChannelHasBeenModified).toBe(true);
      expect(wrapper.vm.channel.description).toEqual(newDescription);
    });
    it('setting #select-language sets channel.language_id', () => {
      let newLanguage = 'es';
      let languageDropdown = wrapper.find('#select-language');
      languageDropdown.element.value = newLanguage;
      languageDropdown.trigger('input');
      languageDropdown.trigger('change');
      expect(wrapper.vm.activeChannelHasBeenModified).toBe(true);
      expect(wrapper.vm.channel.language).toEqual(newLanguage);
    });
  });

  it('clicking CANCEL cancels edits', () => {
    let nameInput = wrapper.find('.channel-name');
    nameInput.element.value = 'new channel name';
    nameInput.trigger('input');
    nameInput.trigger('change');

    // Cancel changes
    wrapper.find('.cancel-edits').trigger('click');
    expect(wrapper.emitted().cancelEdit).toHaveLength(1);
  });

  it('clicking SAVE saves edits', () => {
    wrapper.find('form').trigger('submit');
    expect(mockFunctions.saveChannel).toHaveBeenCalled();
    wrapper.vm.$nextTick(() => {
      expect(wrapper.emitted('submitChanges')).toBeTruthy();
    });
  });
});
