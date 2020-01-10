import Vue from 'vue';
import { mount } from '@vue/test-utils';
import find from 'lodash/find';
import Vuetify from 'vuetify';
import store from '../../../store';
import { ListTypes } from '../../../constants';
import ChannelSelectionList from '../ChannelSelectionList.vue';

Vue.use(Vuetify);

const channelSetId = 'testing';
const channelSet = {
  id: channelSetId,
  channels: [],
  secret_token: '1234567890',
};

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

store.commit('channelList/ADD_CHANNELS', [editChannel, editChannel2, publicChannel]);
store.commit('channelSet/ADD_CHANNELSET', channelSet);

function makeWrapper() {
  return mount(ChannelSelectionList, {
    store,
    propsData: {
      channelSetId,
      listType: ListTypes.EDITABLE,
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
    expect(find(wrapper.vm.listChannels, { id: editChannel.id })).toBeTruthy();
    expect(find(wrapper.vm.listChannels, { id: editChannel2.id })).toBeTruthy();
    expect(find(wrapper.vm.listChannels, { id: publicChannel.id })).toBeFalsy();
  });
  it('should select channels when the channel has been checked', () => {
    wrapper.setData({ loading: false });
    wrapper.find('[data-test="checkbox"]').vm.$emit('change', [editChannel.id]);
    expect(wrapper.vm.selectedChannels.includes(editChannel.id)).toBe(true);
  });
  it('should filter channels based on the search text', () => {
    wrapper.setData({ loading: false, search: searchWord });
    expect(find(wrapper.vm.listChannels, { id: editChannel.id })).toBeTruthy();
    expect(find(wrapper.vm.listChannels, { id: editChannel2.id })).toBeFalsy();
  });
});
