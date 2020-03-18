import currentChannel from '../index';
import storeFactory from 'shared/vuex/baseStore';
import client from 'shared/client';

jest.mock('shared/client');
jest.mock('shared/vuex/connectionPlugin');

const startTask = jest.fn();
const task = {
  namespaced: true,
  actions: {
    startTask,
  },
};

describe('currentChannel store', () => {
  let store;
  beforeEach(() => {
    store = storeFactory({
      modules: { currentChannel, task },
    });
    startTask.mockReset();
  });
  describe('actions', () => {
    it('loadChannelSize action should get from get_total_size endpoint', () => {
      return store.dispatch('currentChannel/loadChannelSize', 'root-id').then(() => {
        expect(client.get.mock.calls[0][0]).toBe('get_total_size');
        client.get.mockRestore();
      });
    });
    it('publishChannel action should post to publish_channel endpoint', () => {
      let notes = 'version notes';
      return store.dispatch('currentChannel/publishChannel', notes).then(() => {
        expect(client.post.mock.calls[0][0]).toBe('publish_channel');
        expect(client.post.mock.calls[0][1].version_notes).toBe(notes);
        expect(startTask).toHaveBeenCalled();
        client.post.mockRestore();
      });
    });
  });
});
