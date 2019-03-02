import { mount } from '@vue/test-utils';
import ChannelEditor from './../../views/ChannelEditor.vue';
import { localStore, mockFunctions } from './../data.js';
require('handlebars/helpers'); // Needed for image uploader

function makeWrapper(props = {}) {
  let testChannel = {
    'name': 'channel',
    'description': "description",
    'language': 'en',
    ...props
  }
  localStore.commit('channel_list/SET_ACTIVE_CHANNEL', testChannel)
  return mount(ChannelEditor, {
    store: localStore
  })
}

describe('channelMetadataSection', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });

  describe('on load', () => {
    it('changed is false', () => {
      expect(wrapper.vm.changed).toBe(false);
    });
    it('thumbnail is shown', () => {
      let thumbnailWrapper = makeWrapper({'thumbnail_url': 'thumbnail.png'})
      thumbnailWrapper.vm.$nextTick(() => {
        expect(thumbnailWrapper.find('img').attributes('src')).toContain('thumbnail.png')
      })
    });
    it('default thumbnail is shown if channel has no thumbnail', () => {
      wrapper.vm.$nextTick(() => {
        expect(wrapper.find('img').attributes('src')).toContain('kolibri_placeholder.png')
      })
    });
    it('.channel-name is set to channel.name', () => {
      expect(wrapper.find('.channel-name').element.value).toEqual('channel');
    });
    it('.channel-description is set to channel.description', () => {
      expect(wrapper.find('.channel-description').element.value).toEqual('description');
    });
    it('#select-language is set to channel.language_id', () => {
      expect(wrapper.find('#select-language').element.value).toEqual('en');
    });
  })
  describe('changes registered', () => {
    it('setChannelThumbnail sets channel.thumbnail', () => {
      let thumbnail = 'newthumbnail.png'
      wrapper.vm.setChannelThumbnail(thumbnail, {'new encoding': thumbnail}, thumbnail, thumbnail)
      expect(wrapper.vm.changed).toBe(true);
      expect(wrapper.vm.channel.thumbnail).toEqual(thumbnail);
      expect(wrapper.vm.channel.thumbnail_encoding).toEqual({'new encoding': thumbnail});
    });
    it('removeChannelThumbnail removes channel.thumbnail', () => {
      let thumbnailWrapper = makeWrapper({'thumbnail': 'thumbnail.png', 'thumbnail_encoding': {'test': 'test'}})
      thumbnailWrapper.vm.removeChannelThumbnail();
      expect(wrapper.vm.changed).toBe(true);
      expect(wrapper.vm.channel.thumbnail).toEqual("");
      expect(wrapper.vm.channel.thumbnail_encoding).toEqual({});
    });
    it('typing in .channel-name sets channel.name', () => {
      let nameInput = wrapper.find('.channel-name');
      nameInput.element.value = 'new channel name';
      nameInput.trigger('input');
      expect(wrapper.vm.changed).toBe(true);
      expect(wrapper.vm.channel.name).toEqual('new channel name');
    });
    it('setting .channel-description sets channel.description', () => {
      let descriptionInput = wrapper.find('.channel-description');
      descriptionInput.element.value = 'new channel description';
      descriptionInput.trigger('input');
      expect(wrapper.vm.changed).toBe(true);
      expect(wrapper.vm.channel.description).toEqual('new channel description');
    });
    it('setting #select-language sets channel.language_id', () => {
      expect(true).toBeTruthy();
    });
  })

  it('clicking CANCEL cancels edits', () => {
    let nameInput = wrapper.find('.channel-name');
    nameInput.element.value = 'new channel name';
    nameInput.trigger('input');

    // Cancel changes
    wrapper.find(".cancel-edits").trigger('click');
    expect(wrapper.vm.changed).toBe(false);
    expect(wrapper.vm.channel.name).toEqual('channel');
    expect(wrapper.emitted().cancelEdit).toBeTruthy();
  });

  it('clicking SAVE saves edits', () => {
    wrapper.find('.save-channel').trigger('click');
    expect(mockFunctions.saveChannel).toHaveBeenCalled();
    wrapper.vm.$nextTick(() => {
      expect(wrapper.emitted('submitChanges')).toBeTruthy();
    });
  });
});
