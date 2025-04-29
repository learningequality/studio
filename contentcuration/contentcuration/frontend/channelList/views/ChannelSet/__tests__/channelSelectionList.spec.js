import { mount } from '@vue/test-utils';
import { Store } from 'vuex';
import ChannelSelectionList from '../ChannelSelectionList';
import { ChannelListTypes } from 'shared/constants';

const searchWord = 'search test';
const editChannel = {
  id: 'editchannel',
  name: searchWord,
  description: '',
  edit: true,
  published: true,
};

const editChannel2 = {
  id: 'editchannel2',
  name: '',
  description: '',
  edit: true,
  published: true,
};

const publicChannel = {
  id: 'publicchannel',
  public: true,
  published: true,
};

const getters = {
  channels: jest.fn(() => [editChannel, editChannel2, publicChannel]),
  getChannel: jest.fn(() => () => editChannel),
};

const actions = {
  loadChannelList: jest.fn(() => Promise.resolve()),
};

const store = new Store({
  modules: {
    channel: {
      namespaced: true,
      getters,
      actions,
    },
  },
});

function makeWrapper() {
  const loadChannelList = jest.spyOn(ChannelSelectionList.methods, 'loadChannelList');
  loadChannelList.mockImplementation(() => Promise.resolve());

  const wrapper = mount(ChannelSelectionList, {
    propsData: {
      listType: ChannelListTypes.EDITABLE,
    },
    computed: {
      channels() {
        return [editChannel, editChannel2, publicChannel];
      },
    },
    store,
  });

  return [wrapper, { loadChannelList }];
}

describe('channelSelectionList', () => {
  let wrapper, mocks;

  beforeEach(() => {
    [wrapper, mocks] = makeWrapper();
  });

  afterEach(() => {
    mocks.loadChannelList.mockRestore();
  });

  it('should show the correct channels based on listType', async () => {
    await wrapper.setData({ loading: false });
    expect(wrapper.vm.listChannels.find(c => c.id === editChannel.id)).toBeTruthy();
    expect(wrapper.vm.listChannels.find(c => c.id === editChannel2.id)).toBeTruthy();
    expect(wrapper.vm.listChannels.find(c => c.id === publicChannel.id)).toBeFalsy();
  });

  it('should select channels when the channel has been checked', async () => {
    await wrapper.setData({ loading: false });
    await wrapper.findComponent(`[data-test="checkbox-${editChannel.id}"]`).trigger('click');

    expect(wrapper.emitted('input')[0][0]).toEqual([editChannel.id]);
  });

  it('should deselect channels when the channel has been unchecked', async () => {
    await wrapper.setData({ loading: false });
    await wrapper.findComponent(`[data-test="checkbox-${editChannel.id}"]`).trigger('click'); // Check the channel
    await wrapper.findComponent(`[data-test="checkbox-${editChannel.id}"]`).trigger('click'); // Uncheck the channel

    expect(wrapper.emitted('input')[0].length).toEqual(1); // Only one event should be emitted (corresponding to the initial check)
    expect(wrapper.emitted('input')[0][0]).toEqual([editChannel.id]); // The initial check event should be emitted
  });

  it('should filter channels based on the search text', async () => {
    await wrapper.setData({ loading: false, search: searchWord });
    expect(wrapper.vm.listChannels.find(c => c.id === editChannel.id)).toBeTruthy();
    expect(wrapper.vm.listChannels.find(c => c.id === editChannel2.id)).toBeFalsy();
  });

  it('should select channels when the channel card has been clicked', async () => {
    await wrapper.setData({ loading: false });
    await wrapper.findComponent(`[data-test="channel-item-${editChannel.id}"]`).trigger('click');
    expect(wrapper.emitted('input')[0][0]).toEqual([editChannel.id]);
  });

  it('should deselect channels when the channel card has been clicked', async () => {
    await wrapper.setData({ loading: false });
    await wrapper.findComponent(`[data-test="channel-item-${editChannel.id}"]`).trigger('click'); // Check the channel
    await wrapper.findComponent(`[data-test="channel-item-${editChannel.id}"]`).trigger('click'); // Uncheck the channel

    expect(wrapper.emitted('input')[0].length).toEqual(1); // Only one event should be emitted (corresponding to the initial check)
    expect(wrapper.emitted('input')[0][0]).toEqual([editChannel.id]); // The initial check event should be emitted
  });
});
