import Vue from 'vue';
import { ListTypes } from '../constants';

const Vuex = require('vuex');
var mutations = require('edit_channel/channel_list/vuex/mutations');
var getters = require('edit_channel/channel_list/vuex/getters');
var actions = require('edit_channel/channel_list/vuex/actions');

Vue.use(Vuex);

export const Channels = [
  {
    id: 'channel1',
    name: 'Editable Channel',
    [ListTypes.STARRED]: false,
    [ListTypes.EDITABLE]: true,
    [ListTypes.PUBLIC]: false,
    [ListTypes.VIEW_ONLY]: false,
  },
  {
    id: 'channel2',
    name: 'View-Only Channel',
    [ListTypes.STARRED]: false,
    [ListTypes.EDITABLE]: false,
    [ListTypes.PUBLIC]: false,
    [ListTypes.VIEW_ONLY]: true,
  },
  {
    id: 'channel3',
    name: 'Public Channel',
    [ListTypes.STARRED]: false,
    [ListTypes.EDITABLE]: false,
    [ListTypes.PUBLIC]: true,
    [ListTypes.VIEW_ONLY]: false,
  },
  {
    id: 'channel4',
    name: 'Starred + Public Channel',
    [ListTypes.STARRED]: true,
    [ListTypes.EDITABLE]: false,
    [ListTypes.PUBLIC]: true,
    [ListTypes.VIEW_ONLY]: false,
  },
  {
    id: 'channel5',
    name: 'Starred + Editable Channel',
    [ListTypes.STARRED]: true,
    [ListTypes.EDITABLE]: true,
    [ListTypes.PUBLIC]: false,
    [ListTypes.VIEW_ONLY]: false,
  },
];

export const Invitations = [
  {
    id: 'invitation1',
    share_mode: 'edit',
    sender: {
      first_name: 'First',
      last_name: 'Last',
    },
  },
  {
    id: 'invitation2',
    share_mode: 'view',
    sender: {
      first_name: 'First',
      last_name: 'Last',
    },
  },
];

export const ChannelSets = [
  {
    id: 'channelSet1',
    name: 'test title',
    channels: ['test'],
    secret_token: {
      display_token: 'test-test',
    },
  },
  {
    id: 'channelSet2',
    name: 'test title',
    channels: ['test'],
    secret_token: {
      display_token: 'test-test',
    },
  },
];

export const mockFunctions = {
  downloadChannelDetails: jest.fn(),
  addStar: jest.fn(),
  removeStar: jest.fn(),
  loadChannelInvitationList: jest.fn(),
  loadChannelList: jest.fn(),
  acceptInvitation: jest.fn(),
  declineInvitation: jest.fn(),
  deleteChannel: jest.fn(),
  loadNodeDetails: jest.fn(),
  deleteChannelSet: jest.fn(),
  loadChannelSetList: jest.fn(),
  saveChannel: jest.fn(),
};

export const localStore = new Vuex.Store({
  modules: {
    channel_list: {
      namespaced: true,
      state: {
        channels: [],
        activeChannel: null,
        changed: false,
        channelChanges: {},
        channelSets: [],
        invitations: [],
      },
      getters: getters,
      mutations: {
        ...mutations,
        SET_CHANNEL_LIST: (state, payload) => {
          state.channels = payload.channels;
        },
      },
      actions: {
        ...actions,
        loadChannelInvitationList: context => {
          context.commit('SET_INVITATION_LIST', Invitations);
          mockFunctions.loadChannelInvitationList();
        },
        loadChannelList: context => {
          context.commit('SET_CHANNEL_LIST', { channels: Channels });
          mockFunctions.loadChannelList();
        },
        loadChannelSetList: context => {
          context.commit('SET_CHANNELSET_LIST', ChannelSets);
          mockFunctions.loadChannelSetList();
        },
        addStar: mockFunctions.addStar,
        removeStar: mockFunctions.removeStar,
        downloadChannelDetails: mockFunctions.downloadChannelDetails,
        acceptInvitation: mockFunctions.acceptInvitation,
        declineInvitation: mockFunctions.declineInvitation,
        deleteChannel: mockFunctions.deleteChannel,
        loadNodeDetails: mockFunctions.loadNodeDetails,
        deleteChannelSet: mockFunctions.deleteChannelSet,
        saveChannel: mockFunctions.saveChannel,
      },
    },
  },
});
