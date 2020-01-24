import channel from '../index';
import { Channel } from 'shared/data/resources';
import storeFactory from 'shared/vuex/baseStore';

const userId = 'testId';

describe('channel actions', () => {
  let store;
  let id;
  const channelDatum = { name: 'test', deleted: false, edit: true };
  beforeEach(() => {
    return Channel.put(channelDatum).then(newId => {
      id = newId;
      store = storeFactory({
        modules: {
          channel,
        },
      });
      store.state.session.currentUser.id = userId;
    });
  });
  afterEach(() => {
    return Channel.table.toCollection().delete();
  });
  describe('loadChannelList action', () => {
    it('should call Channel.where', () => {
      const whereSpy = jest.spyOn(Channel, 'where');
      return store.dispatch('channel/loadChannelList').then(() => {
        expect(whereSpy).toHaveBeenCalledWith({ deleted: false });
        whereSpy.mockRestore();
      });
    });
    it('should call Channel.where with a specific listType', () => {
      const whereSpy = jest.spyOn(Channel, 'where');
      return store.dispatch('channel/loadChannelList', { listType: 'edit' }).then(() => {
        expect(whereSpy).toHaveBeenCalledWith({ edit: true, deleted: false });
        whereSpy.mockRestore();
      });
    });
    it('should set the returned data to the channels', () => {
      return store.dispatch('channel/loadChannelList').then(() => {
        expect(store.getters['channel/channels']).toEqual([channelDatum]);
      });
    });
  });
  describe('loadChannel action', () => {
    it('should call Channel.get', () => {
      const getSpy = jest.spyOn(Channel, 'get');
      return store.dispatch('channel/loadChannel', id).then(() => {
        expect(getSpy).toHaveBeenCalledWith(id);
        getSpy.mockRestore();
      });
    });
    it('should set the returned data to the channels', () => {
      return store.dispatch('channel/loadChannel', id).then(() => {
        expect(store.getters['channel/channels']).toEqual([channelDatum]);
      });
    });
  });
  describe('createChannel action for a new channel', () => {
    it('should add a new channel with an id', () => {
      return store.dispatch('channel/createChannel').then(id => {
        expect(store.getters['channel/getChannel'](id)).not.toBeUndefined();
      });
    });
  });
  describe('updateChannel action for an existing channel', () => {
    it('should call Channel.update', () => {
      store.commit('channel/ADD_CHANNEL', {
        id,
        name: 'test',
      });
      const updateSpy = jest.spyOn(Channel, 'update');
      return store.dispatch('channel/updateChannel', {
        id,
        name: 'notatest',
        description: 'very',
        language: 'no',
      }).then(() => {
        expect(updateSpy).toHaveBeenCalledWith(id, {
          name: 'notatest',
          description: 'very',
          language: 'no',
        });
        updateSpy.mockRestore();
      });
    });
    it('should call parse thumbnail options properly', () => {
      store.commit('channel/ADD_CHANNEL', {
        id,
        name: 'test',
      });
      const updateSpy = jest.spyOn(Channel, 'update');
      return store.dispatch('channel/updateChannel', {
        id,
        thumbnailData: {
          thumbnail: 'test',
          thumbnail_url: 'testUrl',
          thumbnail_encoding: 'testEncoding',
        }
      }).then(() => {
        expect(updateSpy).toHaveBeenCalledWith(id, {
          thumbnail: 'test',
          thumbnail_url: 'testUrl',
          thumbnail_encoding: 'testEncoding',
        });
        updateSpy.mockRestore();
      });
    });
  });
  describe('deleteChannel action', () => {
    it('should call Channel.update', () => {
      const updateSpy = jest.spyOn(Channel, 'update');
      store.commit('channel/ADD_CHANNEL', {
        id,
        name: 'test',
      });
      return store.dispatch('channel/deleteChannel', id).then(() => {
        expect(updateSpy).toHaveBeenCalledWith(id, { deleted: true });
      });
    });
    it('should remove the channel from vuex state', () => {
      store.commit('channel/ADD_CHANNEL', {
        id,
        name: 'test',
      });
      return store.dispatch('channel/deleteChannel', id).then(() => {
        expect(store.getters['channel/getChannel'](id)).toBeUndefined();
      });
    });
  });
  describe('bookmarkChannel action', () => {
    it('should call Channel.update', () => {
      const updateSpy = jest.spyOn(Channel, 'update');
      store.commit('channel/ADD_CHANNEL', {
        id,
        name: 'test',
        bookmark: false,
      });
      return store.dispatch('channel/bookmarkChannel', { id, bookmark: true }).then(() => {
        expect(updateSpy).toHaveBeenCalledWith(id, { bookmark: true });
      });
    });
    it('should set the channel as bookmarked in vuex state', () => {
      store.commit('channel/ADD_CHANNEL', {
        id,
        name: 'test',
        bookmark: false,
      });
      return store.dispatch('channel/bookmarkChannel', { id, bookmark: true }).then(() => {
        expect(store.getters['channel/getChannel'](id).bookmark).toBe(true);
      });
    });
  });
});
