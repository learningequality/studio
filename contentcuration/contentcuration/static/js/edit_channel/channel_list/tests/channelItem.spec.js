import { shallowMount } from '@vue/test-utils';
import ChannelItem from './../views/ChannelItem.vue';
import { localStore } from './data.js';
import { ListTypes } from './../constants';

const testChannel = {
  id: 'test channel',
  name: 'test title',
  modified: new Date(),
};

function makeWrapper() {
  localStore.commit('channel_list/SET_CHANNEL_LIST', {
    channels: [testChannel],
    listType: ListTypes.EDITABLE,
  });
  return shallowMount(ChannelItem, {
    store: localStore,
    mocks: {
      $router: {
        push() {},
      },
    },
    propsData: {
      channelID: testChannel.id,
    },
  });
}

describe('channelItem', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });

  it('should load channel information', () => {
    expect(wrapper.text()).toEqual(expect.stringContaining(testChannel.name));
  });
  it('should set the store.activeChannel', () => {
    let channel = wrapper.find('.channel-container-wrapper');
    channel.trigger('click');
    expect(wrapper.vm.activeChannel.id).toEqual(testChannel.id);
  });
  it('CTRL + click should open new window', () => {
    global.open = jest.fn();
    let event = { metaKey: true };
    wrapper.vm.openChannel(event);
    expect(global.open).toBeCalled();
  });
});
