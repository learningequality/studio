import channel from '../index';
import { Channel, Invitation, User } from 'shared/data/resources';
import { SharingPermissions } from 'shared/constants';
import storeFactory from 'shared/vuex/baseStore';
import client from 'shared/client';

jest.mock('shared/client');
jest.mock('shared/vuex/connectionPlugin');

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
      return store
        .dispatch('channel/updateChannel', {
          id,
          name: 'notatest',
          description: 'very',
          language: 'no',
        })
        .then(() => {
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
      return store
        .dispatch('channel/updateChannel', {
          id,
          thumbnailData: {
            thumbnail: 'test',
            thumbnail_url: 'testUrl',
            thumbnail_encoding: 'testEncoding',
          },
        })
        .then(() => {
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

describe('Channel sharing vuex', () => {
  let store;
  let channelId;
  const testUser = {
    id: 'test-user',
    email: 'user@test.com',
    include_viewonly: true,
  };
  const testInvitation = {
    id: 'test-invitation',
    email: 'invitation@test.com',
    share_mode: SharingPermissions.EDIT,
  };
  const channelDatum = {
    name: 'test',
    deleted: false,
    edit: true,
    editors: [],
    viewers: [testUser.id, 'other-user'],
  };

  beforeEach(() => {
    return Channel.put(channelDatum).then(newId => {
      channelId = newId;
      testUser.channel = channelId;
      testInvitation.channel = channelId;

      return User.put(testUser).then(() => {
        return Invitation.put(testInvitation).then(() => {
          store = storeFactory({
            modules: {
              channel,
            },
          });
          store.state.session.currentUser.id = userId;
          store.commit('channel/ADD_CHANNEL', { id: channelId, ...channelDatum });
          store.commit('channel/ADD_USER', testUser);
          store.commit('channel/ADD_INVITATION', testInvitation);
        });
      });
    });
  });
  afterEach(() => {
    store.commit('channel/REMOVE_CHANNEL', channelId);
    store.commit('channel/REMOVE_USER', testUser.id);
    store.commit('channel/DELETE_INVITATION', testInvitation.id);
    return Promise.all([
      Channel.table.toCollection().delete(),
      User.table.toCollection().delete(),
      Invitation.table.toCollection().delete(),
    ]);
  });

  describe('getters', () => {
    it('getChannelUsers should return users with the given permission', () => {
      const getter = store.getters['channel/getChannelUsers'];
      expect(getter(channelId)[0]).toEqual(testUser);
      expect(getter(channelId, SharingPermissions.EDIT)).toHaveLength(0);
    });
    it('getChannelInvitations should return invitations with the given permission', () => {
      const getter = store.getters['channel/getChannelInvitations'];
      expect(getter(channelId, SharingPermissions.EDIT)[0]).toEqual(testInvitation);
      expect(getter(channelId)).toHaveLength(0);
    });
    it('checkUsers should indicate if one of the users has the given email', () => {
      const getter = store.getters['channel/checkUsers'];
      expect(getter(channelId, testUser.email)).toBe(true);
      expect(getter(channelId, 'fake@fraud.com')).toBe(false);
      expect(getter(channelId, testInvitation.email)).toBe(false);
    });
    it('checkInvitations should indicate if one of the invitations has the given email', () => {
      const getter = store.getters['channel/checkInvitations'];
      expect(getter(channelId, testInvitation.email)).toBe(true);
      expect(getter(channelId, 'fake@fraud.com')).toBe(false);
      expect(getter(channelId, testUser.email)).toBe(false);
    });
  });
  describe('loadChannelUsers action', () => {
    it('should call Invitation.where', () => {
      const whereSpy = jest.spyOn(Invitation, 'where');
      return store.dispatch('channel/loadChannelUsers', channelId).then(() => {
        expect(whereSpy).toHaveBeenCalledWith({ channel: channelId });
        whereSpy.mockRestore();
      });
    });
    it('should call User.where', () => {
      const whereSpy = jest.spyOn(User, 'where');
      return store.dispatch('channel/loadChannelUsers', channelId).then(() => {
        expect(whereSpy).toHaveBeenCalled();
        whereSpy.mockRestore();
      });
    });
    it('should set the returned data to the relative maps', () => {
      return store.dispatch('channel/loadChannelUsers', channelId).then(() => {
        expect(store.state.channel.usersMap).toEqual({ [testUser.id]: testUser });
        expect(store.state.channel.invitationsMap).toEqual({ [testInvitation.id]: testInvitation });
      });
    });
  });

  describe('sendInvitation action', () => {
    let payload;
    beforeEach(() => {
      payload = {
        channelId,
        email: 'newuser@user.com',
        shareMode: SharingPermissions.EDIT,
      };
      client.post.mockResolvedValue({
        data: {
          id: 'test-send-invitation',
        },
      });
    });
    afterEach(() => {
      client.post.mockRestore();
    });

    it('should call send_invitation_email with given data', () => {
      return store.dispatch('channel/sendInvitation', payload).then(() => {
        expect(client.post.mock.calls[0][0]).toBe('send_invitation_email');
        expect(client.post.mock.calls[0][1]).toEqual({
          channel_id: channelId,
          user_email: payload.email,
          share_mode: payload.shareMode,
        });
      });
    });
    it('should add a new invitation to the store', () => {
      return store.dispatch('channel/sendInvitation', payload).then(() => {
        expect(store.state.channel.invitationsMap['test-send-invitation']).toBeTruthy();
      });
    });
  });
  describe('deleteInvitation action', () => {
    it('should call Invitation.update with declined as true', () => {
      const testInvitationId = 'test-invitation-delete';
      const updateSpy = jest.spyOn(Invitation, 'update');
      return store.dispatch('channel/deleteInvitation', testInvitationId).then(() => {
        expect(updateSpy).toHaveBeenCalled();
        expect(updateSpy.mock.calls[0][0]).toBe(testInvitationId);
        expect(updateSpy.mock.calls[0][1]).toEqual({ declined: true });
        updateSpy.mockRestore();
      });
    });
    it('should remove invitation from the store', () => {
      return store.dispatch('channel/deleteInvitation', testInvitation.id).then(() => {
        expect(store.state.channel.invitationsMap[testInvitation.id]).toBeFalsy();
      });
    });
  });
  describe('makeEditor action', () => {
    it('should call Channel.update with updated editor/viewer persmissions', () => {
      const updateSpy = jest.spyOn(Channel, 'update');
      return store.dispatch('channel/makeEditor', { channelId, userId: testUser.id }).then(() => {
        expect(updateSpy).toHaveBeenCalled();
        expect(updateSpy.mock.calls[updateSpy.mock.calls.length - 1][0]).toBe(channelId);
        expect(updateSpy.mock.calls[updateSpy.mock.calls.length - 1][1]).toEqual({
          editors: [testUser.id],
          viewers: ['other-user'],
        });
        updateSpy.mockRestore();
      });
    });
    it('should set the editors and viewers according to update', () => {
      return store.dispatch('channel/makeEditor', { channelId, userId: testUser.id }).then(() => {
        expect(store.state.channel.channelsMap[channelId].editors).toEqual([testUser.id]);
        expect(store.state.channel.channelsMap[channelId].viewers).toEqual(['other-user']);
      });
    });
  });
  describe('removeViewer action', () => {
    it('should call Channel.update with removed viewer permission', () => {
      const updateSpy = jest.spyOn(Channel, 'update');
      return store.dispatch('channel/removeViewer', { channelId, userId: testUser.id }).then(() => {
        expect(updateSpy).toHaveBeenCalled();
        expect(updateSpy.mock.calls[updateSpy.mock.calls.length - 1][0]).toBe(channelId);
        expect(updateSpy.mock.calls[updateSpy.mock.calls.length - 1][1]).toEqual({
          viewers: ['other-user'],
        });
        updateSpy.mockRestore();
      });
    });
    it('should set the viewers according to update', () => {
      return store.dispatch('channel/removeViewer', { channelId, userId: testUser.id }).then(() => {
        expect(store.state.channel.channelsMap[channelId].editors).toEqual([]);
        expect(store.state.channel.channelsMap[channelId].viewers).toEqual(['other-user']);
      });
    });
  });
});
