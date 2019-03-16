import { Permissions } from '../constants';
import Vue from 'vue';
var mutations = require('edit_channel/share/vuex/mutations');
var getters = require('edit_channel/share/vuex/getters');
const Vuex = require('vuex');
Vue.use(Vuex);

const Models = require("edit_channel/models");

import State from 'edit_channel/state';

export const currentUser = {
  "id": 4,
  "first_name": "Fourth",
  "last_name": "User",
  "is_admin": true,
  "email": "fourth@test.com"
}

export const defaultChannel = {
  "editors": [1, 3, currentUser.id],
  "viewers": [2],
  "pending_editors": [2]
}

State.current_user = new Models.UserModel(currentUser);
export const Users = [
  {
    "id": 1,
    "first_name": "First",
    "last_name": "User",
    "email": "first@test.com"
  },
  {
    "id": 2,
    "first_name": "Second",
    "last_name": "User",
    "email": "second@test.com"
  },
  {
    "id": 3,
    "first_name": "Third",
    "last_name": "User",
    "email": "third@test.com"
  },
  currentUser
]

export const Invitations = [
  {
    "id": "invitation1",
    "share_mode": "edit",
    "sender": {
      "first_name": "First",
      "last_name": "User"
    }
  },
  {
    "id": "invitation2",
    "share_mode": "view",
    "sender": {
      "first_name": "First",
      "last_name": "User"
    }
  }
]

export const mockFunctions =  {
  loadAccessList: jest.fn(),
  addEditor: jest.fn(),
  removeUser: jest.fn(),
  loadInvitationList: jest.fn(),
  sendInvitation: jest.fn(),
  deleteInvitation: jest.fn()
}


export const localStore = new Vuex.Store({
  modules: {
    "share": {
      namespaced: true,
      state: {
        accessList: [],
        invitations: [],
        channel: defaultChannel,
        recentlySent: null
      },
      getters: getters,
      mutations: {
        ...mutations,
      },
      actions: {
        loadAccessList: (context)=> {
          context.commit('SET_ACCESS_LIST', Users);
          mockFunctions.loadAccessList();
        },
        loadInvitationList: (context)=> {
          context.commit('SET_INVITATIONS', Invitations);
          mockFunctions.loadInvitationList();
        },
        addEditor: mockFunctions.addEditor,
        removeUser: mockFunctions.removeUser,
        sendInvitation: mockFunctions.sendInvitation,
        deleteInvitation: mockFunctions.deleteInvitation
      }
    }
  }
})
