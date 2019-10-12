import channelSet from '../index';
import { channelSetLastSavedState } from '../utils';
import { generateTempId } from 'shared/utils';
import client from 'shared/client';
import storeFactory from 'shared/vuex/baseStore';

jest.mock('shared/client');
jest.mock('shared/vuex/connectionPlugin');

const id = '00000000000000000000000000000000';

const userId = 'testId';

describe('channelSet actions', () => {
  let store;
  beforeEach(() => {
    store = storeFactory({
      modules: {
        channelSet,
      },
    });
    store.state.session.currentUser.id = userId;
  });
  describe('loadChannelSetList action', () => {
    it('should call client.get', () => {
      client.__setResponse('get', {
        data: [],
      });
      return store.dispatch('channelSet/loadChannelSetList').then(() => {
        expect(client.get).toHaveBeenCalledWith('channelset-list');
      });
    });
    it('should set the returned data to the channelSets', () => {
      const channelSets = [
        {
          id: '00000000000000000000000000000000',
          name: 'test',
          channels: ['11111111111111111111111111111111'],
        },
      ];
      client.__setResponse('get', {
        data: channelSets,
      });
      return store.dispatch('channelSet/loadChannelSetList').then(() => {
        expect(store.getters['channelSet/channelSets']).toEqual(channelSets);
      });
    });
  });
  describe('saveChannelSet action', () => {
    describe('for a new channelSet', () => {
      const tempId = generateTempId();
      it('should call client.post', () => {
        store.commit('channelSet/ADD_CHANNELSET', {
          id: tempId,
          name: 'test',
          channels: ['11111111111111111111111111111111'],
        });
        client.__setResponse('post', {
          data: {
            id,
            name: 'test',
          },
        });
        return store.dispatch('channelSet/saveChannelSet', tempId).then(() => {
          expect(client.post).toHaveBeenCalledWith('channelset-list', {
            editors: [userId],
            name: 'test',
            channels: ['11111111111111111111111111111111'],
          });
        });
      });
      it('should remove the original channelSet', () => {
        store.commit('channelSet/ADD_CHANNELSET', {
          id: tempId,
          name: 'test',
          channels: ['11111111111111111111111111111111'],
        });
        client.__setResponse('post', {
          data: {
            id,
            name: 'test',
          },
        });
        return store.dispatch('channelSet/saveChannelSet', tempId).then(() => {
          expect(store.getters['channelSet/getChannelSet'](tempId)).toBeUndefined();
        });
      });
      it('should add the new channelSet', () => {
        store.commit('channelSet/ADD_CHANNELSET', {
          id: tempId,
          name: 'test',
          channels: ['11111111111111111111111111111111'],
        });
        client.__setResponse('post', {
          data: {
            id,
            name: 'test',
            channels: ['11111111111111111111111111111111'],
          },
        });
        return store.dispatch('channelSet/saveChannelSet', tempId).then(() => {
          expect(store.getters['channelSet/getChannelSet'](id)).toEqual({
            id,
            name: 'test',
            channels: ['11111111111111111111111111111111'],
          });
        });
      });
    });
    describe('for an existing channel', () => {
      it('should call client.patch', () => {
        store.commit('channelSet/ADD_CHANNELSET', {
          id,
          name: 'test',
          channels: ['11111111111111111111111111111111'],
        });
        client.__setResponse('patch', {
          data: true,
        });
        store.commit('channelSet/UPDATE_CHANNELSET', {
          id,
          name: 'notatest',
        });
        return store.dispatch('channelSet/saveChannelSet', id).then(() => {
          expect(client.patch).toHaveBeenCalledWith('channelset-detail', {
            name: 'notatest',
          });
        });
      });
      it('should set channel last saved state so that there is no diff', () => {
        store.commit('channelSet/ADD_CHANNELSET', {
          id,
          name: 'test',
          channels: ['11111111111111111111111111111111'],
        });
        client.__setResponse('patch', {
          data: true,
        });
        store.commit('channelSet/UPDATE_CHANNELSET', {
          id,
          name: 'notatest',
        });
        return store.dispatch('channelSet/saveChannelSet', id).then(() => {
          expect(
            channelSetLastSavedState.hasUnsavedChanges(
              store.getters['channelSet/getChannelSet'](id)
            )
          ).toBe(false);
        });
      });
    });
  });
  describe('deleteChannelSet action', () => {
    it('should call client.delete', () => {
      store.commit('channelSet/ADD_CHANNELSET', {
        id,
        name: 'test',
      });
      return store.dispatch('channelSet/deleteChannelSet', id).then(() => {
        expect(client.delete).toHaveBeenCalledWith('channelset-detail');
      });
    });
    it('should remove the channel from vuex state', () => {
      store.commit('channelSet/ADD_CHANNELSET', {
        id,
        name: 'test',
      });
      return store.dispatch('channelSet/deleteChannelSet', id).then(() => {
        expect(store.getters['channelSet/getChannelSet'](id)).toBeUndefined();
      });
    });
  });
});
