import channelList, { channelLastSavedState } from '../index';
import { generateTempId } from 'shared/utils';
import client from 'shared/client';
import storeFactory from 'shared/vuex/baseStore';

jest.mock('shared/client');

const id = '00000000000000000000000000000000';

const userId = 'testId';

describe('channel actions', () => {
  let store;
  beforeEach(() => {
    store = storeFactory({
      modules: {
        channelList,
      },
    });
    store.state.session.currentUser.id = userId;
  });
  describe('loadChannelList action', () => {
    it('should call client.get', () => {
      return store.dispatch('channelList/loadChannelList').then(() => {
        expect(client.get).toHaveBeenCalledWith('channel-list', { params: {} });
      });
    });
    it('should call client.get with a specific listType', () => {
      return store.dispatch('channelList/loadChannelList', 'edit').then(() => {
        expect(client.get).toHaveBeenCalledWith('channel-list', { params: 'edit' });
      });
    });
    it('should set the returned data to the channels', () => {
      const channels = [{ id: '00000000000000000000000000000000', name: 'test' }];
      client.__setResponse('get', {
        data: channels,
      });
      return store.dispatch('channelList/loadChannelList').then(() => {
        expect(store.getters['channelList/channels']).toEqual(channels);
      });
    });
  });
  describe('loadChannel action', () => {
    it('should call client.get', () => {
      return store.dispatch('channelList/loadChannel', id).then(() => {
        expect(client.get).toHaveBeenCalledWith('channel-detail');
      });
    });
    it('should set the returned data to the channels', () => {
      const channel = { id: '00000000000000000000000000000000', name: 'test' };
      client.__setResponse('get', {
        data: channel,
      });
      return store.dispatch('channelList/loadChannel', id).then(() => {
        expect(store.getters['channelList/channels']).toEqual([channel]);
      });
    });
  });
  describe('saveChannel action', () => {
    describe('for a new channel', () => {
      const tempId = generateTempId();
      it('should call client.post', () => {
        store.commit('channelList/ADD_CHANNEL', {
          id: tempId,
          name: 'test',
        });
        client.__setResponse('post', {
          data: {
            id,
            name: 'test',
          },
        });
        return store.dispatch('channelList/saveChannel', tempId).then(() => {
          expect(client.post).toHaveBeenCalledWith('channel-list', {
            editors: [userId],
            name: 'test',
          });
        });
      });
      it('should remove the original channel', () => {
        store.commit('channelList/ADD_CHANNEL', {
          id: tempId,
          name: 'test',
        });
        client.__setResponse('post', {
          data: {
            id,
            name: 'test',
          },
        });
        return store.dispatch('channelList/saveChannel', tempId).then(() => {
          expect(store.getters['channelList/getChannel'](tempId)).toBeUndefined();
        });
      });
      it('should add the new channel', () => {
        store.commit('channelList/ADD_CHANNEL', {
          id: tempId,
          name: 'test',
        });
        client.__setResponse('post', {
          data: {
            id,
            name: 'test',
          },
        });
        return store.dispatch('channelList/saveChannel', tempId).then(() => {
          expect(store.getters['channelList/getChannel'](id)).toEqual({
            id,
            name: 'test',
          });
        });
      });
    });
    describe('for an existing channel', () => {
      it('should call client.patch', () => {
        store.commit('channelList/ADD_CHANNEL', {
          id,
          name: 'test',
        });
        client.__setResponse('patch', {
          data: true,
        });
        store.commit('channelList/UPDATE_CHANNEL', {
          id,
          name: 'notatest',
          description: 'very',
          language: 'no',
        });
        return store.dispatch('channelList/saveChannel', id).then(() => {
          expect(client.patch).toHaveBeenCalledWith('channel-detail', {
            name: 'notatest',
            description: 'very',
            language: 'no',
            content_defaults: {},
          });
        });
      });
      it('should set channel last saved state so that there is no diff', () => {
        store.commit('channelList/ADD_CHANNEL', {
          id,
          name: 'test',
        });
        client.__setResponse('patch', {
          data: true,
        });
        store.commit('channelList/UPDATE_CHANNEL', {
          id,
          name: 'notatest',
        });
        return store.dispatch('channelList/saveChannel', id).then(() => {
          expect(
            channelLastSavedState.hasUnsavedChanges(store.getters['channelList/getChannel'](id))
          ).toBe(false);
        });
      });
      it('should call parse thumbnail options properly', () => {
        store.commit('channelList/ADD_CHANNEL', {
          id,
          name: 'test',
        });
        client.__setResponse('patch', {
          data: true,
        });
        store.commit('channelList/UPDATE_CHANNEL', {
          id,
          thumbnailData: {
            thumbnail: 'test',
            thumbnail_url: 'testUrl',
            thumbnail_encoding: 'testEncoding',
          },
        });
        return store.dispatch('channelList/saveChannel', id).then(() => {
          expect(client.patch).toHaveBeenCalledWith('channel-detail', {
            thumbnail: 'test',
            thumbnail_url: 'testUrl',
            thumbnail_encoding: 'testEncoding',
            content_defaults: {},
          });
        });
      });
    });
  });
  describe('deleteChannel action', () => {
    it('should call client.patch', () => {
      store.commit('channelList/ADD_CHANNEL', {
        id,
        name: 'test',
      });
      return store.dispatch('channelList/deleteChannel', id).then(() => {
        expect(client.patch).toHaveBeenCalledWith('channel-detail', { deleted: true });
      });
    });
    it('should remove the channel from vuex state', () => {
      store.commit('channelList/ADD_CHANNEL', {
        id,
        name: 'test',
      });
      return store.dispatch('channelList/deleteChannel', id).then(() => {
        expect(store.getters['channelList/getChannel'](id)).toBeUndefined();
      });
    });
  });
});
