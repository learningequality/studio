import { mount } from '@vue/test-utils';
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
    stubs: {
      ChannelItem: true,
    },
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
    wrapper.find('[data-test="checkbox"]').vm.$emit('change', [editChannel.id]);
    expect(wrapper.emitted('input')[0][0]).toEqual([editChannel.id]);
  });
  it('should deselect channels when the channel has been unchecked', () => {
    wrapper.setData({ loading: false });
    wrapper.find('[data-test="checkbox"]').vm.$emit('change', []);
    expect(wrapper.emitted('input')[0][0]).toEqual([]);
  });
  it('should filter channels based on the search text', () => {
    wrapper.setData({ loading: false, search: searchWord });
    expect(wrapper.vm.listChannels.find(c => c.id === editChannel.id)).toBeTruthy();
    expect(wrapper.vm.listChannels.find(c => c.id === editChannel2.id)).toBeFalsy();
  });
});
