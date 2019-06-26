import Vue from 'vue';

const Vuex = require('vuex');
var mutations = require('edit_channel/uploader/vuex/mutations');
var getters = require('edit_channel/uploader/vuex/getters');

Vue.use(Vuex);

export const DEFAULT_TOPIC = {
  id: Math.random()
    .toString(36)
    .substring(7),
  title: Math.random()
    .toString(36)
    .substring(7),
  kind: 'topic',
};

export const DEFAULT_VIDEO = {
  id: Math.random()
    .toString(36)
    .substring(7),
  title: Math.random()
    .toString(36)
    .substring(7),
  kind: 'video',
};

export const DEFAULT_EXERCISE = {
  id: Math.random()
    .toString(36)
    .substring(7),
  title: Math.random()
    .toString(36)
    .substring(7),
  kind: 'exercise',
};

// const editableFields = [
//   'language',
//   'title',
//   'description',
//   'license',
//   'license_description',
//   'copyright_holder',
//   'author',
//   'role_visibility',
//   'aggregator',
//   'provider',
// ];

// const extraFields = ['mastery_model', 'm', 'n', 'randomize'];

export const mockFunctions = {
  saveNodes: jest.fn(),
  removeNode: jest.fn(),
  copyNodes: jest.fn(),
  loadNodes: jest.fn(),
};

export const localStore = new Vuex.Store({
  modules: {
    edit_modal: {
      namespaced: true,
      state: {
        nodes: [],
        selectedIndices: [],
        isClipboard: false,
        changes: {},
        targetNode: { id: 'root-node', title: 'Root Node' },
        mode: 'VIEW_ONLY',
      },
      getters: getters,
      mutations: mutations,
      actions: {
        loadNodes: mockFunctions.loadNodes,
        saveNodes: mockFunctions.saveNodes,
        removeNode: mockFunctions.removeNode,
        copyNodes: mockFunctions.copyNodes,
      },
    },
  },
});
