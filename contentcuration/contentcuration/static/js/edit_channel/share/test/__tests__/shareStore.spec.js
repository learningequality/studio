import { mount } from '@vue/test-utils';
import _ from 'underscore';
import store from './../../vuex/store';
import { Permissions } from './../../constants';
import { defaultChannel, Users, Invitations } from './../data';
const Backbone = require('backbone');

/*
  TODO: there are some issues trying to mock jquery.ajax as it
  throws a `TypeError: Cannot read property 'prototype' of undefined`
  due to how it interacts with Backbone. Added TODOs where we'll need
  to test
*/

describe('channelListStore', () => {
  let channel;
  beforeEach(() => {
    store.commit('share/RESET');
    store.commit('share/SET_CHANNEL', defaultChannel);
  })
  afterEach(() => {
    jest.clearAllMocks();
  })

  describe("loading lists", () => {
    it('loadAccessList should load editors and viewers', () => {
      store.dispatch('share/loadAccessList');
      // TODO: make sure list is loaded, waiting for non-backbone implementation
    });
    it('SET_ACCESS_LIST should set editors and viewers', () => {
      store.commit('share/SET_ACCESS_LIST', Users);

      expect(store.state.share.accessList).toHaveLength(Users.length);
      _.each(Users, (user) => {
        expect(_.findWhere(store.state.share.accessList, {'id': user.id})).toBeTruthy();
      })
    });

    it('loadInvitationList should load editors and viewers', () => {
      store.dispatch('share/loadInvitationList');
      // TODO: make sure list is loaded, waiting for non-backbone implementation
    });
    it('SET_INVITATIONS should set invitations', () => {
      store.commit('share/SET_INVITATIONS', Invitations);
      expect(store.state.share.invitations).toHaveLength(Invitations.length);
      _.each(Invitations, (invite) => {
        expect(_.findWhere(store.state.share.invitations, {'id': invite.id})).toBeTruthy();
      })
    });
  });

  describe("editor actions and mutations", () => {
    let testUser;
    beforeEach(() => {
      testUser = {
        "id": 5,
        "first_name": "Test",
        "last_name": "User",
        "is_admin": true,
        "email": "test@test.com"
      };
      store.commit('share/ADD_USER', testUser);
    })

    it('addEditor should call make_editor', () => {
      store.dispatch('share/addEditor', {'user': testUser});
      // TODO: check endpoint was called
    });

    it('ADD_USER should add the user to the list of channel editors and accessList', () => {
      expect(_.findWhere(store.state.share.accessList, {'id': testUser.id})).toBeTruthy();
      expect(store.state.share.channel.editors).toContain(testUser.id);
    });

    it('removeEditor should call remove_editor', () => {
      store.dispatch('share/removeUser', testUser);
      // TODO: check endpoint was called
    });

    it('REMOVE_USER should remove user from editors list', () => {
      store.commit('share/REMOVE_USER', testUser.id);
      expect(_.findWhere(store.state.share.accessList, {'id': testUser.id})).toBeFalsy();
      expect(store.state.share.channel.editors).not.toContain(testUser.id);
      expect(store.state.share.channel.viewers).not.toContain(testUser.id);
    });
  });

  describe("invitation actions and mutations", () => {
    let testInvitation;

    beforeEach(() => {
      testInvitation = {
        "id": "testinvitation",
        "share_mode": "edit",
        "sender": {
          "first_name": "First",
          "last_name": "User"
        }
      };
      store.commit('share/ADD_INVITATION', testInvitation);
    });

    it('sendInvitation should call send_invitation_email', () => {
      store.dispatch('share/sendInvitation', testInvitation);
      // TODO: check endpoint was called
    });

    it('ADD_INVITATION should add the invitation to the list of invitations', () => {
      function testPermission(share_mode) {
        let testInvite = {
          "id": "test_" + share_mode,
          "email": share_mode + "@test.com",
          "share_mode": share_mode,
          "sender": {
            "first_name": "First",
            "last_name": "User"
          }
        }
        store.commit('share/ADD_INVITATION', testInvite);
        let match = _.findWhere(store.state.share.invitations, {'id': testInvite.id});
        expect(match).toBeTruthy();
        expect(match.share_mode).toEqual(share_mode);
        expect(match.email).toEqual(share_mode + "@test.com");
        store.commit('share/RESET');
      }
      _.each(_.values(Permissions), testPermission);
    });

    it('deleteInvitation should delete the invitation', () => {
      store.dispatch('share/deleteInvitation', testInvitation);
      // TODO: check endpoint was called, wait for non-backbone implementation
    });

    it('REMOVE_INVITATION should remove invitation from list of invitations', () => {
      store.commit('share/REMOVE_INVITATION', testInvitation.id);
      expect(_.findWhere(store.state.share.invitations, {'id': testInvitation.id})).toBeFalsy();
    });
  });

});
