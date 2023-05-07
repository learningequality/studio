import channelSet from '../index';
import { ChannelSet } from 'shared/data/resources';
import storeFactory from 'shared/vuex/baseStore';

jest.mock('shared/vuex/connectionPlugin');
const userId = 1;

describe('channelSet actions', () => {
  let store;
  let id;
  const channelSetDatum = {
    name: 'test',
    channels: { '11111111111111111111111111111111': true },
    edit: true,
  };
  beforeEach(() => {
    return ChannelSet.add(channelSetDatum).then(newId => {
      id = newId;
      store = storeFactory({
        modules: {
          channelSet,
        },
      });
      store.state.session.currentUser.id = userId;
    });
  });
  afterEach(() => {
    return ChannelSet.table.toCollection().delete();
  });
  describe('loadChannelSetList action', () => {
    it('should call ChannelSet.where', () => {
      const whereSpy = jest.spyOn(ChannelSet, 'where');
      return store.dispatch('channelSet/loadChannelSetList').then(() => {
        expect(whereSpy).toHaveBeenCalledWith({ edit: true });
        whereSpy.mockRestore();
      });
    });
    it('should set the returned data to the channelSets', () => {
      return store.dispatch('channelSet/loadChannelSetList').then(() => {
        expect(store.getters['channelSet/channelSets']).toEqual([{ id, ...channelSetDatum }]);
      });
    });
  });
  describe('createChannelSet action for a new channelSet', () => {
    it('should add a new channelSet with an id', () => {
      return store.dispatch('channelSet/createChannelSet').then(id => {
        expect(store.getters['channelSet/getChannelSet'](id)).not.toBeUndefined();
      });
    });
  });
  describe('updateChannelSet action for an existing channelSet', () => {
    it('should call ChannelSet.update', () => {
      store.commit('channelSet/ADD_CHANNELSET', {
        id,
        name: 'test',
        channels: {},
      });
      const updateSpy = jest.spyOn(ChannelSet, 'update');
      return store
        .dispatch('channelSet/updateChannelSet', {
          id,
          name: 'notatest',
          description: 'very',
        })
        .then(() => {
          expect(updateSpy).toHaveBeenCalledWith(id, {
            name: 'notatest',
            description: 'very',
          });
          updateSpy.mockRestore();
        });
    });
  });
  describe('addChannels action for an existing channelSet', () => {
    it('should call ChannelSet.update', () => {
      store.commit('channelSet/ADD_CHANNELSET', {
        id,
        name: 'test',
        channels: {},
      });
      const updateSpy = jest.spyOn(ChannelSet, 'update');
      return store
        .dispatch('channelSet/addChannels', {
          channelSetId: id,
          channelIds: ['this'],
        })
        .then(() => {
          expect(updateSpy).toHaveBeenCalledWith(id, {
            'channels.this': true,
          });
          updateSpy.mockRestore();
        });
    });
  });
  describe('removeChannels action for an existing channelSet', () => {
    it('should call ChannelSet.update', () => {
      store.commit('channelSet/ADD_CHANNELSET', {
        id,
        name: 'test',
        channels: {
          test: true,
        },
      });
      const updateSpy = jest.spyOn(ChannelSet, 'update');
      return store
        .dispatch('channelSet/removeChannels', {
          channelSetId: id,
          channelIds: ['this'],
        })
        .then(() => {
          expect(updateSpy).toHaveBeenCalledWith(id, {
            'channels.this': undefined,
          });
          updateSpy.mockRestore();
        });
    });
  });
  describe('deleteChannelSet action', () => {
    it('should call ChannelSet.delete', () => {
      store.commit('channelSet/ADD_CHANNELSET', {
        id,
        name: 'test',
        channels: {},
      });
      const deleteSpy = jest.spyOn(ChannelSet, 'delete');
      return store.dispatch('channelSet/deleteChannelSet', { id }).then(() => {
        expect(deleteSpy).toHaveBeenCalledWith(id);
        deleteSpy.mockRestore();
      });
    });
    it('should remove the channelSet from vuex state', () => {
      store.commit('channelSet/ADD_CHANNELSET', {
        id,
        name: 'test',
      });
      return store.dispatch('channelSet/deleteChannelSet', { id }).then(() => {
        expect(store.getters['channelSet/getChannelSet'](id)).toBeUndefined();
      });
    });
  });
});
