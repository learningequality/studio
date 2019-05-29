import { shallowMount } from '@vue/test-utils';
import ChannelMetadataSection from './../views/ChannelMetadataSection.vue';
import { localStore } from './data.js';
import State from 'edit_channel/state';

State.current_user = { id: 'testuser' };

const testChannel = {
  id: 'test',
  name: 'channel',
  created: new Date(),
};
function makeWrapper(props = {}) {
  localStore.commit('channel_list/RESET_STATE');
  let channel = {
    ...testChannel,
    ...props,
  };
  localStore.commit('channel_list/ADD_CHANNEL', channel);
  localStore.commit('channel_list/SET_ACTIVE_CHANNEL', channel.id);
  return shallowMount(ChannelMetadataSection, {
    store: localStore,
  });
}

describe('channelMetadataSection', () => {
  let wrapper;
  afterEach(() => {
    wrapper.destroy();
  });
  it('channels with edit access should show EDIT DETAILS button', () => {
    wrapper = makeWrapper({ editors: ['testuser'] });
    expect(wrapper.find('#edit-details').exists()).toBe(true);
  });
  it('channels with view only access should hide EDIT DETAILS button', () => {
    wrapper = makeWrapper({ editors: [] });
    expect(wrapper.find('#edit-details').exists()).toBe(false);
  });
  it('ricecooker channels should hide EDIT DETAILS button', () => {
    wrapper = makeWrapper({ editors: ['testuser'], ricecooker_version: 'rice' });
    expect(wrapper.find('#edit-details').exists()).toBe(false);
  });
  it('OPEN CHANNEL button should link to edit mode for editable channels', () => {
    wrapper = makeWrapper({ editors: ['testuser'] });
    let openButton = wrapper.find('#open-channel');
    expect(openButton.attributes('href')).toEqual('channel');
  });
  it('OPEN CHANNEL button should link to view only mode for view only channels', () => {
    wrapper = makeWrapper({ editors: [] });
    let openButton = wrapper.find('#open-channel');
    expect(openButton.attributes('href')).toEqual('channel_view_only');
  });
});
