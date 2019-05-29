import { mount, RouterLinkStub } from '@vue/test-utils';
import _ from 'underscore';
import ChannelListPage from './../views/ChannelListPage.vue';
import ChannelDetailsPanel from './../views/ChannelDetailsPanel.vue';
import ChannelInvitationList from './../views/ChannelInvitationList.vue';
import { ListTypes, RouterNames } from './../constants';
import { localStore } from './data';

let router = require('edit_channel/channel_list/router');

function makeWrapper() {
  return mount(ChannelListPage, {
    router,
    store: localStore,
    propsData: {
      activeList: 'EDITABLE',
    },
    stubs: {
      RouterLink: RouterLinkStub,
      ChannelDetailsPanel: '<div />',
      ChannelList: '<div />',
      ChannelInvitationList: '<div />',
    },
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
  it('has links to all of the different list types', () => {
    const routerLinks = wrapper.findAll(RouterLinkStub);
    expect(routerLinks.at(0).props().to.name).toEqual('ChannelList');
    expect(routerLinks.at(1).props().to.name).toEqual('ChannelList/Starred');
    expect(routerLinks.at(2).props().to.name).toEqual('ChannelList/ViewOnly');
    expect(routerLinks.at(3).props().to.name).toEqual('ChannelList/Public');
    expect(routerLinks.at(4).props().to.name).toEqual('ChannelList/Collections');
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
  it('accepting an invitation should set the channel list', () => {
    let inviteList = wrapper.find(ChannelInvitationList);
    _.each(_.pairs(RouterNames), tab => {
      inviteList.vm.$emit('setActiveList', tab[0]);
      expect(wrapper.vm.$route.name).toEqual(tab[1]);
    });
  });
});
