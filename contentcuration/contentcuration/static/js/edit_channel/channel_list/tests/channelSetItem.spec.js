import { shallowMount } from '@vue/test-utils';
import ChannelSetItem from './../views/ChannelSetItem.vue';
import { localStore, mockFunctions } from './data.js';

function makeWrapper() {
  let channelSet = {
    id: 'channel-set-id',
    name: 'test title',
    channels: ['test'],
    secret_token: {
      display_token: 'test-test',
    },
  };

  localStore.commit('channel_list/ADD_CHANNEL', { id: 'test' });
  localStore.commit('channel_list/SET_CHANNELSET_LIST', [channelSet]);

  return shallowMount(ChannelSetItem, {
    store: localStore,
    propsData: {
      channelSetID: channelSet.id,
    },
  });
}

describe('channelSetItem', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });

  it('should show correct number of channels', () => {
    let metadata = wrapper.find('.channel-metadata');
    expect(metadata.text()).toEqual(expect.stringContaining('1 Channel'));
  });
  it('on DELETE click, dialog should be shown', () => {
    wrapper.find('.delete-channelset').trigger('click');
    expect(mockFunctions.deleteChannelSet).not.toHaveBeenCalled();
    expect(document.querySelector('#dialog-box')).toBeTruthy();
  });
  it('on DELETE, channel set should be deleted', () => {
    wrapper.vm.deleteChannelSet(wrapper.vm.channelSet);
    expect(mockFunctions.deleteChannelSet).toHaveBeenCalled();
  });
  it('on channel delete, channel should be removed from channel', () => {
    localStore.commit('channel_list/REMOVE_CHANNEL', 'test');
    expect(wrapper.vm.channelSet.channels).not.toContain('test');
  });
  it('on click should open channel set modal', () => {
    wrapper.find('.channel-container-wrapper').trigger('click');
    // TODO: check for channel_set/views/ChannelSetModal
  });
});
