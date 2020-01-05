import channelList from '../index';
import { channelLastSavedState } from '../utils';
import { generateTempId } from 'shared/utils';
import client from 'shared/client';
import storeFactory from 'shared/vuex/baseStore';

jest.mock('shared/client');
jest.mock('shared/vuex/connectionPlugin');

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
  describe('loadChannelDetails action', () => {
    it('should call client.get', () => {
      return store.dispatch('channelList/loadChannelDetails', id).then(() => {
        expect(client.get).toHaveBeenCalledWith('get_channel_details');
      });
    });
    it('should add the details to the channelDetailsMap', () => {
      client.__setResponse('get', {
        data: {
          details: 'details',
        },
      });
      return store.dispatch('channelList/loadChannelDetails', id).then(() => {
        expect(store.getters['channelList/getChannelDetails'](id)).toEqual({
          details: 'details',
        });
      });
    });
  });
});

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
      const channel_id = '11111111111111111111111111111111';
      const invitations = [{ id, channel_id }];
      store.commit('channelList/SET_INVITATION_LIST', invitations);
      const channel = { id: channel_id, name: 'test' };
      client.__setResponse('get', {
        data: channel,
      });
      return store.dispatch('channelList/acceptInvitation', id).then(() => {
        expect(store.getters['channelList/getChannel'](channel_id)).toEqual(channel);
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
        expect(store.getters['channelList/getChannel'](channel_id)).toBeUndefined();
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
