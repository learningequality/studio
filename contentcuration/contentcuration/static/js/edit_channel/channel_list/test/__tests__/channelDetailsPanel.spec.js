import { shallowMount } from '@vue/test-utils';
import ChannelDetailsPanel from './../../views/ChannelDetailsPanel.vue';
import _ from 'underscore';
import { localStore, mockFunctions } from './../data.js';


function makeWrapper(props = {}) {
  let channel = {
    main_tree: "abc",
    ...props
  }
  localStore.commit('channel_list/SET_ACTIVE_CHANNEL', channel)
  return shallowMount(ChannelDetailsPanel, {
    store: localStore
  })
}

describe('channelDetailsPanel', () => {
  it('panel should set background as thumbnail', () => {
    let wrapper = makeWrapper({'id': 'test', 'thumbnail_url': 'test.png'});
    let panel = wrapper.find('#channel-preview-wrapper');
    let expectedStyle = "background-image: url('test.png')";
    expect(panel.attributes('style')).toContain('test.png');
  });
  it('panel should set background as default thumbnail for new channels', () => {
    let wrapper = makeWrapper();
    let panel = wrapper.find('#channel-preview-wrapper');
    expect(panel.attributes('style')).toContain('kolibri_placeholder.png');
  });
});
