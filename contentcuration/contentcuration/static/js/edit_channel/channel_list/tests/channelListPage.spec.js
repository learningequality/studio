import { shallowMount } from '@vue/test-utils';
import ChannelListPage from './../views/ChannelListPage.vue';
import ChannelDetailsPanel from './../views/ChannelDetailsPanel.vue';
import { ListTypes } from './../constants';
import { localStore } from './data';
import _ from 'underscore';

function makeWrapper(props = {}) {
  return shallowMount(ChannelListPage, {
    store: localStore,
  });
}

describe('channelListPage', () => {
  let wrapper;
  beforeEach(() => {
    wrapper = makeWrapper();
  });
  it('on LOAD all list types have a tab', () => {
    let expectedTabLength = _.values(ListTypes).length;
    expect(wrapper.findAll('#manage-channel-nav li')).toHaveLength(expectedTabLength);
  });
  it('on CLICK tab must navigate to corresponding list', () => {
    let results = wrapper.findAll('#manage-channel-nav li');
    _.each(_.range(0, results.length), index => {
      let tab = results.at(index);
      tab.trigger('click');
      expect(tab.is('.active')).toBe(true);
      expect(wrapper.vm.$tr(wrapper.vm.activeList)).toEqual(tab.text());
    });
  });
  it('details panel should toggle when active channel is set/unset', () => {
    let channel = { id: 'id', channel: 'channel' };
    wrapper.vm.$store.commit('channel_list/ADD_CHANNEL', channel);
    expect(wrapper.find(ChannelDetailsPanel).exists()).toBe(false);
    wrapper.vm.$store.commit('channel_list/SET_ACTIVE_CHANNEL', channel.id);
    expect(wrapper.find(ChannelDetailsPanel).exists()).toBe(true);
    wrapper.vm.$store.commit('channel_list/SET_ACTIVE_CHANNEL', null);
    expect(wrapper.find(ChannelDetailsPanel).exists()).toBe(false);
    wrapper.vm.$store.commit('channel_list/SET_ACTIVE_CHANNEL', '');
    expect(wrapper.find(ChannelDetailsPanel).exists()).toBe(true);
  });
});
