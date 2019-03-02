import { shallowMount } from '@vue/test-utils';
import ChannelItem from './../../views/ChannelItem.vue';
import _ from 'underscore';
import { localStore } from './../data.js';


function makeWrapper(props = {}) {
  return shallowMount(ChannelItem, {
    store: localStore,
    propsData: {
      channel: {
        id: "test channel",
        name: "test title",
        modified: new Date()
      }
    }
  })
}

describe('channelItem', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });

  it('should load channel information', () => {
    expect(wrapper.text()).toEqual(expect.stringContaining("test title"))
  });
  it('should set the store.activeChannel', () => {
    let channel = wrapper.find('.channel-container-wrapper');
    channel.trigger('click');
    expect(wrapper.vm.activeChannel.id).toEqual("test channel")
  });
  it('CTRL + click should open new window', () => {
    global.open = jest.fn();
    let event = { metaKey: true };
    wrapper.vm.openChannel(event);
    expect(global.open).toBeCalled();
  });
});
