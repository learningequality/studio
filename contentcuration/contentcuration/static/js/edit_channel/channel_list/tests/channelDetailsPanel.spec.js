import { shallowMount } from '@vue/test-utils';
import ChannelDetailsPanel from './../views/ChannelDetailsPanel.vue';
import { localStore } from './data.js';

function makeWrapper(props = {}) {
  let channel = {
    id: 'test',
    main_tree: 'abc',
    ...props,
  };
  localStore.commit('channel_list/RESET_STATE');
  localStore.commit('channel_list/ADD_CHANNEL', channel);
  localStore.commit('channel_list/SET_ACTIVE_CHANNEL', channel.id);
  return shallowMount(ChannelDetailsPanel, {
    store: localStore,
  });
}

describe('channelDetailsPanel', () => {
  let wrapper;
  afterEach(() => {
    wrapper.destroy();
  });
  it('panel should set background as thumbnail', () => {
    wrapper = makeWrapper({ thumbnail_url: 'test.png' });
    let panel = wrapper.find('#channel-preview-wrapper');
    expect(panel.attributes('style')).toContain('test.png');
  });
  it('panel should set background as default thumbnail for new channels', () => {
    wrapper = makeWrapper();
    let panel = wrapper.find('#channel-preview-wrapper');
    expect(panel.attributes('style')).toContain('kolibri_placeholder.png');
  });
});
