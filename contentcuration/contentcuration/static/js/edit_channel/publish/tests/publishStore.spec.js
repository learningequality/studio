import { createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';

const Backbone = require('backbone');
const mutations = require('edit_channel/publish/vuex/mutations');
const actions = require('edit_channel/publish/vuex/actions');

const localVue = createLocalVue();
localVue.use(Vuex);

/*
  TODO: there are some issues trying to mock jquery.ajax as it
  throws a `TypeError: Cannot read property 'prototype' of undefined`
  due to how it interacts with Backbone. Added TODOs where we'll need
  to test
*/

const testChannel = {
  id: 'test-channel',
  main_tree: {
    id: 'main-tree-id',
  },
};

function createStore(channel) {
  const state = {
    channel: channel || testChannel,
  };

  return new Vuex.Store({
    state: state,
    actions: actions,
    mutations: mutations,
  });
}

describe('channelListStore', () => {
  let store;
  beforeEach(() => {
    store = createStore();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('publish mutations', () => {
    it('SET_CHANNEL should set state.channel', () => {
      store.commit('SET_CHANNEL', testChannel);
      expect(store.state.channel.id).toBe('test-channel');
    });
    it('SET_CHANNEL_LANGUAGE should set state.channel.language', () => {
      store.commit('SET_CHANNEL_LANGUAGE', 'en');
      expect(store.state.channel.language).toBe('en');
    });
  });

  describe('publish actions', () => {
    it('publishChannel should post a request to publish_channel endpoint', () => {
      store.dispatch('publishChannel').then(() => {
        // TODO: publish_channel endpoint should be called
      });
    });
    it('setChannelLanguage should send a patch request to rest framework', () => {
      store.dispatch('setChannelLanguage', 'en').then(() => {
        expect(Backbone.sync.mock.calls[0][0]).toEqual('patch');
        expect(Backbone.sync.mock.calls[0][1].attributes.language).toEqual('en');
        expect(store.state.channel.language).toBe('en');
      });
    });
    it('loadChannelSize should send a get request to get_total_size endpoint', () => {
      store.dispatch('loadChannelSize').then(() => {
        // TODO: get_total_size endpoint should be called
      });
    });
  });
});
