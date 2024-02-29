import pick from 'lodash/pick';
import channel from '../index';
import {
  Bookmark,
  Channel,
  Invitation,
  ChannelUser,
  ViewerM2M,
  EditorM2M,
  User,
  injectVuexStore,
} from 'shared/data/resources';
import { SharingPermissions } from 'shared/constants';
import storeFactory from 'shared/vuex/baseStore';
import client from 'shared/client';

jest.mock('shared/vuex/connectionPlugin');

const userId = 'testId';

describe('channel actions', () => {
  let store;
  let id;
  const channelDatum = { name: 'test', deleted: false, edit: true };
  beforeEach(() => {
    store = storeFactory({
      modules: {
        channel,
      },
    });
    injectVuexStore(store);
    store.state.session.currentUser.id = userId;
    return Channel.add(channelDatum).then(newId => {
      id = newId;
      channelDatum.id = id;
    });
  });
  afterEach(() => {
    injectVuexStore();
    return Channel.table.toCollection().delete();
  });
  describe('loadChannelList action', () => {
    it('should call Channel.where', () => {
      const whereSpy = jest.spyOn(Channel, 'where').mockImplementation(() => Promise.resolve([]));
      return store.dispatch('channel/loadChannelList').then(() => {
        expect(whereSpy).toHaveBeenCalledWith({});
        whereSpy.mockRestore();
      });
    });
    it('should call Channel.where with a specific listType', () => {
      const whereSpy = jest.spyOn(Channel, 'where').mockImplementation(() => Promise.resolve([]));
      return store.dispatch('channel/loadChannelList', { listType: 'edit' }).then(() => {
        expect(whereSpy).toHaveBeenCalledWith({ edit: true });
        whereSpy.mockRestore();
      });
    });
    it('should set the returned data to the channels', () => {
      const whereSpy = jest
        .spyOn(Channel, 'where')
        .mockImplementation(() => Promise.resolve([channelDatum]));
      return store.dispatch('channel/loadChannelList').then(() => {
        expect(store.getters['channel/channels']).toEqual([{ ...channelDatum, bookmark: false }]);
        whereSpy.mockRestore();
      });
    });
  });

  describe('loadChannel action', () => {
    it('should call Channel.getCatalogChannel if user is not logged in', async () => {
      store.state.session.currentUser.id = undefined;
      const getSpy = jest.spyOn(Channel, 'getCatalogChannel');
      return store.dispatch('channel/loadChannel', id).then(() => {
        expect(getSpy).toHaveBeenCalledWith(id);
        getSpy.mockRestore();
      });
    });
    it('should call Channel.get if user is logged in', () => {
      const getSpy = jest
        .spyOn(Channel, 'get')
        .mockImplementation(() => Promise.resolve(channelDatum));
      return store.dispatch('channel/loadChannel', id).then(() => {
        expect(getSpy).toHaveBeenCalledWith(id);
        getSpy.mockRestore();
      });
    });
    it('should set the returned data to the channels', () => {
      const getSpy = jest
        .spyOn(Channel, 'get')
        .mockImplementation(() => Promise.resolve(channelDatum));
      return store.dispatch('channel/loadChannel', id).then(() => {
        expect(store.getters['channel/channels']).toEqual([{ ...channelDatum, bookmark: false }]);
        getSpy.mockRestore();
      });
    });
  });
  describe('loadChannelDetails action', () => {
    it('should call client.get on get_channel_details', () => {
      return store.dispatch('channel/loadChannelDetails', id).then(() => {
        expect(client.get).toHaveBeenCalledWith('get_channel_details');
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
    beforeEach(() => {
      Channel.softDelete = jest.fn().mockReturnValue(Promise.resolve());
    });
    it('should call Channel.softDelete', () => {
      const updateSpy = jest.spyOn(Channel, 'softDelete');
      store.commit('channel/ADD_CHANNEL', {
        id,
        name: 'test',
      });
      return store.dispatch('channel/deleteChannel', id).then(() => {
        expect(updateSpy).toHaveBeenCalledWith(id);
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
    it('should call Bookmark.add when creating a bookmark', () => {
      const addSpy = jest.spyOn(Bookmark, 'add');
      store.commit('channel/ADD_CHANNEL', {
        id,
        name: 'test',
      });
      return store.dispatch('channel/bookmarkChannel', { id, bookmark: true }).then(() => {
        expect(addSpy).toHaveBeenCalledWith({ channel: id });
      });
    });
    it('should call Bookmark.delete when removing a bookmark', () => {
      const deleteSpy = jest.spyOn(Bookmark, 'delete');
      store.commit('channel/ADD_CHANNEL', {
        id,
        name: 'test',
      });
      return store.dispatch('channel/bookmarkChannel', { id, bookmark: false }).then(() => {
        expect(deleteSpy).toHaveBeenCalledWith(id);
      });
    });
    it('should set the channel as bookmarked in vuex state', () => {
      store.commit('channel/ADD_CHANNEL', {
        id,
        name: 'test',
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
    can_view: true,
    can_edit: false,
  };
  let testInvitations;
  function makeInvitations(channelId) {
    const base = {
      share_mode: SharingPermissions.EDIT,
      email: 'invitation@test.com',
      accepted: false,
      declined: false,
      revoked: false,
      channel: channelId,
    };
    return [
      {
        ...base,
        id: 'test-invitation',
      },
      {
        ...base,
        id: 'declined-invitation',
        declined: true,
      },
      {
        ...base,
        id: 'revoked-invitation',
        revoked: true,
      },
    ];
  }
  const channelDatum = {
    id: 'test',
    name: 'test',
    deleted: false,
    edit: true,
  };

  beforeEach(() => {
    jest.spyOn(Channel, 'fetchModel').mockImplementation(() => Promise.resolve(channelDatum));
    jest
      .spyOn(Channel, 'fetchCollection')
      .mockImplementation(() => Promise.resolve([channelDatum]));
    jest
      .spyOn(Invitation, 'fetchModel')
      .mockImplementation(() => Promise.resolve(makeInvitations(channelId)[0]));
    jest
      .spyOn(Invitation, 'fetchCollection')
      .mockImplementation(() => Promise.resolve(makeInvitations(channelId)));
    jest.spyOn(ChannelUser, 'fetchModel').mockImplementation(() => Promise.resolve(testUser));
    jest
      .spyOn(ChannelUser, 'fetchCollection')
      .mockImplementation(() => Promise.resolve([testUser]));
    store = storeFactory({
      modules: {
        channel,
      },
    });
    injectVuexStore(store);
    store.state.session.currentUser.id = userId;
    return Channel.add(channelDatum).then(newId => {
      channelId = newId;
      const user = {
        ...testUser,
      };
      const invitations = makeInvitations(channelId);
      testInvitations = invitations;

      return User.add(user).then(() => {
        return ViewerM2M.add({ user: user.id, channel: channelDatum.id }).then(() => {
          return Invitation.table.bulkPut(invitations).then(() => {
            store.commit('channel/ADD_CHANNEL', { id: channelId, ...channelDatum });
            store.commit('channel/SET_USERS_TO_CHANNEL', { channelId, users: [user] });
            store.commit('channel/ADD_INVITATIONS', invitations);
          });
        });
      });
    });
  });
  afterEach(() => {
    jest.restoreAllMocks();
    injectVuexStore();
    return Promise.all([
      Channel.table.toCollection().delete(),
      ViewerM2M.table.toCollection().delete(),
      EditorM2M.table.toCollection().delete(),
      User.table.toCollection().delete(),
      Invitation.table.toCollection().delete(),
    ]);
  });

  describe('getters', () => {
    it('getChannelUsers should return users with the given permission', () => {
      const getter = store.getters['channel/getChannelUsers'];
      expect(getter(channelId)[0]).toEqual(pick(testUser, ['email', 'id']));
      expect(getter(channelId, SharingPermissions.EDIT)).toHaveLength(0);
    });
    it('getChannelInvitations should return pending invitations with the given permission', () => {
      const getter = store.getters['channel/getChannelInvitations'];
      expect(getter(channelId, SharingPermissions.EDIT)[0]).toEqual({
        ...testInvitations[0],
        channel: channelId,
      });
      expect(getter(channelId)).toHaveLength(0);
    });
    it('checkUsers should indicate if one of the users has the given email', () => {
      const getter = store.getters['channel/checkUsers'];
      expect(getter(channelId, testUser.email)).toBe(true);
      expect(getter(channelId, testUser.email.toUpperCase())).toBe(true);
      expect(getter(channelId, 'fake@fraud.com')).toBe(false);
      expect(getter(channelId, testInvitations[0].email)).toBe(false);
    });
    it('checkInvitations should indicate if one of the invitations has the given email', () => {
      const getter = store.getters['channel/checkInvitations'];
      expect(getter(channelId, testInvitations[0].email)).toBe(true);
      expect(getter(channelId, testInvitations[0].email.toUpperCase())).toBe(true);
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
    it('should call ChannelUser.where', () => {
      const whereSpy = jest.spyOn(ChannelUser, 'where');
      return store.dispatch('channel/loadChannelUsers', channelId).then(() => {
        expect(whereSpy).toHaveBeenCalled();
        whereSpy.mockRestore();
      });
    });
    it('should set the returned data to the relative maps', () => {
      return store.dispatch('channel/loadChannelUsers', channelId).then(() => {
        expect(store.state.channel.channelUsersMap).toEqual({
          [testUser.id]: pick(testUser, ['email', 'id']),
        });
        expect(store.state.channel.channelViewersMap).toEqual({
          [channelDatum.id]: {
            [testUser.id]: true,
          },
        });
        expect(store.state.channel.channelEditorsMap).toEqual({});
        expect(store.state.channel.invitationsMap).toEqual({
          [testInvitations[0].id]: {
            ...testInvitations[0],
            channel: channelId,
          },
          [testInvitations[1].id]: {
            ...testInvitations[1],
            channel: channelId,
          },
          [testInvitations[2].id]: {
            ...testInvitations[2],
            channel: channelId,
          },
        });
      });
    });
    it('should clear out old invitations', async () => {
      const declinedInvitation = {
        id: 'choosy-invitation',
        email: 'choosy-collaborator@test.com',
        declined: true,
        channel: 'some-other-channel',
        user: 'some-other-user',
      };

      await Invitation.add(declinedInvitation);
      await store.dispatch('channel/loadChannelUsers', channelId);
      expect(Object.keys(store.state.channel.invitationsMap)).not.toContain('choosy-invitation');
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
    it('should call Invitation.update with revoked as true', () => {
      const testInvitationId = 'test-invitation-delete';
      const updateSpy = jest.spyOn(Invitation, 'update');
      return store.dispatch('channel/deleteInvitation', testInvitationId).then(() => {
        expect(updateSpy).toHaveBeenCalled();
        expect(updateSpy.mock.calls[0][0]).toBe(testInvitationId);
        expect(updateSpy.mock.calls[0][1]).toEqual({ revoked: true });
        updateSpy.mockRestore();
      });
    });
    it('should remove invitation from the store', () => {
      return store.dispatch('channel/deleteInvitation', testInvitations[0].id).then(() => {
        expect(store.state.channel.invitationsMap[testInvitations[0].id]).toBeFalsy();
      });
    });
  });
  describe('makeEditor action', () => {
    it('should call ChannelUser.makeEditor', () => {
      const makeEditorSpy = jest.spyOn(ChannelUser, 'makeEditor');
      return store
        .dispatch('channel/makeEditor', { channelId: channelDatum.id, userId: testUser.id })
        .then(() => {
          expect(makeEditorSpy).toHaveBeenCalled();
          makeEditorSpy.mockRestore();
        });
    });
    it('should set the editors and viewers according to update', () => {
      return store
        .dispatch('channel/makeEditor', { channelId: channelDatum.id, userId: testUser.id })
        .then(() => {
          expect(store.state.channel.channelEditorsMap).toEqual({
            [channelDatum.id]: {
              [testUser.id]: true,
            },
          });
          expect(store.state.channel.channelViewersMap).toEqual({ [channelDatum.id]: {} });
        });
    });
  });
  describe('removeViewer action', () => {
    it('should call ChannelUser.removeViewer with removed viewer', () => {
      const removeViewerSpy = jest.spyOn(ChannelUser, 'removeViewer');
      return store
        .dispatch('channel/removeViewer', { channelId: channelDatum.id, userId: testUser.id })
        .then(() => {
          expect(removeViewerSpy).toHaveBeenCalled();
          removeViewerSpy.mockRestore();
        });
    });
    it('should set the viewers according to update', () => {
      return store
        .dispatch('channel/removeViewer', { channelId: channelDatum.id, userId: testUser.id })
        .then(() => {
          expect(store.state.channel.channelViewersMap).toEqual({ [channelDatum.id]: {} });
        });
    });
  });
});
