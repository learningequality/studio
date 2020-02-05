import channelList from '../index';
import client from 'shared/client';
import { Channel } from 'shared/data/resources';
import storeFactory from 'shared/vuex/baseStore';

jest.mock('shared/client');
jest.mock('shared/vuex/connectionPlugin');

const id = '00000000000000000000000000000000';

const userId = 'testId';

describe('invitation actions', () => {
  let store;
  beforeEach(() => {
    store = storeFactory({
      modules: {
        channelList,
      },
    });
    store.state.session.currentUser.id = userId;
  });
  describe('loadInvitationList action', () => {
    it('should call client.get', () => {
      client.__setResponse('get', {
        data: [],
      });
      return store.dispatch('channelList/loadInvitationList').then(() => {
        expect(client.get).toHaveBeenCalledWith('invitation_list', { params: { invited: userId } });
      });
    });
    it('should set the returned data to the invitations', () => {
      const invitations = [{ id }];
      client.__setResponse('get', {
        data: invitations,
      });
      return store.dispatch('channelList/loadInvitationList').then(() => {
        expect(store.getters['channelList/invitations']).toEqual(
          invitations.map(invite => ({
            ...invite,
            accepted: false,
            declined: false,
          }))
        );
      });
    });
  });
  describe('acceptInvitation action', () => {
    const channel_id = '11111111111111111111111111111111';
    const invitations = [{ id, channel_id }];
    const channel = { id: channel_id, name: 'test', deleted: false, edit: true };
    beforeEach(() => {
      return Channel.put(channel);
    });
    afterEach(() => {
      return Channel.table.toCollection().delete();
    });
    it('should call client.delete', () => {
      const channel_id = '11111111111111111111111111111111';
      const invitations = [{ id, channel_id }];
      store.commit('channelList/SET_INVITATION_LIST', invitations);
      return store.dispatch('channelList/acceptInvitation', id).then(() => {
        expect(client.delete).toHaveBeenCalledWith('invitation_detail', {
          params: { accepted: true },
        });
      });
    });
    it('should load and set the invited channel', () => {
      store.commit('channelList/SET_INVITATION_LIST', invitations);
      return store.dispatch('channelList/acceptInvitation', id).then(() => {
        expect(store.getters['channel/getChannel'](channel_id)).toEqual(channel);
      });
    });
    it('should set the invitation to accepted', () => {
      const channel_id = '11111111111111111111111111111111';
      const invitations = [{ id, channel_id }];
      store.commit('channelList/SET_INVITATION_LIST', invitations);
      return store.dispatch('channelList/acceptInvitation', id).then(() => {
        expect(store.getters['channelList/getInvitation'](id).accepted).toBe(true);
        expect(store.getters['channelList/getInvitation'](id).declined).toBe(false);
      });
    });
  });
  describe('declineInvitation action', () => {
    it('should call client.delete', () => {
      const channel_id = '11111111111111111111111111111111';
      const invitations = [{ id, channel_id }];
      store.commit('channelList/SET_INVITATION_LIST', invitations);
      return store.dispatch('channelList/declineInvitation', id).then(() => {
        expect(client.delete).toHaveBeenCalledWith('invitation_detail');
      });
    });
    it('should not load and set the invited channel', () => {
      const channel_id = '11111111111111111111111111111111';
      const invitations = [{ id, channel_id }];
      store.commit('channelList/SET_INVITATION_LIST', invitations);
      return store.dispatch('channelList/declineInvitation', id).then(() => {
        expect(store.getters['channel/getChannel'](channel_id)).toBeUndefined();
      });
    });
    it('should set the invitation to declined', () => {
      const channel_id = '11111111111111111111111111111111';
      const invitations = [{ id, channel_id }];
      store.commit('channelList/SET_INVITATION_LIST', invitations);
      return store.dispatch('channelList/declineInvitation', id).then(() => {
        expect(store.getters['channelList/getInvitation'](id).declined).toBe(true);
        expect(store.getters['channelList/getInvitation'](id).accepted).toBe(false);
      });
    });
  });
});
