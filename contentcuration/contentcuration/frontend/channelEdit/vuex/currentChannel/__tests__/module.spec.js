import currentChannel from '../index';
import storeFactory from 'shared/vuex/baseStore';
import { Channel, ContentNode } from 'shared/data/resources';

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
      const spy = jest
        .spyOn(ContentNode, 'getResourceSize')
        .mockImplementation(() => Promise.resolve({ size: 123, stale: false, changes: [] }));
      return store.dispatch('currentChannel/loadChannelSize', 'root-id').then(() => {
        expect(spy.mock.calls[0][0]).toBe('root-id');
        spy.mockRestore();
      });
    });
    it('publishChannel action should post to publish_channel endpoint', () => {
      const notes = 'version notes';
      const language = 'en';
      const spy = jest.spyOn(Channel, 'publish').mockImplementation(() => Promise.resolve());
      return store
        .dispatch('currentChannel/publishChannel', { version_notes: notes, language })
        .then(() => {
          expect(spy.mock.calls[0][0]).toBe(store.state.currentChannel.currentChannelId);
          expect(spy.mock.calls[0][1]).toBe(notes);
          expect(spy.mock.calls[0][2]).toBe(language);
          spy.mockRestore();
        });
    });
    it('channelLanguageExistsInResources action should call `language_exists` endpoint', () => {
      const spy = jest
        .spyOn(Channel, 'languageExistsInResources')
        .mockImplementation(() => Promise.resolve());
      return store.dispatch('currentChannel/channelLanguageExistsInResources').then(() => {
        expect(spy.mock.calls[0][0]).toBe(store.state.currentChannel.currentChannelId);
        spy.mockRestore();
      });
    });
    it('getLanguagesInChannelResources action should call `languages` endpoint', () => {
      const spy = jest
        .spyOn(Channel, 'languagesInResources')
        .mockImplementation(() => Promise.resolve());
      return store.dispatch('currentChannel/getLanguagesInChannelResources').then(() => {
        expect(spy.mock.calls[0][0]).toBe(store.state.currentChannel.currentChannelId);
        spy.mockRestore();
      });
    });
  });
});
