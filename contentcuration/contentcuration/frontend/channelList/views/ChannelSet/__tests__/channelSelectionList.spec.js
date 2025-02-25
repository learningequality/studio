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
  return mount(ChannelSelectionList, {
    sync: false,
    propsData: {
      listType: ChannelListTypes.EDITABLE,
    },
    computed: {
      channels() {
        return [editChannel, editChannel2, publicChannel];
      },
    },
    methods: {
      loadChannelList() {
        return Promise.resolve();
      },
    },
    store,
  });
}

describe('channelSelectionList', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  it('should show the correct channels based on listType', () => {
    wrapper.setData({ loading: false });
    expect(wrapper.vm.listChannels.find(c => c.id === editChannel.id)).toBeTruthy();
    expect(wrapper.vm.listChannels.find(c => c.id === editChannel2.id)).toBeTruthy();
    expect(wrapper.vm.listChannels.find(c => c.id === publicChannel.id)).toBeFalsy();
  });
  it('should select channels when the channel has been checked', () => {
    wrapper.setData({ loading: false });
    wrapper.find(`[data-test="checkbox-${editChannel.id}"]`).element.click();

    expect(wrapper.emitted('input')[0][0]).toEqual([editChannel.id]);
  });
  it('should deselect channels when the channel has been unchecked', () => {
    wrapper.setData({ loading: false });
    wrapper.find(`[data-test="checkbox-${editChannel.id}"]`).element.click(); // Check the channel
    wrapper.find(`[data-test="checkbox-${editChannel.id}"]`).element.click(); // Uncheck the channel

    expect(wrapper.emitted('input')[0].length).toEqual(1); // Only one event should be emitted (corresponding to the initial check)
    expect(wrapper.emitted('input')[0][0]).toEqual([editChannel.id]); // The initial check event should be emitted
  });
  it('should filter channels based on the search text', () => {
    wrapper.setData({ loading: false, search: searchWord });
    expect(wrapper.vm.listChannels.find(c => c.id === editChannel.id)).toBeTruthy();
    expect(wrapper.vm.listChannels.find(c => c.id === editChannel2.id)).toBeFalsy();
  });
  it('should select channels when the channel card has been clicked', () => {
    wrapper.setData({ loading: false });
    wrapper.find(`[data-test="channel-item-${editChannel.id}"]`).trigger('click');
    expect(wrapper.emitted('input')[0][0]).toEqual([editChannel.id]);
  });
  it('should deselect channels when the channel card has been clicked', () => {
    wrapper.setData({ loading: false });
    wrapper.find(`[data-test="channel-item-${editChannel.id}"]`).element.click(); // Check the channel
    wrapper.find(`[data-test="channel-item-${editChannel.id}"]`).element.click(); // Uncheck the channel

    expect(wrapper.emitted('input')[0].length).toEqual(1); // Only one event should be emitted (corresponding to the initial check)
    expect(wrapper.emitted('input')[0][0]).toEqual([editChannel.id]); // The initial check event should be emitted
  });
});
