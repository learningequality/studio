import currentChannel from '../index';
import storeFactory from 'shared/vuex/baseStore';
import client from 'shared/client';
import { Channel } from 'shared/data/resources';

jest.mock('shared/client');
jest.mock('shared/vuex/connectionPlugin');

describe('currentChannel store', () => {
  let store;
  beforeEach(() => {
    store = storeFactory({
      modules: { currentChannel },
    });
  });
  describe('actions', () => {
    it('loadChannelSize action should get from contentnode_size endpoint', () => {
      return store.dispatch('currentChannel/loadChannelSize', 'root-id').then(() => {
        expect(client.get.mock.calls[0][0]).toBe('contentnode_size');
        client.get.mockRestore();
      });
    });
    it('publishChannel action should post to publish_channel endpoint', () => {
      let notes = 'version notes';
      const spy = jest.spyOn(Channel, 'publish').mockImplementation(() => Promise.resolve());
      return store.dispatch('currentChannel/publishChannel', notes).then(() => {
        expect(spy.mock.calls[0][0]).toBe(store.state.currentChannel.currentChannelId);
        expect(spy.mock.calls[0][1]).toBe(notes);
        spy.mockRestore();
      });
    });
  });
});
