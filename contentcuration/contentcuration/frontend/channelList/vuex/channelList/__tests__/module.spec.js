import Vue from 'vue';
import channelList from '../index';
import { Channel, Invitation } from 'shared/data/resources';
import storeFactory from 'shared/vuex/baseStore';

jest.mock('shared/vuex/connectionPlugin');

const channel_id = '11111111111111111111111111111111';
const userId = 'testId';
const invitation = {
  channel: channel_id,
  invited: userId,
  share_mode: 'view',
};

describe('invitation actions', () => {
  let store;
  let id;
  beforeEach(() => {
    return Invitation.add(invitation).then(newId => {
      id = newId;
      store = storeFactory({
        modules: {
          channelList,
        },
      });
      store.state.session.currentUser.id = userId;
    });
  });
  afterEach(() => {
    return Invitation.table.toCollection().delete();
  });

  describe('loadInvitationList action', () => {
    it('should call Invitation.where', () => {
      const whereSpy = jest.spyOn(Invitation, 'where');
      return store.dispatch('channelList/loadInvitationList').then(() => {
        expect(whereSpy).toHaveBeenCalled();
        whereSpy.mockRestore();
      });
    });
    it('should set the returned data to the invitations', () => {
      return store.dispatch('channelList/loadInvitationList').then(() => {
        expect(store.getters['channelList/invitations']).toEqual([
          {
            id,
            ...invitation,
            accepted: false,
            declined: false,
            revoked: false,
          },
        ]);
      });
    });
  });
  describe('acceptInvitation action', () => {
    const channel = { id: channel_id, name: 'test', deleted: false, edit: true };
    beforeEach(() => {
      store.commit('channelList/SET_INVITATION_LIST', [{ id, ...invitation }]);
      return Channel.add(channel);
    });
    afterEach(() => {
      return Channel.table.toCollection().delete();
    });
    it('should call accept', () => {
      const acceptSpy = jest.spyOn(Invitation, 'accept');
      return store.dispatch('channelList/acceptInvitation', id).then(() => {
        expect(acceptSpy).toHaveBeenCalled();
        expect(acceptSpy.mock.calls[0][0]).toBe(id);
        acceptSpy.mockRestore();
      });
    });
    it('should load and set the invited channel', () => {
      return store.dispatch('channelList/acceptInvitation', id).then(() => {
        expect(store.getters['channel/getChannel'](channel_id).id).toBeTruthy();
      });
    });
    it('should  remove the invitation from the list', () => {
      return store.dispatch('channelList/acceptInvitation', id).then(() => {
        expect(store.getters['channelList/getInvitation'](id)).toBeFalsy();
      });
    });
    it('should set the correct permission on the accepted invite', () => {
      return store.dispatch('channelList/acceptInvitation', id).then(() => {
        expect(store.getters['channel/getChannel'](channel_id).view).toBe(true);
        expect(store.getters['channel/getChannel'](channel_id).edit).toBe(false);
      });
    });
  });
  describe('declineInvitation action', () => {
    beforeEach(() => {
      store.commit('channelList/SET_INVITATION_LIST', [{ id, ...invitation }]);
    });
    it('should call client.delete', () => {
      const declineSpy = jest.spyOn(Invitation, 'decline');
      return store.dispatch('channelList/declineInvitation', id).then(() => {
        expect(declineSpy).toHaveBeenCalled();
        expect(declineSpy.mock.calls[0][0]).toBe(id);
        declineSpy.mockRestore();
      });
    });
    it('should not load and set the invited channel', () => {
      return store.dispatch('channelList/declineInvitation', id).then(() => {
        expect(store.getters['channel/getChannel'](channel_id)).toBeUndefined();
      });
    });
    it('should remove the invitation from the list', () => {
      return store.dispatch('channelList/declineInvitation', id).then(() => {
        expect(store.getters['channelList/getInvitation'](id)).toBeFalsy();
      });
    });
  });
});

describe('searchCatalog action', () => {
  let store;
  const searchCatalog = jest.fn();
  beforeEach(() => {
    searchCatalog.mockReset();
    Channel.searchCatalog = data => {
      return new Promise(resolve => {
        searchCatalog(data);
        resolve({ results: [] });
      });
    };
    store = storeFactory({
      modules: {
        channelList,
      },
    });
    store.state.session.currentUser.id = undefined;
  });
  it('should call Channel.searchCatalog if user is not logged in', () => {
    return store.dispatch('channelList/searchCatalog', {}).then(() => {
      expect(searchCatalog).toHaveBeenCalled();
    });
  });
  it('should only look for public and published channels', () => {
    return store.dispatch('channelList/searchCatalog', {}).then(() => {
      expect(searchCatalog.mock.calls[0][0].public).toBe(true);
      expect(searchCatalog.mock.calls[0][0].published).toBe(true);
      expect(searchCatalog.mock.calls[0][0].page_size).toBeTruthy();
    });
  });
  it('should use query params in query filter', () => {
    return store.dispatch('channelList/searchCatalog', { keywords: 'testing' }).then(() => {
      expect(searchCatalog.mock.calls[0][0].keywords).toBe('testing');
    });
  });
  it('should log the analytics event', () => {
    const trackSpy = jest.spyOn(Vue.$analytics, 'trackEvent');
    return store.dispatch('channelList/searchCatalog', { keywords: 'test tracking' }).then(() => {
      expect(trackSpy).toHaveBeenCalled();

      const firstCall = trackSpy.mock.calls[0];
      expect(firstCall[0]).toBe('Catalog search');
      expect(firstCall[1]).toMatchObject({
        eventAction: 'keywords=test tracking',
      });
      trackSpy.mockRestore();
    });
  });
});
